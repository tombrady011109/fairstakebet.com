const crypto = require('crypto');
const User = require('../../../models/user.model');

// Generate a random server seed
function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

// Hash a server seed
function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

// Update user wallet after a bet
async function updateWallet(data, emitter) {
  let balance = 0;
  let prevBalance = 0;
  let betAmount = parseFloat(data.betAmount);
  try {
    const user = await User.findById(data._id);

    prevBalance = parseFloat(user.balance);

    if (!data.won && prevBalance < betAmount) {
      throw new Error('Not enough balance!');
    }

    balance = prevBalance +  parseFloat(data.profit)

    // Emit wallet update event
    emitter('dice-wallet', [{ ...data, balance }]);
    
    // Update user balance
    await User.findByIdAndUpdate(
      data._id,
      { balance }
    );

    return balance;
  } catch (error) {
    console.error('Update wallet error:', error);
    throw error;
  }
}

// Populate user data for bet
async function populateUser(data) {
  try {
    const user = await User.findById(data.user_id);
    if (!user) {
      throw new Error('User not found');
    }
    
    return {
      ...data,
      userId: user._id,
      hidden: user.hidden_from_public || false,
      name: user.hidden_from_public ? 'Hidden' : user.username,
      avatar: user.hidden_from_public ? '' : user.profile_image,
    };
  } catch (error) {
    console.error('Populate user error:', error);
    throw error;
  }
}

// Format bet data for response
function formatBetResponse(bet, user) {
  return {
    betId: bet.bet_id,
    userId: user._id,
    name: user.hidden_from_public ? 'Hidden' : user.username,
    hidden: user.hidden_from_public || false,
    avatar: user.hidden_from_public ? '' : user.profile_image,
    currencyName: bet.token,
    currencyImage: bet.token_img,
    betAmount: bet.bet_amount,
    roll: bet.roll,
    target: bet.target,
    mode: bet.mode,
    multiplier: bet.multiplier,
    winAmount: bet.won ? bet.bet_amount * bet.multiplier : 0,
    won: bet.won,
    betTime: bet.time,
  };
}

// Validate bet parameters
function validateBetParams(betAmount, target, mode) {
  if (isNaN(betAmount) || betAmount <= 0) {
    throw new Error('Invalid bet amount');
  }
  
  if (isNaN(target) || target < 2 || target > 98) {
    throw new Error('Invalid target value (must be between 2 and 98)');
  }
  
  if (mode !== 'over' && mode !== 'under') {
    throw new Error('Invalid mode (must be "over" or "under")');
  }
}

// Generate a random string
function generateRandomString(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}
  module.exports = {
    generateServerSeed,
    hashServerSeed,
    updateWallet,
    populateUser,
    formatBetResponse,
    validateBetParams,
    generateRandomString
  }