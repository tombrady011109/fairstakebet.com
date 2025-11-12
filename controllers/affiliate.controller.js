const User = require('../models/user.model');
const Commission = require('../models/commission.model');
const Campaign = require('../models/campaign.model');
const crypto = require('crypto');

// Get user's referrals
const getUserReferrals = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find users who were referred by this user
    const referrals = await User.find({ referredBy: userId })
      .select('username email createdAt is_verified')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      referralCount: referrals.length,
      referrals
    });
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's commission data
const getUserCommission = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all commissions for this user
    const commissions = await Commission.find({ userId })
      .populate('referredUserId', 'username')
      .sort({ createdAt: -1 });
    
    // Calculate total earned
    const totalEarned = commissions.reduce((total, commission) => {
      return total + commission.amount;
    }, 0);
    
    // Calculate available to withdraw (only pending commissions)
    const availableToWithdraw = commissions
      .filter(commission => commission.status === 'pending')
      .reduce((total, commission) => {
        return total + commission.amount;
      }, 0);
    
    // Get user's commission rate
    const user = await User.findById(userId);
    const commissionRate = user.commissionRate || 10; // Default to 10% if not set
    
    res.status(200).json({
      totalEarned,
      availableToWithdraw,
      commissionRate,
      commissions
    });
  } catch (error) {
    console.error('Get commission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Withdraw commission
const withdrawCommission = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get all pending commissions
    const pendingCommissions = await Commission.find({ 
      userId, 
      status: 'pending' 
    });
    
    // Calculate total amount to withdraw
    const withdrawAmount = pendingCommissions.reduce((total, commission) => {
      return total + commission.amount;
    }, 0);
    
    // Check if minimum withdrawal amount is met
    if (withdrawAmount < 10) {
      return res.status(400).json({ 
        message: 'Minimum withdrawal amount is $10.00' 
      });
    }
    
    // Update all pending commissions to paid
    await Commission.updateMany(
      { userId, status: 'pending' },
      { status: 'paid' }
    );
    
    // Update user's balance
    const user = await User.findById(userId);
    user.balance += withdrawAmount;
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Commission withdrawn successfully',
      amount: withdrawAmount
    });
  } catch (error) {
    console.error('Withdraw commission error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get user's campaigns
const getUserCampaigns = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all campaigns created by this user
    const campaigns = await Campaign.find({ userId })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      campaigns
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Create a new campaign
const createCampaign = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Campaign name is required' });
    }
    
    // Generate a unique campaign code
    const code = generateCampaignCode(name);
    
    // Create new campaign
    const campaign = new Campaign({
      userId,
      name,
      description,
      code
    });
    
    await campaign.save();
    
    res.status(201).json({
      success: true,
      campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Delete a campaign
const deleteCampaign = async (req, res) => {
  try {
    const userId = req.user.id;
    const { campaignId } = req.params;
    
    // Find the campaign
    const campaign = await Campaign.findOne({ _id: campaignId, userId });
    
    if (!campaign) {
      return res.status(404).json({ message: 'Campaign not found' });
    }
    
    // Delete the campaign
    await Campaign.deleteOne({ _id: campaignId });
    
    res.status(200).json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Helper function to generate a unique campaign code
const generateCampaignCode = (name) => {
  // Create a base from the name (first 3 chars) + random string
  const nameBase = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 3).toUpperCase();
  const randomString = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${nameBase}-${randomString}`;
};

/**
 * Calculate and record affiliate commission when a user places a bet
 * @param {string} gameName - The name of the game being played
 * @param {string} playerId - The ID of the player placing the bet
 * @param {number} wager - The amount wagered by the player
 * @param {number} houseEdge - The house edge for this game (as a decimal, e.g., 0.02 for 2%)
 * @returns {Promise<void>}
 */
const calculateCommission = async (gameName, playerId, wager, houseEdge = 0.02) => {
  try {
    // Find the player to check if they were referred by someone
    const player = await User.findById(playerId);
    
    // If player wasn't referred, there's no commission to calculate
    if (!player || !player.referredBy) {
      return;
    }
    
    // Get the referrer (affiliate)
    const referrerId = player.referredBy;
    const referrer = await User.findById(referrerId);
    
    if (!referrer) {
      console.error(`Referrer with ID ${referrerId} not found`);
      return;
    }
    
    // Get the referrer's commission rate (default to 10% if not set)
    const commissionRate = referrer.commissionRate || 10;
    
    // Calculate commission amount using the formula: (houseEdge * wager / 2) * (commissionRate / 100)
    // This gives the affiliate a percentage of the expected house profit
    const commissionAmount = (houseEdge * wager / 2) * (commissionRate / 100);
    
    // Only create commission records for meaningful amounts
    if (commissionAmount < 0.01) {
      return;
    }
    
    // Create a new commission record
    const commission = new Commission({
      userId: referrerId,
      referredUserId: playerId,
      amount: commissionAmount,
      game: gameName,
      wager: wager,
      status: 'pending'
    });
    
    await commission.save();
    
    // If the player was referred through a campaign, update the campaign stats
    if (player.referralCampaign) {
      await Campaign.findOneAndUpdate(
        { code: player.referralCampaign, userId: referrerId },
        { $inc: { totalCommission: commissionAmount } }
      );
    }
    
    console.log(`Commission of $${commissionAmount.toFixed(2)} recorded for referrer ${referrerId} from player ${playerId}'s wager of $${wager.toFixed(2)} on ${gameName}`);
    
  } catch (error) {
    console.error('Error calculating commission:', error);
  }
};

module.exports = {
  getUserReferrals,
  getUserCommission,
  withdrawCommission,
  getUserCampaigns,
  createCampaign,
  deleteCampaign,
  calculateCommission
};