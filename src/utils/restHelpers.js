'use strict';

const axios = require('axios');
const { MikrotikConnectionError, mapException } = require('./errors');

const TIMEOUT = parseInt(process.env.MIKROTIK_CONNECTION_TIMEOUT || '5000', 10);

function buildClient(req, timeout) {
  return axios.create({
    baseURL: `http://${req.ip}:${req.port}/rest`,
    auth: { username: req.username, password: req.password },
    timeout: timeout || TIMEOUT,
  });
}

function str(o, k) { const v = o[k]; return v != null ? String(v) : ''; }
function num(o, k) { const raw = str(o, k).replace(/[^0-9]/g, ''); return raw ? parseInt(raw, 10) : 0; }
function bool(o, k) { return o[k] === true || o[k] === 'true'; }

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

async function post(client, path, data) {
  try {
    const res = await client.post(path, data);
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) throw new MikrotikConnectionError('Autenticação falhou', 'AUTH_ERROR');
    if (err.response) throw new MikrotikConnectionError(`REST API retornou HTTP ${err.response.status}`, 'CONNECTION_ERROR');
    throw mapException(err);
  }
}

async function patch(client, path, data) {
  try {
    const res = await client.patch(path, data);
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) throw new MikrotikConnectionError('Autenticação falhou', 'AUTH_ERROR');
    if (err.response) throw new MikrotikConnectionError(`REST API retornou HTTP ${err.response.status}`, 'CONNECTION_ERROR');
    throw mapException(err);
  }
}

async function del(client, path) {
  try {
    const res = await client.delete(path);
    return res.data;
  } catch (err) {
    if (err.response?.status === 401) throw new MikrotikConnectionError('Autenticação falhou', 'AUTH_ERROR');
    if (err.response) throw new MikrotikConnectionError(`REST API retornou HTTP ${err.response.status}`, 'CONNECTION_ERROR');
    throw mapException(err);
  }
}

module.exports = { buildClient, str, num, bool, get, post, patch, del };
