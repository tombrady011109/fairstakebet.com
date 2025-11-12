/**
 * Handle errors in a consistent way
 * @param {Error} error - The error object
 * @param {Function} callback - The callback function to send response
 * @param {string} defaultMessage - Default error message
 */
function handleError(error, callback, defaultMessage = 'An error occurred') {
  console.error(error);
  callback({ 
    code: -1, 
    message: error.message || defaultMessage 
  });
}

/**
 * Generate a random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} - Random integer
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Shuffle an array using Fisher-Yates algorithm
 * @param {Array} array - Array to shuffle
 * @returns {Array} - Shuffled array
 */
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Validate mines count is within acceptable range
 * @param {number} minesCount - Number of mines
 * @returns {boolean} - True if valid
 */
function isValidMinesCount(minesCount) {
  return minesCount >= 1 && minesCount <= 24;
}

/**
 * Validate bet amount is within acceptable range
 * @param {number} betAmount - Bet amount
 * @param {number} minBet - Minimum bet allowed
 * @param {number} maxBet - Maximum bet allowed
 * @returns {boolean} - True if valid
 */
function isValidBetAmount(betAmount, minBet = 0.1, maxBet = 1000) {
  return betAmount >= minBet && betAmount <= maxBet;
}

module.exports = {
  handleError,
  getRandomInt,
  shuffleArray,
  isValidMinesCount,
  isValidBetAmount
};