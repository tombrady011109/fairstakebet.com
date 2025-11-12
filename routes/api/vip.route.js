const express = require('express');
const router = express.Router();
const vipController = require('../../controllers/vip.controller');
const authMiddleware = require('../../middleware/authMiddleware');

// Get user's VIP progress (requires authentication)
router.get('/progress', authMiddleware, vipController.getUserVipProgress);

// Update user's wager (typically called from bet service)
router.post('/update-wager', authMiddleware, vipController.updateUserWager);

// Get all VIP tiers (public route)
router.get('/tiers', vipController.getAllVipTiers);

module.exports = router;
