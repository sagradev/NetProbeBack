'use strict';

const { buildClient, str, bool, get, post, del } = require('../utils/restHelpers');

const buildLease = r => ({
  id:         str(r, '.id'),
  address:    str(r, 'address'),
  macAddress: str(r, 'mac-address'),
  hostName:   str(r, 'host-name'),
  comment:    str(r, 'comment'),
  server:     str(r, 'server'),
  disabled:   bool(r, 'disabled'),
});

async function listStaticLeases(req) {
  const client = buildClient(req);
  const data = await get(client, '/ip/dhcp-server/lease');
  return data.filter(r => r.dynamic !== 'true' && r.dynamic !== true).map(buildLease);
}

async function addStaticLease(req) {
  const client = buildClient(req);
  const body = {
    address:      req.address,
    'mac-address': req.macAddress,
    'host-name':  req.hostName  || '',
    comment:      req.comment   || '',
  };
  if (req.server) body.server = req.server;
  const res = await post(client, '/ip/dhcp-server/lease', body);
  return { success: true, id: str(res, '.id') };
}

async function removeStaticLease(req) {
  const client = buildClient(req);
  await del(client, `/ip/dhcp-server/lease/${encodeURIComponent(req.id)}`);
  return { success: true };
}

module.exports = { listStaticLeases, addStaticLease, removeStaticLease };
