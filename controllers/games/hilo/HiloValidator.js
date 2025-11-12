/**
 * HiloValidator - Validates inputs for Hilo game
 */
class HiloValidator {
  /**
   * Validate bet amount
   * @param {number} amount - Bet amount
   * @param {Object} config - Game configuration
   * @returns {boolean} - Whether the bet amount is valid
   */
  validateBetAmount(amount, config) {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return false;
    }
    
    const { minBet, maxBet } = config;
    return amount >= minBet && amount <= maxBet;
  }
  
  /**
   * Validate token
   * @param {string} token - Token
   * @param {Array} allowedTokens - Allowed tokens
   * @returns {boolean} - Whether the token is valid
   */
  validateToken(token, allowedTokens) {
    if (typeof token !== 'string') {
      return false;
    }
    
    return allowedTokens.includes(token);
  }
  
  /**
   * Validate choice
   * @param {string} choice - Player's choice
   * @returns {boolean} - Whether the choice is valid
   */
  validateChoice(choice) {
    return choice === 'hi' || choice === 'lo';
  }
  
  /**
   * Validate client seed
   * @param {string} clientSeed - Client seed
   * @returns {boolean} - Whether the client seed is valid
   */
  validateClientSeed(clientSeed) {
    if (typeof clientSeed !== 'string') {
      return false;
    }
    
    // Client seed should be of reasonable length
    if (clientSeed.length < 6 || clientSeed.length > 64) {
      return false;
    }
    
    // Client seed should only contain alphanumeric characters
    return /^[a-zA-Z0-9]+$/.test(clientSeed);
  }
  
  /**
   * Validate bet ID
   * @param {string} betId - Bet ID
   * @returns {boolean} - Whether the bet ID is valid
   */
  validateBetId(betId) {
    if (typeof betId !== 'string') {
      return false;
    }
    
    // Bet ID should be a numeric string
    return /^\d+$/.test(betId);
  }
  
  /**
   * Validate room ID
   * @param {string} roomId - Room ID
   * @returns {boolean} - Whether the room ID is valid
   */
  validateRoomId(roomId) {
    if (typeof roomId !== 'string') {
      return false;
    }
    
    // Room ID should be alphanumeric
    return /^[a-zA-Z0-9-_]+$/.test(roomId);
  }
  
  /**
   * Validate user ID
   * @param {string} userId - User ID
   * @returns {boolean} - Whether the user ID is valid
   */
  validateUserId(userId) {
    if (typeof userId !== 'string') {
      return false;
    }
    
    // User ID should be a valid MongoDB ObjectId
    return /^[0-9a-fA-F]{24}$/.test(userId);
  }
  
  /**
   * Validate limit
   * @param {number} limit - Limit
   * @returns {boolean} - Whether the limit is valid
   */
  validateLimit(limit) {
    if (typeof limit !== 'number' || isNaN(limit)) {
      return false;
    }
    
    return limit > 0 && limit <= 100;
  }
}

module.exports = HiloValidator;