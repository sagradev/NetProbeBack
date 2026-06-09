'use strict';

const RouterOSAPI = require('../utils/routeros');
const { mapException } = require('../utils/errors');

const LOG_LIMIT = 50;
const DEFAULT_PORT = 8728;

async function connect(req, timeout) {
  const port = (req.port && req.port > 0) ? req.port : DEFAULT_PORT;
  const api = new RouterOSAPI({ host: req.ip, port, timeout });
  try {
    await api.connect();
    await api.login(req.username, req.password);
    return api;
  } catch (err) {
    api.close();
    throw mapException(err);
  }
}

function str(o, k) { const v = o[k]; return v != null ? String(v) : ''; }
function num(o, k) { const raw = str(o, k).replace(/[^0-9]/g, ''); return raw ? parseInt(raw, 10) : 0; }
function bool(o, k) { return o[k] === 'true'; }

function detectType(r) {
  for (const t of ['ospf', 'bgp', 'rip', 'static', 'connected', 'dynamic']) {
    if (bool(r, t)) return t;
  }
  return 'unknown';
}

const toMB = (bytes) => Math.round(bytes / (1024 * 1024));

function buildResources(r, ident) {
  return {
    routerOsVersion: str(r, 'version'), uptime: str(r, 'uptime'), cpuLoad: num(r, 'cpu-load'),
    totalMemory: toMB(num(r, 'total-memory')), freeMemory: toMB(num(r, 'free-memory')),
    totalDisk: toMB(num(r, 'total-hdd-space')), freeDisk: toMB(num(r, 'free-hdd-space')),
    identity: str(ident, 'name'), platform: str(r, 'platform'), boardName: str(r, 'board-name'),
  };
}

const buildInterface = r => ({
  name: str(r, 'name'), type: str(r, 'type'), running: bool(r, 'running'),
  macAddress: str(r, 'mac-address'), mtu: num(r, 'mtu'),
  rxByte: num(r, 'rx-byte'), txByte: num(r, 'tx-byte'),
  rxError: num(r, 'rx-error'), txError: num(r, 'tx-error'), disabled: bool(r, 'disabled'),
});

const buildRoute = r => ({
  dstAddress: str(r, 'dst-address'), gateway: str(r, 'gateway'),
  interface: str(r, 'interface'), active: bool(r, 'active'),
  distance: num(r, 'distance'), routeType: detectType(r),
});

const buildArp = r => ({
  address: str(r, 'address'), macAddress: str(r, 'mac-address'),
  interface: str(r, 'interface'),
  status: bool(r, 'complete') ? 'complete' : bool(r, 'invalid') ? 'invalid' : 'incomplete',
});

const buildDhcp = r => ({
  address: str(r, 'address'), macAddress: str(r, 'mac-address'),
  hostName: str(r, 'host-name'), status: str(r, 'status'), expiresAfter: str(r, 'expires-after'),
});

const buildLog = r => ({ time: str(r, 'time'), topics: str(r, 'topics'), message: str(r, 'message') });

async function getFullData(req, timeout) {
  const api = await connect(req, timeout);
  try {
    const res = await api.execute('/system/resource/print');
    const ident = await api.execute('/system/identity/print');
    const ifaces = await api.execute('/interface/print');
    const routes = await api.execute('/ip/route/print');
    const arp = await api.execute('/ip/arp/print');
    const dhcp = await api.execute('/ip/dhcp-server/lease/print');
    const allLogs = await api.execute('/log/print');
    const logs = allLogs.length > LOG_LIMIT ? allLogs.slice(-LOG_LIMIT) : allLogs;
    return {
      systemResource: buildResources(res[0] || {}, ident[0] || {}),
      interfaces: ifaces.map(buildInterface),
      routes: routes.map(buildRoute),
      arpEntries: arp.map(buildArp),
      dhcpLeases: dhcp.map(buildDhcp),
      logs: logs.map(buildLog),
    };
  } finally {
    api.close();
  }
}

async function getResources(req, timeout) {
  const api = await connect(req, timeout);
  try {
    const res = await api.execute('/system/resource/print');
    const ident = await api.execute('/system/identity/print');
    return buildResources(res[0] || {}, ident[0] || {});
  } finally { api.close(); }
}

async function getInterfaces(req, timeout) {
  const api = await connect(req, timeout);
  try { return (await api.execute('/interface/print')).map(buildInterface); }
  finally { api.close(); }
}

async function getRoutes(req, timeout) {
  const api = await connect(req, timeout);
  try { return (await api.execute('/ip/route/print')).map(buildRoute); }
  finally { api.close(); }
}

async function getArp(req, timeout) {
  const api = await connect(req, timeout);
  try { return (await api.execute('/ip/arp/print')).map(buildArp); }
  finally { api.close(); }
}

async function getDhcp(req, timeout) {
  const api = await connect(req, timeout);
  try { return (await api.execute('/ip/dhcp-server/lease/print')).map(buildDhcp); }
  finally { api.close(); }
}

async function getLogs(req, timeout) {
  const api = await connect(req, timeout);
  try {
    const all = await api.execute('/log/print');
    return (all.length > LOG_LIMIT ? all.slice(-LOG_LIMIT) : all).map(buildLog);
  } finally { api.close(); }
}

module.exports = { connect, getFullData, getResources, getInterfaces, getRoutes, getArp, getDhcp, getLogs };
