'use strict';

const restService = require('./restService');
const apiService = require('./apiService');

const TIMEOUT = parseInt(process.env.MIKROTIK_CONNECTION_TIMEOUT || '5000', 10);

async function delegate(req, method) {
  const useRest = await restService.isAvailable(req.ip, req.port, req.username, req.password, TIMEOUT);
  return useRest ? restService[method](req, TIMEOUT) : apiService[method](req, TIMEOUT);
}

module.exports = {
  getFullData:   (req) => delegate(req, 'getFullData'),
  getResources:  (req) => delegate(req, 'getResources'),
  getInterfaces: (req) => delegate(req, 'getInterfaces'),
  getRoutes:     (req) => delegate(req, 'getRoutes'),
  getArp:        (req) => delegate(req, 'getArp'),
  getDhcp:       (req) => delegate(req, 'getDhcp'),
  getLogs:       (req) => delegate(req, 'getLogs'),
};
