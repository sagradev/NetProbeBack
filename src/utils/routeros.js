'use strict';

const net = require('net');
const crypto = require('crypto');

class RouterOSAPI {
  constructor({ host, port = 8728, timeout = 5000 }) {
    this.host = host;
    this.port = port;
    this.timeout = timeout;
    this.socket = null;
    this._buf = Buffer.alloc(0);
    this._currentWords = [];
    this._sentences = [];
    this._waiters = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      const socket = net.createConnection({ host: this.host, port: this.port });
      socket.setTimeout(this.timeout);
      socket.once('connect', () => { this.socket = socket; resolve(); });
      socket.once('error', reject);
      socket.once('timeout', () => { socket.destroy(); reject(new Error('timed out')); });
      socket.on('data', (chunk) => {
        this._buf = Buffer.concat([this._buf, chunk]);
        this._parse();
      });
      socket.on('error', (err) => {
        this._waiters.forEach(w => w.reject(err));
        this._waiters = [];
      });
      socket.on('close', () => {
        const err = new Error('connection closed');
        this._waiters.forEach(w => w.reject(err));
        this._waiters = [];
      });
    });
  }

  _parse() {
    while (this._buf.length > 0) {
      const { len, advance } = this._readLen();
      if (len === null) break;
      if (this._buf.length < advance + len) break;

      const word = this._buf.slice(advance, advance + len).toString('utf8');
      this._buf = this._buf.slice(advance + len);

      if (len === 0) {
        const sentence = this._currentWords;
        this._currentWords = [];
        if (this._waiters.length > 0) {
          this._waiters.shift().resolve(sentence);
        } else {
          this._sentences.push(sentence);
        }
      } else {
        this._currentWords.push(word);
      }
    }
  }

  _readLen() {
    if (this._buf.length === 0) return { len: null, advance: 0 };
    const b = this._buf[0];
    if (b < 0x80) return { len: b, advance: 1 };
    if (b < 0xC0) {
      if (this._buf.length < 2) return { len: null, advance: 0 };
      return { len: ((b & 0x3F) << 8) | this._buf[1], advance: 2 };
    }
    if (b < 0xE0) {
      if (this._buf.length < 3) return { len: null, advance: 0 };
      return { len: ((b & 0x1F) << 16) | (this._buf[1] << 8) | this._buf[2], advance: 3 };
    }
    if (b < 0xF0) {
      if (this._buf.length < 4) return { len: null, advance: 0 };
      return { len: ((b & 0x0F) << 24) | (this._buf[1] << 16) | (this._buf[2] << 8) | this._buf[3], advance: 4 };
    }
    if (this._buf.length < 5) return { len: null, advance: 0 };
    return { len: (this._buf[1] << 24) | (this._buf[2] << 16) | (this._buf[3] << 8) | this._buf[4], advance: 5 };
  }

  _encodeLen(len) {
    if (len < 0x80) return Buffer.from([len]);
    if (len < 0x4000) return Buffer.from([(len >> 8) | 0x80, len & 0xFF]);
    if (len < 0x200000) return Buffer.from([(len >> 16) | 0xC0, (len >> 8) & 0xFF, len & 0xFF]);
    if (len < 0x10000000) return Buffer.from([(len >> 24) | 0xE0, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF]);
    return Buffer.from([0xF0, (len >> 24) & 0xFF, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF]);
  }

  _send(words) {
    const parts = [];
    for (const word of words) {
      const buf = Buffer.from(word, 'utf8');
      parts.push(this._encodeLen(buf.length));
      parts.push(buf);
    }
    parts.push(Buffer.from([0]));
    this.socket.write(Buffer.concat(parts));
  }

  _readSentence() {
    if (this._sentences.length > 0) return Promise.resolve(this._sentences.shift());
    return new Promise((resolve, reject) => {
      this._waiters.push({ resolve, reject });
    });
  }

  async login(username, password) {
    this._send(['/login']);
    const response = await this._readSentence();
    const challengeWord = response.find(w => w.startsWith('=ret='));

    if (challengeWord) {
      const challenge = challengeWord.substring(5);
      const md5 = crypto.createHash('md5');
      md5.update(Buffer.from([0]));
      md5.update(Buffer.from(password, 'utf8'));
      md5.update(Buffer.from(challenge, 'hex'));
      const hash = md5.digest('hex');
      this._send(['/login', `=name=${username}`, `=response=00${hash}`]);
    } else {
      this._send(['/login', `=name=${username}`, `=password=${password}`]);
    }

    const loginResp = await this._readSentence();
    if (loginResp[0] !== '!done') {
      const trapMsg = loginResp.find(w => w.startsWith('=message='));
      throw new Error(trapMsg ? trapMsg.substring(9) : 'cannot log in');
    }
  }

  async execute(commandStr) {
    const parts = commandStr.trim().split(/\s+/);
    const words = parts.map(p => {
      if (!p.startsWith('/') && !p.startsWith('=') && !p.startsWith('?') && p.includes('=')) {
        return '=' + p;
      }
      return p;
    });

    this._send(words);
    const results = [];

    while (true) {
      const sentence = await this._readSentence();
      const type = sentence[0];
      if (type === '!done') break;
      if (type === '!trap' || type === '!fatal') {
        const msg = sentence.find(w => w.startsWith('=message='));
        throw new Error(msg ? msg.substring(9) : sentence.join(', '));
      }
      if (type === '!re') {
        const obj = {};
        for (const word of sentence.slice(1)) {
          if (word.startsWith('=')) {
            const idx = word.indexOf('=', 1);
            if (idx > 0) obj[word.substring(1, idx)] = word.substring(idx + 1);
          }
        }
        results.push(obj);
      }
    }
    return results;
  }

  setTimeout(ms) {
    if (this.socket) this.socket.setTimeout(ms);
    this.timeout = ms;
  }

  close() {
    if (this.socket) {
      this.socket.destroy();
      this.socket = null;
    }
  }
}

module.exports = RouterOSAPI;
