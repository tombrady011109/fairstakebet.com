const crypto = require('crypto');

// Generate hash from client seed, nonce, and server seed
function generateHash(clientSeed, nonce, serverSeed) {
  const hmac = crypto.createHmac('sha512', serverSeed);
  const data = `${clientSeed}:${nonce}`;
  hmac.update(data);
  return hmac.digest('hex');
}

// Generate a Limbo multiplier from a hash
function generateLimboRoll(hash) {
  // Use first 8 characters of the hash to generate a number between 0 and 1
  const h = parseInt(hash.substr(0, 8), 16);
  const result = h / 0xffffffff;
  
  // Calculate the multiplier using the house edge formula
  // This formula creates a fair distribution with a 1% house edge
  const houseEdge = 0.01; // 1% house edge
  const multiplier = 99 / (result * 100);
  
  // Return the multiplier with 2 decimal places, minimum of 1.00
  return parseFloat(Math.max(1.00, multiplier).toFixed(2));
}

// Check if a roll is a win based on target multiplier and mode
function isWin(roll, target, mode) {
  if (mode === 'over') {
    return roll > target;
  } else {
    return roll < target;
  }
}

// Calculate win chance based on target multiplier and mode
function calculateWinChance(target, mode) {
  if (mode === 'over') {
    // For 'over' mode: chance = 99/target
    return parseFloat((99 / target).toFixed(2));
  } else {
    // For 'under' mode: chance = (target - 1) / (100 - 1) * 99
    return parseFloat(((target - 1) / 99 * 100).toFixed(2));
  }
}

// Calculate multiplier based on win chance
function calculateMultiplier(winChance) {
  // House edge of 1%
  return parseFloat((99 / winChance).toFixed(2));
}

// Calculate payout multiplier for a given target and mode
function calculatePayoutMultiplier(target, mode) {
  const winChance = calculateWinChance(target, mode);
  return parseFloat((99 / winChance).toFixed(2));
}

// Validate bet parameters
function validateBet(betAmount, target, mode) {
  if (isNaN(betAmount) || betAmount <= 0) {
    throw new Error('Invalid bet amount');
  }
  
  if (isNaN(target) || target < 1.01 || target > 1000) {
    throw new Error('Invalid target multiplier (must be between 1.01 and 1000)');
  }
  
  if (mode !== 'over' && mode !== 'under') {
    throw new Error('Invalid mode (must be "over" or "under")');
  }
}

module.exports = {
  generateHash,
  generateLimboRoll,
  isWin,
  calculateWinChance,
  calculateMultiplier,
  calculatePayoutMultiplier,
  validateBet
};