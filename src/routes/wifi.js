'use strict';

const { Router } = require('express');
const svc = require('../services/wifiService');

const router = Router();

router.post('/interfaces',               async (req, res, next) => { try { res.json(await svc.getWifiInterfaces(req.body));      } catch (e) { next(e); } });
router.post('/interfaces/update',        async (req, res, next) => { try { res.json(await svc.updateWifiInterface(req.body));    } catch (e) { next(e); } });
router.post('/security-profiles',        async (req, res, next) => { try { res.json(await svc.getSecurityProfiles(req.body));    } catch (e) { next(e); } });
router.post('/security-profiles/update', async (req, res, next) => { try { res.json(await svc.updateSecurityProfile(req.body)); } catch (e) { next(e); } });

module.exports = router;
