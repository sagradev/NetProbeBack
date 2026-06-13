'use strict';

const { Router } = require('express');
const svc = require('../services/dhcpStaticService');

const router = Router();

router.post('/list',   async (req, res, next) => { try { res.json(await svc.listStaticLeases(req.body)); } catch (e) { next(e); } });
router.post('/add',    async (req, res, next) => { try { res.json(await svc.addStaticLease(req.body));   } catch (e) { next(e); } });
router.post('/remove', async (req, res, next) => { try { res.json(await svc.removeStaticLease(req.body)); } catch (e) { next(e); } });

module.exports = router;
