/**
 * Generate a deck of cards
 * @returns {Array} - Deck of cards
 */
function generateDeck() {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  
  const deck = [];
  
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        display: `${value} of ${suit}`,
        numericValue: getCardValue(value)
      });
    }
  }
  
  return deck;
}

/**
 * Get numeric value of a card
 * @param {string} value - Card value
 * @returns {number} - Numeric value
 */
function getCardValue(value) {
  switch (value) {
    case 'A': return 14;
    case 'K': return 13;
    case 'Q': return 12;
    case 'J': return 11;
    default: return parseInt(value, 10);
  }
}

/**
 * Compare two cards
 * @param {Object} card1 - First card
 * @param {Object} card2 - Second card
 * @returns {number} - Comparison result (-1: lower, 0: same, 1: higher)
 */
function compareCards(card1, card2) {
  if (card1.numericValue < card2.numericValue) return 1;  // Higher
  if (card1.numericValue > card2.numericValue) return -1; // Lower
  return 0; // Same
}

/**
 * Calculate multiplier based on choice and current card
 * @param {string} choice - 'higher', 'lower', or 'same'
 * @param {Object} card - Current card
 * @param {number} remainingCards - Number of cards remaining in deck
 * @returns {number} - Multiplier
 */
function calculateMultiplier(choice, card, remainingCards) {
  // Base multiplier calculation
  let probability = 0;
  const totalCards = remainingCards;
  
  if (choice === 'higher') {
    // Calculate probability of drawing a higher card
    // Number of cards with higher value than current card
    const higherCards = countHigherCards(card.numericValue);
    probability = higherCards / totalCards;
  } else if (choice === 'lower') {
    // Calculate probability of drawing a lower card
    // Number of cards with lower value than current card
    const lowerCards = countLowerCards(card.numericValue);
    probability = lowerCards / totalCards;
  } else if (choice === 'same') {
    // Calculate probability of drawing a card with the same value
    // Number of cards with same value as current card (3 more of the same value)
    const sameCards = 3; // There are 4 cards of each value in a deck, we already have 1
    probability = sameCards / totalCards;
  }
  
  // Apply house edge (e.g., 5%)
  const houseEdge = 0.05;
  
  // Calculate fair multiplier with house edge
  // Fair multiplier is 1/probability
  let multiplier = (1 / probability) * (1 - houseEdge);
  
  // Round to 2 decimal places
  multiplier = Math.round(multiplier * 100) / 100;
  
  // Cap multiplier at a maximum value (e.g., 1000)
  const maxMultiplier = 1000;
  return Math.min(multiplier, maxMultiplier);
}

/**
 * Count number of cards with higher value than given value
 * @param {number} value - Card value
 * @returns {number} - Count of higher cards
 */
function countHigherCards(value) {
  // In a standard deck, each value has 4 cards (one for each suit)
  // Values range from 2 to 14 (Ace)
  if (value >= 14) return 0; // No cards higher than Ace
  
  // Count cards with higher value
  // For each value higher than current, there are 4 cards
  return (14 - value) * 4;
}

/**
 * Count number of cards with lower value than given value
 * @param {number} value - Card value
 * @returns {number} - Count of lower cards
 */
function countLowerCards(value) {
  // In a standard deck, each value has 4 cards (one for each suit)
  // Values range from 2 to 14 (Ace)
  if (value <= 2) return 0; // No cards lower than 2
  
  // Count cards with lower value
  // For each value lower than current, there are 4 cards
  return (value - 2) * 4;
}

/**
 * Generate a provably fair result
 * @param {string} serverSeed - Server seed
 * @param {string} clientSeed - Client seed
 * @param {number} nonce - Nonce
 * @returns {number} - Random number between 0 and 1
 */
function generateProvablyFairResult(serverSeed, clientSeed, nonce) {
  const crypto = require('crypto');
  
  // Combine seeds and nonce
  const combinedSeed = `${serverSeed}:${clientSeed}:${nonce}`;
  
  // Generate hash
  const hash = crypto.createHash('sha256').update(combinedSeed).digest('hex');
  
  // Convert first 8 characters of hash to a decimal between 0 and 1
  const decimal = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
  
  return decimal;
}

/**
 * Use provably fair result to select a card from the deck
 * @param {Array} deck - Deck of cards
 * @param {number} randomValue - Random value between 0 and 1
 * @returns {Object} - Selected card and its index
 */
function selectCardFromDeck(deck, randomValue) {
  // Select card based on random value
  const index = Math.floor(randomValue * deck.length);
  const card = deck[index];
  
  return { card, index };
}

/**
 * Calculate expected value of a bet
 * @param {number} betAmount - Bet amount
 * @param {number} multiplier - Potential multiplier
 * @param {number} probability - Probability of winning
 * @returns {number} - Expected value
 */
function calculateExpectedValue(betAmount, multiplier, probability) {
  // EV = (win amount * probability of winning) - (bet amount * probability of losing)
  const winAmount = betAmount * multiplier;
  const expectedValue = (winAmount * probability) - (betAmount * (1 - probability));
  
  return expectedValue;
}

/**
 * Format card for display
 * @param {Object} card - Card object
 * @returns {Object} - Formatted card
 */
function formatCardForDisplay(card) {
  // Create a copy of the card with only the necessary properties
  return {
    suit: card.suit,
    value: card.value,
    display: card.display,
    color: card.suit === 'hearts' || card.suit === 'diamonds' ? 'red' : 'black'
  };
}

/**
 * Get game history for a user
 * @param {Array} games - Array of game records
 * @param {number} limit - Maximum number of games to return
 * @returns {Array} - Formatted game history
 */
function formatGameHistory(games, limit = 10) {
  return games.slice(0, limit).map(game => ({
    id: game.id,
    betAmount: game.betAmount,
    multiplier: game.multiplier,
    winnings: game.winnings,
    rounds: game.rounds,
    timestamp: game.timestamp
  }));
}

module.exports = {
  generateDeck,
  getCardValue,
  compareCards,
  calculateMultiplier,
  countHigherCards,
  countLowerCards,
  generateProvablyFairResult,
  selectCardFromDeck,
  calculateExpectedValue,
  formatCardForDisplay,
  formatGameHistory
};