'use strict';

const { Router } = require('express');
const svc = require('../services/diagnosticService');

const router = Router();

router.post('/ping',           async (req, res, next) => { try { res.json(await svc.ping(req.body));           } catch (e) { next(e); } });
router.post('/traceroute',     async (req, res, next) => { try { res.json(await svc.traceroute(req.body));     } catch (e) { next(e); } });
router.post('/bandwidth-test', async (req, res, next) => { try { res.json(await svc.bandwidthTest(req.body)); } catch (e) { next(e); } });

module.exports = router;
