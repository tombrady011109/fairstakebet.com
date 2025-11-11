const { VipTier, VipProgress } = require('../models/vip.model');
const User = require('../models/user.model');

// Initialize default VIP tiers if they don't exist
const initializeVipTiers = async () => {
  const count = await VipTier.countDocuments();
  if (count === 0) {
    const defaultTiers = [
      {
        name: 'None',
        color: '#2F4553',
        wagerAmount: 'Below $10k',
        icon: {
          viewBox: "0 0 96 96",
          path: "m48 14.595 8.49 15.75a13.68 13.68 0 0 0 9.66 7.08L84 40.635l-12.39 12.9a13.9 13.9 0 0 0-3.9 9.63q-.069.96 0 1.92l2.46 17.76-15.66-7.56a15 15 0 0 0-6.51-1.53 15 15 0 0 0-6.6 1.5l-15.57 7.53 2.46-17.76q.051-.93 0-1.86a13.9 13.9 0 0 0-3.9-9.63L12 40.635l17.64-3.21a13.62 13.62 0 0 0 9.84-7.02zm0-12.54a5.22 5.22 0 0 0-4.59 2.73l-11.4 21.45a5.4 5.4 0 0 1-3.66 2.67l-24 4.32A5.25 5.25 0 0 0 0 38.385a5.13 5.13 0 0 0 1.44 3.6l16.83 17.55a5.16 5.16 0 0 1 1.47 3.6q.024.435 0 .87l-3.27 24a3 3 0 0 0 0 .72 5.19 5.19 0 0 0 5.19 5.22h.18a5.1 5.1 0 0 0 2.16-.6l21.39-10.32a6.4 6.4 0 0 1 2.76-.63 6.2 6.2 0 0 1 2.79.66l21 10.32c.69.377 1.464.573 2.25.57h.21a5.22 5.22 0 0 0 5.19-5.19q.024-.375 0-.75l-3.27-24q-.025-.375 0-.75a5 5 0 0 1 1.47-3.57l16.77-17.7a5.19 5.19 0 0 0-2.82-8.7l-24-4.32a5.22 5.22 0 0 1-3.69-2.76l-11.4-21.45a5.22 5.22 0 0 0-4.65-2.7"
        },
        features: ['Level Up bonuses'],
        requiredWager: 0,
        level: 0
      },
      {
        name: 'Bronze',
        color: '#C69C6D',
        wagerAmount: '$10k',
        icon: {
          viewBox: "0 0 96 96",
          path: "m48 14.595 8.49 15.75a13.68 13.68 0 0 0 9.66 7.08L84 40.635l-12.39 12.9a13.9 13.9 0 0 0-3.9 9.63q-.069.96 0 1.92l2.46 17.76-15.66-7.56a15 15 0 0 0-6.51-1.53a15 15 0 0 0-6.6 1.5l-15.57 7.53 2.46-17.76q.051-.93 0-1.86a13.9 13.9 0 0 0-3.9-9.63L12 40.635l17.64-3.21a13.62 13.62 0 0 0 9.84-7.02zm0-12.54a5.22 5.22 0 0 0-4.59 2.73l-11.4 21.45a5.4 5.4 0 0 1-3.66 2.67l-24 4.32A5.25 5.25 0 0 0 0 38.385a5.13 5.13 0 0 0 1.44 3.6l16.83 17.55a5.16 5.16 0 0 1 1.47 3.6q.024.435 0 .87l-3.27 24a3 3 0 0 0 0 .72 5.19 5.19 0 0 0 5.19 5.22h.18a5.1 5.1 0 0 0 2.16-.6l21.39-10.32a6.4 6.4 0 0 1 2.76-.63a6.2 6.2 0 0 1 2.79.66l21 10.32c.69.377 1.464.573 2.25.57h.21a5.22 5.22 0 0 0 5.19-5.19q.024-.375 0-.75l-3.27-24q-.025-.375 0-.75a5 5 0 0 1 1.47-3.57l16.77-17.7a5.19 5.19 0 0 0-2.82-8.7l-24-4.32a5.22 5.22 0 0 1-3.69-2.76l-11.4-21.45a5.22 5.22 0 0 0-4.65-2.7"
        },
        features: ['Level Up bonuses', 'Rakeback', 'Weekly bonuses'],
        requiredWager: 10000,
        level: 10
      },
      {
        name: 'Silver',
        color: '#B2CCCC',
        wagerAmount: '$50k',
        icon: {
          viewBox: "0 0 96 96",
          path: "m48 14.595 8.49 15.75a13.68 13.68 0 0 0 9.66 7.08L84 40.635l-12.39 12.9a13.9 13.9 0 0 0-3.9 9.63q-.069.96 0 1.92l2.46 17.76-15.66-7.56a15 15 0 0 0-6.51-1.53a15 15 0 0 0-6.6 1.5l-15.57 7.53 2.46-17.76q.051-.93 0-1.86a13.9 13.9 0 0 0-3.9-9.63L12 40.635l17.64-3.21a13.62 13.62 0 0 0 9.84-7.02zm0-12.54a5.22 5.22 0 0 0-4.59 2.73l-11.4 21.45a5.4 5.4 0 0 1-3.66 2.67l-24 4.32A5.25 5.25 0 0 0 0 38.385a5.13 5.13 0 0 0 1.44 3.6l16.83 17.55a5.16 5.16 0 0 1 1.47 3.6q.024.435 0 .87l-3.27 24a3 3 0 0 0 0 .72 5.19 5.19 0 0 0 5.19 5.22h.18a5.1 5.1 0 0 0 2.16-.6l21.39-10.32a6.4 6.4 0 0 1 2.76-.63a6.2 6.2 0 0 1 2.79.66l21 10.32c.69.377 1.464.573 2.25.57h.21a5.22 5.22 0 0 0 5.19-5.19q.024-.375 0-.75l-3.27-24q-.025-.375 0-.75a5 5 0 0 1 1.47-3.57l16.77-17.7a5.19 5.19 0 0 0-2.82-8.7l-24-4.32a5.22 5.22 0 0 1-3.69-2.76l-11.4-21.45a5.22 5.22 0 0 0-4.65-2.7"
        },
        features: ['Level Up bonuses', 'Rakeback', 'Weekly bonuses', 'Monthly bonuses'],
        requiredWager: 50000,
        level: 25
      },
      {
        name: 'Gold',
        color: '#FFD700',
        wagerAmount: '$250k',
        icon: {
          viewBox: "0 0 96 96",
          path: "m48 14.595 8.49 15.75a13.68 13.68 0 0 0 9.66 7.08L84 40.635l-12.39 12.9a13.9 13.9 0 0 0-3.9 9.63q-.069.96 0 1.92l2.46 17.76-15.66-7.56a15 15 0 0 0-6.51-1.53a15 15 0 0 0-6.6 1.5l-15.57 7.53 2.46-17.76q.051-.93 0-1.86a13.9 13.9 0 0 0-3.9-9.63L12 40.635l17.64-3.21a13.62 13.62 0 0 0 9.84-7.02zm0-12.54a5.22 5.22 0 0 0-4.59 2.73l-11.4 21.45a5.4 5.4 0 0 1-3.66 2.67l-24 4.32A5.25 5.25 0 0 0 0 38.385a5.13 5.13 0 0 0 1.44 3.6l16.83 17.55a5.16 5.16 0 0 1 1.47 3.6q.024.435 0 .87l-3.27 24a3 3 0 0 0 0 .72 5.19 5.19 0 0 0 5.19 5.22h.18a5.1 5.1 0 0 0 2.16-.6l21.39-10.32a6.4 6.4 0 0 1 2.76-.63a6.2 6.2 0 0 1 2.79.66l21 10.32c.69.377 1.464.573 2.25.57h.21a5.22 5.22 0 0 0 5.19-5.19q.024-.375 0-.75l-3.27-24q-.025-.375 0-.75a5 5 0 0 1 1.47-3.57l16.77-17.7a5.19 5.19 0 0 0-2.82-8.7l-24-4.32a5.22 5.22 0 0 1-3.69-2.76l-11.4-21.45a5.22 5.22 0 0 0-4.65-2.7"
        },
        features: ['All previous benefits', 'Priority withdrawals', 'Dedicated host'],
        requiredWager: 250000,
        level: 50
      },
      {
        name: 'Platinum',
        color: '#E5E4E2',
        wagerAmount: '$1M',
        icon: {
          viewBox: "0 0 96 96",
          path: "m48 14.595 8.49 15.75a13.68 13.68 0 0 0 9.66 7.08L84 40.635l-12.39 12.9a13.9 13.9 0 0 0-3.9 9.63q-.069.96 0 1.92l2.46 17.76-15.66-7.56a15 15 0 0 0-6.51-1.53a15 15 0 0 0-6.6 1.5l-15.57 7.53 2.46-17.76q.051-.93 0-1.86a13.9 13.9 0 0 0-3.9-9.63L12 40.635l17.64-3.21a13.62 13.62 0 0 0 9.84-7.02zm0-12.54a5.22 5.22 0 0 0-4.59 2.73l-11.4 21.45a5.4 5.4 0 0 1-3.66 2.67l-24 4.32A5.25 5.25 0 0 0 0 38.385a5.13 5.13 0 0 0 1.44 3.6l16.83 17.55a5.16 5.16 0 0 1 1.47 3.6q.024.435 0 .87l-3.27 24a3 3 0 0 0 0 .72 5.19 5.19 0 0 0 5.19 5.22h.18a5.1 5.1 0 0 0 2.16-.6l21.39-10.32a6.4 6.4 0 0 1 2.76-.63a6.2 6.2 0 0 1 2.79.66l21 10.32c.69.377 1.464.573 2.25.57h.21a5.22 5.22 0 0 0 5.19-5.19q.024-.375 0-.75l-3.27-24q-.025-.375 0-.75a5 5 0 0 1 1.47-3.57l16.77-17.7a5.19 5.19 0 0 0-2.82-8.7l-24-4.32a5.22 5.22 0 0 1-3.69-2.76l-11.4-21.45a5.22 5.22 0 0 0-4.65-2.7"
        },
        features: ['All previous benefits', 'Exclusive events', 'Custom promotions'],
        requiredWager: 1000000,
        level: 100
      }
    ];
    
    await VipTier.insertMany(defaultTiers);
    // console.log('Default VIP tiers initialized');
  }
};

// Get user VIP progress
exports.getUserVipProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find or create user's VIP progress
    let vipProgress = await VipProgress.findOne({ userId });
    
    if (!vipProgress) {
      // Get the first two tiers for new users
      const tiers = await VipTier.find().sort({ requiredWager: 1 }).limit(2);
      const currentTier = tiers[0];
      const nextTier = tiers[1];
      
      vipProgress = new VipProgress({
        userId,
        currentTier: currentTier.name,
        nextTier: nextTier.name,
        wagerToNextTier: nextTier.requiredWager
      });
      
      await vipProgress.save();
    }
    
    // Get current and next tier details
    const currentTier = await VipTier.findOne({ name: vipProgress.currentTier });
    const nextTier = await VipTier.findOne({ name: vipProgress.nextTier });
    
    // Calculate progress percentage
    let progressPercentage = 0;
    if (nextTier && currentTier) {
      const wagerRange = nextTier.requiredWager - currentTier.requiredWager;
      const userProgress = vipProgress.currentWager - currentTier.requiredWager;
      progressPercentage = Math.min(100, Math.max(0, (userProgress / wagerRange) * 100));
    }
    
    res.status(200).json({
      success: true,
      data: {
        ...vipProgress.toObject(),
        progress: progressPercentage.toFixed(2),
        currentTierDetails: currentTier,
        nextTierDetails: nextTier
      }
    });
  } catch (error) {
    console.error('Error getting VIP progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP progress',
      error: error.message
    });
  }
};

// Update user's wager amount (called when user places a bet)
exports.updateUserWager = async (req, res) => {
  try {
    const { userId, wagerAmount } = req.body;
    
    // Find user's VIP progress
    let vipProgress = await VipProgress.findOne({ userId });
    
    if (!vipProgress) {
      // Create new progress record if it doesn't exist
      const tiers = await VipTier.find().sort({ requiredWager: 1 }).limit(2);
      vipProgress = new VipProgress({
        userId,
        currentTier: tiers[0].name,
        nextTier: tiers[1].name,
        wagerToNextTier: tiers[1].requiredWager
      });
    }
    
    // Update wager amount
    vipProgress.currentWager += wagerAmount;
    
    // Check if user has reached next tier
    const allTiers = await VipTier.find().sort({ requiredWager: 1 });
    
    let currentTierIndex = allTiers.findIndex(tier => tier.name === vipProgress.currentTier);
    let nextTierIndex = currentTierIndex + 1;
    
    // Check if user has progressed to next tier
    while (nextTierIndex < allTiers.length && 
           vipProgress.currentWager >= allTiers[nextTierIndex].requiredWager) {
      // User has reached next tier
      currentTierIndex = nextTierIndex;
      nextTierIndex++;
      
      // Update user's level in User model
      await User.findByIdAndUpdate(userId, { level: allTiers[currentTierIndex].level });
    }
    
    // Update tier information
    if (currentTierIndex < allTiers.length) {
      vipProgress.currentTier = allTiers[currentTierIndex].name;
    }
    
    if (nextTierIndex < allTiers.length) {
      vipProgress.nextTier = allTiers[nextTierIndex].name;
      vipProgress.wagerToNextTier = allTiers[nextTierIndex].requiredWager;
    } else {
      // User is at max tier
      vipProgress.nextTier = vipProgress.currentTier;
      vipProgress.wagerToNextTier = vipProgress.currentWager;
    }
    
    // Calculate progress percentage
    const currentTier = allTiers[currentTierIndex];
    const nextTier = allTiers[nextTierIndex] || currentTier;
    
    const wagerRange = nextTier.requiredWager - currentTier.requiredWager;
    const userProgress = vipProgress.currentWager - currentTier.requiredWager;
    const progressPercentage = Math.min(100, Math.max(0, (userProgress / wagerRange) * 100));
    
    vipProgress.progress = progressPercentage;
    vipProgress.updatedAt = Date.now();
    
    await vipProgress.save();
    
    res.status(200).json({
      success: true,
      data: vipProgress
    });
  } catch (error) {
    console.error('Error updating wager:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update wager',
      error: error.message
    });
  }
};

// Get all VIP tiers
exports.getAllVipTiers = async (req, res) => {
  try {
    const tiers = await VipTier.find().sort({ requiredWager: 1 });
    
    res.status(200).json({
      success: true,
      data: tiers
    });
  } catch (error) {
    console.error('Error getting VIP tiers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get VIP tiers',
      error: error.message
    });
  }
};

// Initialize VIP tiers when the controller is loaded
initializeVipTiers().catch(console.error);