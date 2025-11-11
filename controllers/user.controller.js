const User = require('../models/user.model');
const CrashBet = require('../models/games/crash/crashbet');
const PlinkoGame = require('../models/games/plinko/plinko_game');
const HiloGame = require('../models/games/hilo/hilo_game');
const Bot = require('../models/bot.model');
const mongoose = require('mongoose');

const updateUserDetails = async (req, res) => {
    const { firstName, lastName, country, place, dateOfBirth, residentAddress, city, postalCode } = req.body;

    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      user.firstName = firstName;
      user.lastName = lastName;
      user.country = country;
      user.place = place;
      user.dateOfBirth = dateOfBirth;
      user.residentAddress = residentAddress;
      user.city = city;
      user.postalCode = postalCode;

      await user.save();
      res.status(200).json({ message: 'User details updated successfully' });
    } catch (error) {
      console.error('Error updating user details:', error);
      res.status(500).json({ message: 'Server error' });
    }
};

/**
   * Get user statistics by username
   * @route GET /api/users/stats/:username
   * @access Public
   */
const getUserStatistics = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Find user by username
    const user = await User.findOne({ username }).select('username createdAt vipLevel vipPoints');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Get user ID for querying bets
    const userId = user._id.toString();
    
    // Calculate VIP progress
    // Define points needed for each VIP level
    const vipLevelRequirements = {
      0: 0,
      1: 1000,
      2: 5000,
      3: 15000,
      4: 50000,
      5: 150000,
      6: 500000,
      7: 1500000,
      8: 5000000,
      9: 15000000,
      10: 50000000
    };
    
    const currentVipLevel = user.vipLevel || 0;
    const currentVipPoints = user.vipPoints || 0;
    
    // Calculate progress to next level
    let vipProgress = 0;
    if (currentVipLevel < 10) {
      const pointsForCurrentLevel = vipLevelRequirements[currentVipLevel] || 0;
      const pointsForNextLevel = vipLevelRequirements[currentVipLevel + 1] || Infinity;
      const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
      const pointsAchieved = currentVipPoints - pointsForCurrentLevel;
      
      vipProgress = Math.min(100, Math.max(0, Math.floor((pointsAchieved / pointsNeeded) * 100)));
    } else {
      // Max level reached
      vipProgress = 100;
    }
    
    // Get bet statistics from different games
    const [crashStats, plinkoStats, hiloStats] = await Promise.all([
      // Crash game stats
      CrashBet.aggregate([
        { $match: { user_id: userId } },
        { $group: {
            _id: null,
            totalBets: { $sum: 1 },
            totalWins: { $sum: { $cond: [{ $eq: ["$won", true] }, 1, 0] } },
            totalLosses: { $sum: { $cond: [{ $eq: ["$won", false] }, 1, 0] } },
            wagered: { $sum: "$bet" },
            wonAmount: { $sum: { $cond: [{ $eq: ["$won", true] }, { $multiply: ["$bet", "$payout"] }, 0] } },
            lostAmount: { $sum: { $cond: [{ $eq: ["$won", false] }, "$bet", 0] } }
          }
        }
      ]),
      
      // Plinko game stats
      PlinkoGame.aggregate([
        { $match: { user_id: userId } },
        { $group: {
            _id: null,
            totalBets: { $sum: 1 },
            totalWins: { $sum: { $cond: [{ $gt: ["$payout", 1] }, 1, 0] } },
            totalLosses: { $sum: { $cond: [{ $lte: ["$payout", 1] }, 1, 0] } },
            wagered: { $sum: "$bet" },
            wonAmount: { $sum: { $cond: [{ $gt: ["$payout", 1] }, { $multiply: ["$bet", "$payout"] }, 0] } },
            lostAmount: { $sum: { $cond: [{ $lte: ["$payout", 1] }, "$bet", 0] } }
          }
        }
      ]),
      
      // Hilo game stats
      HiloGame.aggregate([
        { $match: { user_id: userId } },
        { $group: {
            _id: null,
            totalBets: { $sum: 1 },
            totalWins: { $sum: { $cond: [{ $eq: ["$won", true] }, 1, 0] } },
            totalLosses: { $sum: { $cond: [{ $eq: ["$won", false] }, 1, 0] } },
            wagered: { $sum: "$bet" },
            wonAmount: { $sum: { $cond: [{ $eq: ["$won", true] }, { $multiply: ["$bet", "$payout"] }, 0] } },
            lostAmount: { $sum: { $cond: [{ $eq: ["$won", false] }, "$bet", 0] } }
          }
        }
      ])
    ]);
    
    // Combine stats from all games
    const crashData = crashStats[0] || { totalBets: 0, totalWins: 0, totalLosses: 0, wagered: 0, wonAmount: 0, lostAmount: 0 };
    const plinkoData = plinkoStats[0] || { totalBets: 0, totalWins: 0, totalLosses: 0, wagered: 0, wonAmount: 0, lostAmount: 0 };
    const hiloData = hiloStats[0] || { totalBets: 0, totalWins: 0, totalLosses: 0, wagered: 0, wonAmount: 0, lostAmount: 0 };
    
    const combinedStats = {
      totalBets: crashData.totalBets + plinkoData.totalBets + hiloData.totalBets,
      totalWins: crashData.totalWins + plinkoData.totalWins + hiloData.totalWins,
      totalLosses: crashData.totalLosses + plinkoData.totalLosses + hiloData.totalLosses,
      wagered: crashData.wagered + plinkoData.wagered + hiloData.wagered,
      wonAmount: crashData.wonAmount + plinkoData.wonAmount + hiloData.wonAmount,
      lostAmount: crashData.lostAmount + plinkoData.lostAmount + hiloData.lostAmount,
      profitLoss: (crashData.wonAmount + plinkoData.wonAmount + hiloData.wonAmount) - 
                  (crashData.lostAmount + plinkoData.lostAmount + hiloData.lostAmount)
    };
    
    // Calculate win rate percentage
    const winRate = combinedStats.totalBets > 0 
      ? (combinedStats.totalWins / combinedStats.totalBets) * 100 
      : 0;
    
    // Format the response
    const response = {
      success: true,
      data: {
        username: user.username,
        joinedDate: user.createdAt,
        vipLevel: user.vipLevel || 0,
        vipProgress: vipProgress,
        vipPoints: user.vipPoints || 0,
        totalBets: combinedStats.totalBets,
        totalWins: combinedStats.totalWins,
        totalLosses: combinedStats.totalLosses,
        winRate: parseFloat(winRate.toFixed(2)),
        wagered: parseFloat(combinedStats.wagered.toFixed(2)),
        profitLoss: parseFloat(combinedStats.profitLoss.toFixed(2)),
        gameBreakdown: {
          crash: {
            bets: crashData.totalBets,
            wins: crashData.totalWins,
            losses: crashData.totalLosses,
            wagered: parseFloat(crashData.wagered.toFixed(2)),
            profitLoss: parseFloat((crashData.wonAmount - crashData.lostAmount).toFixed(2))
          },
          plinko: {
            bets: plinkoData.totalBets,
            wins: plinkoData.totalWins,
            losses: plinkoData.totalLosses,
            wagered: parseFloat(plinkoData.wagered.toFixed(2)),
            profitLoss: parseFloat((plinkoData.wonAmount - plinkoData.lostAmount).toFixed(2))
          },
          hilo: {
            bets: hiloData.totalBets,
            wins: hiloData.totalWins,
            losses: hiloData.totalLosses,
            wagered: parseFloat(hiloData.wagered.toFixed(2)),
            profitLoss: parseFloat((hiloData.wonAmount - hiloData.lostAmount).toFixed(2))
          }
        }
      }
    };
    
    return res.status(200).json(response);
    
  } catch (error) {
    console.error('Error fetching user statistics:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Server error while fetching user statistics' 
    });
  }
};

// Utility to generate a unique email and affiliate code for each bot
function generateBotEmail(name) {
  // Ensure uniqueness by adding a random number
  const rand = Math.floor(Math.random() * 100000);
  return `${name.toLowerCase().replace(/\s/g, '')}${rand}@fairstakebet.com`;
}
function generateAffiliateCode(name) {
  // Ensure uniqueness by adding a random number
  const rand = Math.floor(Math.random() * 100000);
  return `BOT${name.toUpperCase().replace(/\s/g, '')}${rand}`;
}

async function ensureBotUsers(botNames) {
  // Check how many bots already exist
  const existingBots = await Bot.find({ username: { $in: botNames } });
  if (existingBots.length >= 100) {1
    // If 50 or more bots exist, return the first 50
    return existingBots.slice(0,  100);
  }

  const bots = [...existingBots];
  for (const name of botNames) {
    if (bots.find(b => b.username === name)) continue; // Skip if already exists

    // Generate unique email and affiliate code
    let email, affiliateCode, emailExists, codeExists;
    do {
      email = generateBotEmail(name);
      emailExists = await User.findOne({ email });
    } while (emailExists);

    do {
      affiliateCode = generateAffiliateCode(name);
      codeExists = await Bot.findOne({ affiliateCode });
    } while (codeExists);

    const bot = await Bot.create({
      username: name,
      email,
      password: 'botpassword',
      isBot: true,
      balance: 10000,
      vipLevel: 0,
      affiliateCode,
      agreeToTerms: true,
      is_verified: true
    });
    bots.push(bot);

    if (bots.length >= 100) break; // Stop if we reach 50 bots
  }
  return bots.slice(0, 100);
}

async function ensureFiftyBots(botNames, avatars) {
  let bots = await Bot.find({});
  // Delete extra bots if more than 50
  if (bots.length > 100) {
    const toDelete = bots.slice(100);
    await Bot.deleteMany({ _id: { $in: toDelete.map(b => b._id) } });
    bots = bots.slice(0,  100);
  }
  // Create new bots if less than 50
  while (bots.length < 100) {
    const name = botNames[bots.length % botNames.length] + (bots.length + 1);
    const avatar = avatars[bots.length % avatars.length];
    const affiliateCode = `BOT${name.toUpperCase()}${Math.floor(Math.random() * 100000)}`;
    const bot = await Bot.create({
      username: name,
      avatar,
      affiliateCode
    });
    bots.push(bot);
  }
  return bots;
}

module.exports = { 
  updateUserDetails,
  getUserStatistics,
  ensureBotUsers,
  ensureFiftyBots
};