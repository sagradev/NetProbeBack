'use strict';

const { Router } = require('express');
const svc = require('../services/connectionService');

const router = Router();

router.post('/connect',    async (req, res, next) => { try { res.json(await svc.getFullData(req.body));   } catch (e) { next(e); } });
router.post('/resources',  async (req, res, next) => { try { res.json(await svc.getResources(req.body));  } catch (e) { next(e); } });
router.post('/interfaces', async (req, res, next) => { try { res.json(await svc.getInterfaces(req.body)); } catch (e) { next(e); } });
router.post('/routes',     async (req, res, next) => { try { res.json(await svc.getRoutes(req.body));     } catch (e) { next(e); } });
router.post('/arp',        async (req, res, next) => { try { res.json(await svc.getArp(req.body));        } catch (e) { next(e); } });
router.post('/dhcp',       async (req, res, next) => { try { res.json(await svc.getDhcp(req.body));       } catch (e) { next(e); } });
router.post('/logs',       async (req, res, next) => { try { res.json(await svc.getLogs(req.body));       } catch (e) { next(e); } });

module.exports = router;
