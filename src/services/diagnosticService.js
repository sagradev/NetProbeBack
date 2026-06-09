'use strict';

const apiService = require('./apiService');

const TIMEOUT = parseInt(process.env.MIKROTIK_CONNECTION_TIMEOUT || '5000', 10);

async function ping(req) {
  const connReq = { ip: req.ip, username: req.username, password: req.password, port: req.port };
  const api = await apiService.connect(connReq, TIMEOUT);
  try {
    const count = req.count > 0 ? req.count : 4;
    const results = await api.execute(`/tool/ping address=${req.target} count=${count}`);
    return parsePing(results);
  } finally { api.close(); }
}

async function traceroute(req) {
  const connReq = { ip: req.ip, username: req.username, password: req.password, port: req.port };
  const api = await apiService.connect(connReq, TIMEOUT);
  try {
    const results = await api.execute(`/tool/traceroute address=${req.target} count=1`);
    return parseTraceroute(results);
  } finally { api.close(); }
}

async function bandwidthTest(req) {
  const connReq = { ip: req.ip, username: req.username, password: req.password, port: req.port };
  const duration = req.duration > 0 ? req.duration : 10;
  const api = await apiService.connect(connReq, (duration + 15) * 1000);
  try {
    const results = await api.execute(
      `/tool/bandwidth-test address=${req.target} direction=${req.direction} duration=${duration}`
    );
    return parseBandwidth(results);
  } finally { api.close(); }
}

function parsePing(results) {
  const lines = [];
  let sent = 0, received = 0, avgRtt = 'N/A';
  for (const r of results) {
    if (r.sent != null) {
      sent = parseInt(r.sent) || 0;
      received = parseInt(r.received) || 0;
      avgRtt = r['avg-rtt'] || 'N/A';
      const loss = sent > 0 ? Math.round((sent - received) * 100 / sent) : 0;
      lines.push(`--- Enviados: ${sent}  Recebidos: ${received}  Perdidos: ${loss}%  RTT médio: ${avgRtt}`);
    } else if (r.seq != null) {
      lines.push(`seq=${r.seq || '?'}  host=${r.host || r.address || '?'}  time=${r.time || '?'}  (${r.status || '?'})`);
    }
  }
  const loss = sent > 0 ? Math.round((sent - received) * 100 / sent) : 0;
  return { lines, sent, received, loss, avgRtt };
}

function parseTraceroute(results) {
  const hops = [];
  for (const r of results) {
    if (r.hop != null) {
      hops.push({ hop: parseInt(r.hop) || 0, address: r.address || '***', time: r.time || '***', status: r.status || '' });
    }
  }
  return { hops };
}

function parseBandwidth(results) {
  if (!results.length) return { txCurrent: '0 bps', rxCurrent: '0 bps', lostPackets: '0', duration: '0' };
  const last = results[results.length - 1];
  return {
    txCurrent: formatBps(last['tx-current'] || '0'),
    rxCurrent: formatBps(last['rx-current'] || '0'),
    lostPackets: last['lost-packets'] || '0',
    duration: last.duration || '0',
  };
}

function formatBps(raw) {
  const bps = parseInt(String(raw).replace(/[^0-9]/g, ''), 10) || 0;
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  if (bps >= 1_000) return `${(bps / 1_000).toFixed(2)} Kbps`;
  return `${bps} bps`;
}

module.exports = { ping, traceroute, bandwidthTest };
