const express = require('express');
const router = express.Router();
const mainRouter = express.Router();
const requireAuth = require('../../../middleware/authMiddleware');
const controller = require('../../../controllers/games/plinko/plinko.controller.js');


// auth middleware

mainRouter.get('/details/:betID', controller.gameDetail);
router.get('/seeds', requireAuth,  controller.gameSeeds);
router.post('/my-bet',requireAuth, controller.userBets);
router.post('/update-seeds',requireAuth, controller.updateSeeds);

mainRouter.use(router);

module.exports = mainRouter;