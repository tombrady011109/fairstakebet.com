const crypto = require('crypto');

/**
 * Generate a random server seed
 * @returns {string} - Random server seed
 */
function generateServerSeed() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a server seed
 * @param {string} serverSeed - Server seed to hash
 * @returns {string} - Hashed server seed
 */
function hashServerSeed(serverSeed) {
  return crypto.createHash('sha256').update(serverSeed).digest('hex');
}

/**
 * Generate a random client seed
 * @returns {string} - Random client seed
 */
function generateClientSeed() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Calculate the chance of getting a higher card
 * @param {number} currentRank - Current card rank (1-13)
 * @returns {number} - Probability of getting a higher card (0-1)
 */
function calculateHiChance(currentRank) {
  // There are 13 ranks (A, 2-10, J, Q, K)
  // Calculate how many ranks are higher than the current one
  const higherRanks = 13 - currentRank;
  
  // Calculate probability (higher ranks / total ranks)
  return higherRanks / 13;
}

/**
 * Calculate the chance of getting a lower card
 * @param {number} currentRank - Current card rank (1-13)
 * @returns {number} - Probability of getting a lower card (0-1)
 */
function calculateLoChance(currentRank) {
  // There are 13 ranks (A, 2-10, J, Q, K)
  // Calculate how many ranks are lower than the current one
  const lowerRanks = currentRank - 1;
  
  // Calculate probability (lower ranks / total ranks)
  return lowerRanks / 13;
}

/**
 * Calculate the maximum safe multiplier based on house edge
 * @param {number} probability - Probability of winning (0-1)
 * @param {number} houseEdge - House edge percentage (default: 1%)
 * @returns {number} - Maximum safe multiplier
 */
function calculateMaxMultiplier(probability, houseEdge = 0.01) {
  if (probability <= 0) return 0;
  
  // Formula: (1 - houseEdge) / probability
  return (1 - houseEdge) / probability;
}

/**
 * Validate a client seed
 * @param {string} clientSeed - Client seed to validate
 * @returns {boolean} - Whether the client seed is valid
 */
function validateClientSeed(clientSeed) {
  // Client seed should be a string of reasonable length
  if (typeof clientSeed !== 'string') return false;
  if (clientSeed.length < 6 || clientSeed.length > 64) return false;
  
  // Client seed should only contain alphanumeric characters
  return /^[a-zA-Z0-9]+$/.test(clientSeed);
}

/**
 * Format a probability as a percentage string
 * @param {number} probability - Probability (0-1)
 * @returns {string} - Formatted percentage
 */
function formatProbability(probability) {
  return (probability * 100).toFixed(2) + '%';
}

/**
 * Get card suit name from index
 * @param {number} suitIndex - Suit index (0-3)
 * @returns {string} - Suit name
 */
function getSuitName(suitIndex) {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  return suits[suitIndex] || 'unknown';
}

/**
 * Get card rank name from index
 * @param {number} rankIndex - Rank index (0-12)
 * @returns {string} - Rank name
 */
function getRankName(rankIndex) {
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  return ranks[rankIndex] || 'unknown';
}

module.exports = {
  generateServerSeed,
  hashServerSeed,
  generateClientSeed,
  calculateHiChance,
  calculateLoChance,
  calculateMaxMultiplier,
  validateClientSeed,
  formatProbability,
  getSuitName,
  getRankName
};