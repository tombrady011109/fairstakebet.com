const express = require('express');
const router = express.Router();
const { 
  handleCrashHistory, 
  handleMybets, 
  handleCrashGamePlayers, 
  handleBetDetails,
  resetCrashDB,
  handleScriptAddOrUpdate,
  handleScriptDelete,
  handleScriptList,
  verify
} = require('../../controllers/games/crash');

// Game history routes
router.get('/history', handleCrashHistory);
router.post('/mybets', handleMybets);
router.get('/players/:gameID', handleCrashGamePlayers);
router.get('/bet/:betID', handleBetDetails);

// Script management routes
router.post('/script/add', handleScriptAddOrUpdate);
router.post('/script/delete', handleScriptDelete);
router.post('/script/list', handleScriptList);

// Admin routes
router.post('/reset', resetCrashDB);

// Verification routes
router.post('/verify', verify);

module.exports = router;