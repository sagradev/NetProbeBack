'use strict';

const { Router } = require('express');
const svc = require('../services/macFilterService');

const router = Router();

router.post('/list',   async (req, res, next) => { try { res.json(await svc.listAccessList(req.body));   } catch (e) { next(e); } });
router.post('/add',    async (req, res, next) => { try { res.json(await svc.addAccessList(req.body));    } catch (e) { next(e); } });
router.post('/remove', async (req, res, next) => { try { res.json(await svc.removeAccessList(req.body)); } catch (e) { next(e); } });

module.exports = router;
