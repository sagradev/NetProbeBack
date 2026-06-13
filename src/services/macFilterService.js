'use strict';

const { buildClient, str, bool, get, post, del } = require('../utils/restHelpers');

const buildEntry = r => ({
  id:             str(r, '.id'),
  macAddress:     str(r, 'mac-address'),
  interface:      str(r, 'interface'),
  authentication: bool(r, 'authentication'),
  forwarding:     bool(r, 'forwarding'),
  comment:        str(r, 'comment'),
  disabled:       bool(r, 'disabled'),
});

async function listAccessList(req) {
  const client = buildClient(req);
  const data = await get(client, '/interface/wireless/access-list');
  return data.map(buildEntry);
}

async function addAccessList(req) {
  const client = buildClient(req);
  const body = {
    'mac-address':    req.macAddress,
    interface:        req.interface   || 'all',
    authentication:   'true',
    forwarding:       'true',
    comment:          req.comment     || '',
  };
  const res = await post(client, '/interface/wireless/access-list', body);
  return { success: true, id: str(res, '.id') };
}

async function removeAccessList(req) {
  const client = buildClient(req);
  await del(client, `/interface/wireless/access-list/${encodeURIComponent(req.id)}`);
  return { success: true };
}

module.exports = { listAccessList, addAccessList, removeAccessList };
