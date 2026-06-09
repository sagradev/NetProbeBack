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
  const api = await apiService.connect(apiReq(req), TIMEOUT);
  try {
    const results = await api.execute(`/tool/ping address=${req.target} count=${count}`);
    return parsePing(results, req.target);
  } finally { api.close(); }
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
  const api = await apiService.connect(apiReq(req), TIMEOUT);
  try {
    const results = await api.execute(`/tool/traceroute address=${req.target} count=3`);
    return parseTraceroute(results);
  } finally { api.close(); }
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
