const crypto = require('crypto');

// Generate hash from client seed, nonce, and server seed
function generateHash(clientSeed, nonce, serverSeed) {
  const hmac = crypto.createHmac('sha512', serverSeed);
  const data = `${clientSeed}:${nonce}`;
  hmac.update(data);
  return hmac.digest('hex');
}

// Generate a dice roll from a hash
function generateDiceRoll(hash) {
  // Use first 8 characters of the hash to generate a number between 0 and 100
  const roll = parseInt(hash.substr(0, 8), 16) / 0xffffffff * 100;
  return parseFloat(roll.toFixed(2));
}

// Check if a roll is a win based on target and mode
function isWin(roll, target, mode) {
  if (mode === 'over') {
    return roll > target;
  } else {
    return roll < target;
  }
}

// Calculate win chance based on target and mode
function calculateWinChance(target, mode) {
  if (mode === 'over') {
    return 100 - target;
  } else {
    return target;
  }
}

// Calculate multiplier based on win chance
function calculateMultiplier(winChance) {
  // House edge of 1%
  return parseFloat((99 / winChance).toFixed(2));
}

// Calculate win amount based on bet amount, target, and mode
function calculateWinAmount(betAmount, target, mode) {
  const winChance = calculateWinChance(target, mode);
  const multiplier = calculateMultiplier(winChance);
  return multiplier;
}

// Validate bet parameters
function validateBet(betAmount, target, mode) {
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

module.exports = {
  generateHash,
  generateDiceRoll,
  isWin,
  calculateWinChance,
  calculateMultiplier,
  calculateWinAmount,
  validateBet
};