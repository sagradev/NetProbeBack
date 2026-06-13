'use strict';

const apiService = require('./apiService');
const axios = require('axios');
const { MikrotikConnectionError, mapException } = require('../utils/errors');

const API_PORT   = parseInt(process.env.MIKROTIK_API_PORT   || '8728',  10);
const TIMEOUT    = parseInt(process.env.MIKROTIK_DIAG_TIMEOUT || '30000', 10);

// Sempre usa o RouterOS API (porta 8728) para ferramentas de diagnóstico
function apiReq(req) {
  return { ip: req.ip, port: API_PORT, username: req.username, password: req.password };
}

// ── Ping ─────────────────────────────────────────────────────────────────────

async function ping(req) {
  const count = req.count > 0 ? req.count : 4;
  try {
    console.log(`[ping] tentando RouterOS API em ${req.ip}:${API_PORT}...`);
    const api = await apiService.connect(apiReq(req), TIMEOUT);
    try {
      const results = await api.execute(`/tool/ping address=${req.target} count=${count}`);
      console.log(`[ping] RouterOS API ok`);
      return parsePing(results, req.target);
    } catch (err) {
      throw mapException(err);
    } finally { api.close(); }
  } catch {
    console.log(`[ping] RouterOS API falhou, usando ping do sistema...`);
    return pingSystem(req.target, count);
  }
}

async function pingSystem(target, count) {
  const { exec } = require('child_process');
  const IS_WIN = process.platform === 'win32';
  const cmd = IS_WIN ? `ping -n ${count} ${target}` : `ping -c ${count} ${target}`;

  const output = await new Promise(resolve => {
    exec(cmd, { timeout: 30000 }, (_, stdout, stderr) => resolve(stdout || stderr || ''));
  });

  const lines = output.split(/\r?\n/).filter(l => l.trim());
  let sent = 0, received = 0, avgRtt = 0;

  if (IS_WIN) {
    const stats = output.match(/Enviados\s*=\s*(\d+).*?Recebidos\s*=\s*(\d+)/is)
                || output.match(/Sent\s*=\s*(\d+).*?Received\s*=\s*(\d+)/is);
    if (stats) { sent = parseInt(stats[1]); received = parseInt(stats[2]); }
    const rtt = output.match(/M[eé]dia\s*=\s*(\d+)\s*ms/i) || output.match(/Average\s*=\s*(\d+)\s*ms/i);
    if (rtt) avgRtt = parseInt(rtt[1]);
  } else {
    const stats = output.match(/(\d+) packets transmitted.*?(\d+) received/);
    if (stats) { sent = parseInt(stats[1]); received = parseInt(stats[2]); }
    const rtt = output.match(/rtt.*?=([\d.]+)/);
    if (rtt) avgRtt = parseFloat(rtt[1]);
  }

  const lost = sent - received;
  return { lines, sent, received, lost, avgRtt };
}

function parsePing(results, target) {
  const lines = [];
  let sent = 0, received = 0, totalRtt = 0, rttCount = 0;

  for (const r of results) {
    if (r.seq != null && r.status !== 'timeout') {
      const ms = parseFloat(String(r.time || '0').replace(/[^0-9.]/g, '')) || 0;
      lines.push(`seq=${r.seq}  host=${r.host || target}  time=${r.time || '?'}`);
      received++;
      totalRtt += ms;
      rttCount++;
    } else if (r.seq != null) {
      lines.push(`seq=${r.seq}  timeout`);
    }
    if (r.sent != null) sent = parseInt(r.sent) || sent;
  }

  if (sent === 0) sent = results.filter(r => r.seq != null).length;
  const lost   = sent - received;
  const avgRtt = rttCount > 0 ? Math.round(totalRtt / rttCount) : 0;
  lines.push(`--- Enviados: ${sent}  Recebidos: ${received}  Perdidos: ${lost}  RTT médio: ${avgRtt}ms`);

  return { lines, sent, received, lost, avgRtt };
}

// ── Traceroute ────────────────────────────────────────────────────────────────

async function traceroute(req) {
  try {
    console.log(`[traceroute] tentando RouterOS API em ${req.ip}:${API_PORT}...`);
    const api = await apiService.connect(apiReq(req), TIMEOUT);
    try {
      const results = await api.execute(`/tool/traceroute address=${req.target} count=3`);
      console.log(`[traceroute] RouterOS API ok`);
      return parseTraceroute(results);
    } catch (err) {
      throw mapException(err);
    } finally { api.close(); }
  } catch {
    console.log(`[traceroute] RouterOS API falhou, usando tracert do sistema...`);
    return tracerouteSystem(req.target);
  }
}

async function tracerouteSystem(target) {
  const { exec } = require('child_process');
  const IS_WIN = process.platform === 'win32';
  const cmd = IS_WIN ? `tracert -d -w 1000 ${target}` : `traceroute -n -w 1 ${target}`;

  const output = await new Promise(resolve => {
    exec(cmd, { timeout: 60000 }, (_, stdout, stderr) => resolve(stdout || stderr || ''));
  });

  const hops = [];
  for (const line of output.split(/\r?\n/)) {
    const m = IS_WIN
      ? line.match(/^\s*(\d+)\s+(?:<?\d+\s*ms\s*){1,3}\s*([\d.*]+)\s*$/)
      : line.match(/^\s*(\d+)\s+([\d.*]+)\s/);
    if (m) {
      hops.push({ hopNumber: parseInt(m[1]), address: m[2].trim(), hostname: '', latency: '' });
    }
  }
  return { hops };
}

function parseTraceroute(results) {
  const hops = results
    .filter(r => r.hop != null)
    .map(r => ({
      hopNumber: parseInt(r.hop)  || 0,
      address:   r.address        || '***',
      hostname:  r.host           || '',
      latency:   r.time           || '***',
    }));
  return { hops };
}

// ── Bandwidth Test ────────────────────────────────────────────────────────────

async function bandwidthTest(req) {
  const duration = req.duration > 0 ? req.duration : 10;
  const api = await apiService.connect(apiReq(req), (duration + 15) * 1000);
  try {
    const results = await api.execute(
      `/tool/bandwidth-test address=${req.target} direction=${req.direction} duration=${duration}`
    );
    return parseBandwidth(results, req.direction, duration);
  } finally { api.close(); }
}

function parseBandwidth(results, direction, duration) {
  if (!results.length) return { txMbps: 0, rxMbps: 0, direction, duration };
  const last = results[results.length - 1];
  const toMbps = v => Math.round((parseInt(String(v ?? '0').replace(/[^0-9]/g, ''), 10) / 1_000_000) * 100) / 100;
  return { txMbps: toMbps(last['tx-current']), rxMbps: toMbps(last['rx-current']), direction, duration };
}

module.exports = { ping, traceroute, bandwidthTest };
