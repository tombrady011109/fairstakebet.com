const express = require('express');
const router = express.Router();
const mainRouter = express.Router();
const requireAuth = require('../../../middleware/requireAuth');
const hilo = require('../../../games/hilo.controller');


mainRouter.get('/recent-bets', hilo.recentBets);
mainRouter.get('/details/:betID', hilo.gameDetail);
router.get('/seeds',requireAuth, hilo.gameSeeds);
router.get('/user/bets',requireAuth, hilo.userBets);
router.post('/user/update-seeds',requireAuth, hilo.updateSeeds);

mainRouter.use(router);

module.exports = mainRouter;