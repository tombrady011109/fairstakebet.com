const User = require('../../models/user.model');

/**
 * Update a user's balance
 * @param {string} userId - The user's ID
 * @param {number} amount - The amount to add to the balance (negative for subtraction)
 * @returns {Promise<Object>} The updated user object
 */
async function updateUserBalance(userId, amount) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Amount must be a number');
    }
    
    // Find the user and update their balance
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { balance: amount } },
      { new: true, runValidators: true }
    );
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  } catch (error) {
    console.error('Error updating user balance:', error);
    throw new Error(`Failed to update balance: ${error.message}`);
  }
}

/**
 * Get a user's current balance
 * @param {string} userId - The user's ID
 * @returns {Promise<number>} The user's current balance
 */
async function getUserBalance(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const user = await User.findById(userId).select('balance');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.balance;
  } catch (error) {
    console.error('Error getting user balance:', error);
    throw new Error(`Failed to get balance: ${error.message}`);
  }
}

/**
 * Check if a user has sufficient balance for a bet
 * @param {string} userId - The user's ID
 * @param {number} amount - The bet amount
 * @returns {Promise<boolean>} Whether the user has sufficient balance
 */
async function hasSufficientBalance(userId, amount) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      throw new Error('Amount must be a positive number');
    }
    
    const balance = await getUserBalance(userId);
    return balance >= amount;
  } catch (error) {
    console.error('Error checking user balance:', error);
    throw new Error(`Failed to check balance: ${error.message}`);
  }
}

module.exports = {
  updateUserBalance,
  getUserBalance,
  hasSufficientBalance
};