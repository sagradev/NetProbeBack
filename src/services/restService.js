'use strict';

const axios = require('axios');
const { MikrotikConnectionError, mapException } = require('../utils/errors');

const LOG_LIMIT = 50;

function buildClient(ip, port, username, password, timeout) {
  return axios.create({ baseURL: `http://${ip}:${port}/rest`, auth: { username, password }, timeout });
}

async function get(client, path) {
  try {
    const res = await client.get(path);
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) throw new MikrotikConnectionError('Autenticação falhou', 'AUTH_ERROR');
    if (err.response) throw new MikrotikConnectionError(`REST API retornou HTTP ${err.response.status}`, 'CONNECTION_ERROR');
    throw mapException(err);
  }
}

function str(o, k) { const v = o[k]; return v != null ? String(v) : ''; }
function num(o, k) { const n = parseInt(String(o[k] ?? '0').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; }
function bool(o, k) { return o[k] === true || o[k] === 'true'; }

function detectType(r) {
  for (const t of ['ospf', 'bgp', 'rip', 'static', 'connected', 'dynamic']) {
    if (bool(r, t)) return t;
  }
  return 'unknown';
}

async function isAvailable(ip, port, username, password, timeout) {
  try {
    await axios.get(`http://${ip}:${port}/rest/system/resource`, {
      auth: { username, password },
      timeout: Math.min(timeout, 3000),
      validateStatus: s => s === 200 || s === 401,
    });
    return true;
  } catch {
    return false;
  }
}

const toMB = (bytes) => Math.round(bytes / (1024 * 1024));

function buildResources(res, ident) {
  return {
    routerOsVersion: str(res, 'version'),
    uptime: str(res, 'uptime'),
    cpuLoad: num(res, 'cpu-load'),
    totalMemory: toMB(num(res, 'total-memory')),
    freeMemory: toMB(num(res, 'free-memory')),
    totalDisk: toMB(num(res, 'total-hdd-space')),
    freeDisk: toMB(num(res, 'free-hdd-space')),
    identity: str(ident, 'name'),
    platform: str(res, 'platform'),
    boardName: str(res, 'board-name'),
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
  const client = buildClient(req.ip, req.port, req.username, req.password, timeout);
  const [res, ident, ifaces, routes, arp, dhcp, allLogs] = await Promise.all([
    get(client, '/system/resource'), get(client, '/system/identity'),
    get(client, '/interface'), get(client, '/ip/route'),
    get(client, '/ip/arp'), get(client, '/ip/dhcp-server/lease'), get(client, '/log'),
  ]);
  const logs = allLogs.length > LOG_LIMIT ? allLogs.slice(-LOG_LIMIT) : allLogs;
  return {
    systemResource: buildResources(res, ident),
    interfaces: ifaces.map(buildInterface),
    routes: routes.map(buildRoute),
    arpEntries: arp.map(buildArp),
    dhcpLeases: dhcp.map(buildDhcp),
    logs: logs.map(buildLog),
  };
}

async function getResources(req, timeout) {
  const client = buildClient(req.ip, req.port, req.username, req.password, timeout);
  const [res, ident] = await Promise.all([get(client, '/system/resource'), get(client, '/system/identity')]);
  return buildResources(res, ident);
}

async function getInterfaces(req, timeout) {
  return (await get(buildClient(req.ip, req.port, req.username, req.password, timeout), '/interface')).map(buildInterface);
}

async function getRoutes(req, timeout) {
  return (await get(buildClient(req.ip, req.port, req.username, req.password, timeout), '/ip/route')).map(buildRoute);
}

async function getArp(req, timeout) {
  return (await get(buildClient(req.ip, req.port, req.username, req.password, timeout), '/ip/arp')).map(buildArp);
}

async function getDhcp(req, timeout) {
  return (await get(buildClient(req.ip, req.port, req.username, req.password, timeout), '/ip/dhcp-server/lease')).map(buildDhcp);
}

async function getLogs(req, timeout) {
  const all = await get(buildClient(req.ip, req.port, req.username, req.password, timeout), '/log');
  return (all.length > LOG_LIMIT ? all.slice(-LOG_LIMIT) : all).map(buildLog);
}

module.exports = { isAvailable, getFullData, getResources, getInterfaces, getRoutes, getArp, getDhcp, getLogs };
