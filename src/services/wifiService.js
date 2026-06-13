'use strict';

const { buildClient, str, bool, get, patch } = require('../utils/restHelpers');

const buildInterface = r => ({
  id:              str(r, '.id'),
  name:            str(r, 'name'),
  ssid:            str(r, 'ssid'),
  band:            str(r, 'band'),
  channel:         str(r, 'channel'),
  disabled:        bool(r, 'disabled'),
  running:         bool(r, 'running'),
  macAddress:      str(r, 'mac-address'),
  securityProfile: str(r, 'security-profile'),
});

const buildProfile = r => ({
  id:               str(r, '.id'),
  name:             str(r, 'name'),
  mode:             str(r, 'mode'),
  authentication:   str(r, 'authentication-types'),
  wpaPreSharedKey:  str(r, 'wpa-pre-shared-key'),
  wpa2PreSharedKey: str(r, 'wpa2-pre-shared-key'),
});

async function getWifiInterfaces(req) {
  const client = buildClient(req);
  const data = await get(client, '/interface/wireless');
  return data.map(buildInterface);
}

async function updateWifiInterface(req) {
  const client = buildClient(req);
  const body = {};
  if (req.ssid !== undefined) body.ssid = req.ssid;
  await patch(client, `/interface/wireless/${encodeURIComponent(req.id)}`, body);
  return { success: true };
}

async function getSecurityProfiles(req) {
  const client = buildClient(req);
  const data = await get(client, '/interface/wireless/security-profiles');
  return data.map(buildProfile);
}

async function updateSecurityProfile(req) {
  const client = buildClient(req);
  const body = {};
  if (req.wpaPreSharedKey  !== undefined) body['wpa-pre-shared-key']  = req.wpaPreSharedKey;
  if (req.wpa2PreSharedKey !== undefined) body['wpa2-pre-shared-key'] = req.wpa2PreSharedKey;
  await patch(client, `/interface/wireless/security-profiles/${encodeURIComponent(req.id)}`, body);
  return { success: true };
}

module.exports = { getWifiInterfaces, updateWifiInterface, getSecurityProfiles, updateSecurityProfile };
