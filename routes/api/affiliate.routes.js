const express = require('express');
const router = express.Router();
const affiliateController = require('../../controllers/affiliate.controller');
const requireAuth = require('../../middleware/authMiddleware');

router.get('/referrals', requireAuth, affiliateController.getUserReferrals);

// Get user's commission data
router.get('/commission', requireAuth, affiliateController.getUserCommission);

// Withdraw commission
router.post('/withdraw-commission', requireAuth, affiliateController.withdrawCommission);

// Get user's campaigns
router.get('/campaigns', requireAuth, affiliateController.getUserCampaigns);

// Create a new campaign
router.post('/campaigns', requireAuth, affiliateController.createCampaign);

// Delete a campaign
router.delete('/campaigns/:campaignId', requireAuth, affiliateController.deleteCampaign);

module.exports = router;