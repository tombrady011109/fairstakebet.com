/**
 * Get a card from a hash
 * @param {string} hash - Hash to derive card from
 * @returns {Object} - Card object
 */
function getCardFromHash(hash) {
  // Use first 8 characters of hash as a hex number
  const hexValue = hash.substring(0, 8);
  
  // Convert hex to decimal
  const decimalValue = parseInt(hexValue, 16);
  
  // Determine card number (0-51)
  const cardNumber = decimalValue % 52;
  
  // Determine suit (0-3: hearts, diamonds, clubs, spades)
  const suitIndex = Math.floor(cardNumber / 13);
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const suit = suits[suitIndex];
  
  // Determine rank (1-13: A, 2-10, J, Q, K)
  const rankNumber = (cardNumber % 13) + 1;
  
  // Get rank name
  let rank;
  if (rankNumber === 1) rank = 'A';
  else if (rankNumber === 11) rank = 'J';
  else if (rankNumber === 12) rank = 'Q';
  else if (rankNumber === 13) rank = 'K';
  else rank = rankNumber.toString();
  
  return {
    cardNumber,
    suit,
    rankNumber,
    rank
  };
}

/**
 * Calculate payout multiplier based on probability
 * @param {number} probability - Probability of winning (0-1)
 * @returns {number} - Payout multiplier
 */
function calculatePayout(probability) {
  if (probability <= 0) return 0;
  
  // House edge of 1%
  const houseEdge = 0.01;
  
  // Formula: (1 - houseEdge) / probability
  const fairPayout = (1 - houseEdge) / probability;
  
  // Round to 2 decimal places
  return Math.round(fairPayout * 100) / 100;
}

/**
 * Check if a card is higher than another
 * @param {Object} card1 - First card
 * @param {Object} card2 - Second card
 * @returns {boolean} - Whether card1 is higher than card2
 */
function isCardHigher(card1, card2) {
  return card1.rankNumber > card2.rankNumber;
}

/**
 * Check if a card is lower than another
 * @param {Object} card1 - First card
 * @param {Object} card2 - Second card
 * @returns {boolean} - Whether card1 is lower than card2
 */
function isCardLower(card1, card2) {
  return card1.rankNumber < card2.rankNumber;
}

/**
 * Calculate the maximum potential payout for a game
 * @param {number} betAmount - Bet amount
 * @param {number} rounds - Number of rounds
 * @returns {number} - Maximum potential payout
 */
function calculateMaxPotentialPayout(betAmount, rounds) {
  // Assume best case scenario: always choosing the option with 1/13 probability
  const bestCasePayout = calculatePayout(1/13);
  
  // Compound the payout over rounds
  return betAmount * Math.pow(bestCasePayout, rounds);
}

/**
 * Validate a choice
 * @param {string} choice - Player's choice ('hi' or 'lo')
 * @returns {boolean} - Whether the choice is valid
 */
function validateChoice(choice) {
  return choice === 'hi' || choice === 'lo';
}

module.exports = {
  getCardFromHash,
  calculatePayout,
  isCardHigher,
  isCardLower,
  calculateMaxPotentialPayout,
  validateChoice
};