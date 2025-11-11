const HiloGame = require('../../../models/games/hilo/hilo_game');
const HiloGameHistory = require('../../../models/games/hilo/hilo_game_history');
const HiloEncryptedSeeds = require('../../../models/games/hilo/hilo_encryped_seeds');
const { generateServerSeed, hashServerSeed, generateClientSeed, calculateHiChance, calculateLoChance } = require('./HiloGameUtils');
const { getCardFromHash, calculatePayout } = require('./HiloGameLogic');
const crypto = require('crypto');

/**
 * Get recent bets for the Hilo game
 * @returns {Promise<Array>} - Recent bets
 */
async function getRecentBets() {
  try {
    const recentBets = await HiloGameHistory.find()
      .sort({ time: -1 })
      .limit(20)
      .lean();
    
    return recentBets;
  } catch (error) {
    console.error('Error getting recent bets:', error);
    throw error;
  }
}

/**
 * Get user's encrypted seeds
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - User's seeds
 */
async function getUserSeeds(userId) {
  try {
    const seeds = await HiloEncryptedSeeds.findOne({ 
      user_id: userId,
      is_open: false
    }).sort({ seed_id: -1 });
    
    return seeds;
  } catch (error) {
    console.error('Error getting user seeds:', error);
    throw error;
  }
}

/**
 * Generate new seeds for a user
 * @param {string} userId - User ID
 * @returns {Promise<Object>} - New seeds
 */
async function generateNewSeeds(userId) {
  try {
    // Generate server seed and hash
    const serverSeed = generateServerSeed();
    const hashSeed = hashServerSeed(serverSeed);
    
    // Generate next server seed and hash (for future use)
    const nextServerSeed = generateServerSeed();
    const nextHashSeed = hashServerSeed(nextServerSeed);
    
    // Generate client seed
    const clientSeed = generateClientSeed();
    
    // Create new seeds document
    const newSeeds = new HiloEncryptedSeeds({
      user_id: userId,
      server_seed: serverSeed,
      client_seed: clientSeed,
      hash_seed: hashSeed,
      next_server_seed: nextServerSeed,
      next_hash_seed: nextHashSeed,
      nonce: 0,
      is_open: false,
      updated_at: new Date()
    });
    
    await newSeeds.save();
    
    return newSeeds;
  } catch (error) {
    console.error('Error generating new seeds:', error);
    throw error;
  }
}

/**
 * Update user's client seed
 * @param {string} userId - User ID
 * @param {string} clientSeed - New client seed
 * @returns {Promise<Object>} - Updated seeds
 */
async function updateSeeds(userId, clientSeed) {
  try {
    // Get current seeds
    const currentSeeds = await getUserSeeds(userId);
    
    if (!currentSeeds) {
      throw new Error('No seeds found for user');
    }
    
    // Mark current seeds as open
    currentSeeds.is_open = true;
    currentSeeds.updated_at = new Date();
    await currentSeeds.save();
    
    // Create new seeds with next server seed
    const newSeeds = new HiloEncryptedSeeds({
      user_id: userId,
      server_seed: currentSeeds.next_server_seed,
      client_seed: clientSeed || generateClientSeed(),
      hash_seed: currentSeeds.next_hash_seed,
      next_server_seed: generateServerSeed(),
      next_hash_seed: hashServerSeed(generateServerSeed()),
      nonce: 0,
      is_open: false,
      updated_at: new Date()
    });
    
    await newSeeds.save();
    
    return {
      previousServerSeed: currentSeeds.server_seed,
      previousClientSeed: currentSeeds.client_seed,
      previousHashSeed: currentSeeds.hash_seed,
      newClientSeed: newSeeds.client_seed,
      newHashSeed: newSeeds.hash_seed,
      nextHashSeed: newSeeds.next_hash_seed
    };
  } catch (error) {
    console.error('Error updating seeds:', error);
    throw error;
  }
}

/**
 * Handle a new bet
 * @param {Object} data - Bet data
 * @param {Function} emitEvent - Function to emit events
 * @returns {Promise<Object>} - Bet result
 */
async function handleBet(data, emitEvent) {
  try {
    const { _id, amount, token, token_img } = data;
    
    // Get user's seeds
    const seeds = await getUserSeeds(_id);
    
    if (!seeds) {
      throw new Error('No seeds found for user');
    }
    
    // Increment nonce
    seeds.nonce += 1;
    await seeds.save();
    
    // Generate initial card using provably fair algorithm
    const hash = crypto.createHmac('sha256', seeds.server_seed)
      .update(`${seeds.client_seed}:${seeds.nonce}:0`)
      .digest('hex');
    
    const initialCard = getCardFromHash(hash);
    
    // Calculate hi and lo chances
    const hiChance = calculateHiChance(initialCard.rankNumber);
    const loChance = calculateLoChance(initialCard.rankNumber);
    
    // Create new game
    const newGame = new HiloGame({
      user_id: _id,
      bet_amount: amount,
      token,
      token_img,
      seed_id: seeds.seed_id,
      lo_chance: loChance,
      hi_chance: hiChance,
      nonce: seeds.nonce,
      rounds: [{
        cardRank: initialCard.rank,
        cardRankNumber: initialCard.rankNumber,
        cardSuite: initialCard.suit,
        cardNumber: initialCard.cardNumber,
        hi_chance: hiChance,
        lo_chance: loChance
      }]
    });
    
    await newGame.save();
    
    // Emit event for new bet
    emitEvent('newHiloBet', {
      bet_id: newGame.bet_id,
      user_id: _id,
      amount,
      token,
      token_img,
      time: newGame.time
    });
    
    return {
      bet_id: newGame.bet_id,
      card: {
        rank: initialCard.rank,
        rankNumber: initialCard.rankNumber,
        suit: initialCard.suit,
        cardNumber: initialCard.cardNumber
      },
      hi_chance: hiChance,
      lo_chance: loChance,
      round: 0
    };
  } catch (error) {
    console.error('Error handling bet:', error);
    throw error;
  }
}

/**
 * Handle player choice (higher or lower)
 * @param {Object} data - Choice data
 * @param {Function} emitEvent - Function to emit events
 * @returns {Promise<Object>} - Choice result
 */
async function handleChoice(data, emitEvent) {
  try {
    const { _id, betId, choice } = data;
    
    // Find the game
    const game = await HiloGame.findOne({ bet_id: betId, user_id: _id });
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.has_ended) {
      throw new Error('Game has already ended');
    }
    
    // Get user's seeds
    const seeds = await HiloEncryptedSeeds.findOne({ seed_id: game.seed_id });
    
    if (!seeds) {
      throw new Error('Seeds not found');
    }
    
    // Get current round
    const currentRound = game.round;
    const nextRound = currentRound + 1;
    
    // Get current card
    const currentCard = game.rounds[currentRound];
    
    // Generate next card using provably fair algorithm
    const hash = crypto.createHmac('sha256', seeds.server_seed)
      .update(`${seeds.client_seed}:${seeds.nonce}:${nextRound}`)
      .digest('hex');
    
    const nextCard = getCardFromHash(hash);
    
    // Determine if player won
    let won = false;
    if (choice === 'hi' && nextCard.rankNumber > currentCard.cardRankNumber) {
      won = true;
    } else if (choice === 'lo' && nextCard.rankNumber < currentCard.cardRankNumber) {
      won = true;
    }
    
    // Calculate hi and lo chances for next card
    const hiChance = calculateHiChance(nextCard.rankNumber);
    const loChance = calculateLoChance(nextCard.rankNumber);
    
    // Calculate payout for this round
    const payout = won ? calculatePayout(choice === 'hi' ? currentCard.hi_chance : currentCard.lo_chance) : 0;
    
    // Create round data
    const roundData = {
      cardRank: nextCard.rank,
      cardRankNumber: nextCard.rankNumber,
      cardSuite: nextCard.suit,
      cardNumber: nextCard.cardNumber,
      hi_chance: hiChance,
      lo_chance: loChance,
      hi: choice === 'hi',
      lo: choice === 'lo',
      payout: payout,
      profit: won ? game.bet_amount * payout - game.bet_amount : -game.bet_amount
    };
    
    // Update game
    if (won) {
      // Player won, continue to next round
      game.rounds.push(roundData);
      game.round = nextRound;
      game.profit += roundData.profit;
    } else {
      // Player lost, end game
      game.rounds.push(roundData);
      game.has_ended = true;
      game.won = false;
      game.profit = -game.bet_amount;
      
      // Create game history record
      await createGameHistory(game);
    }
    
    await game.save();
    
    // Emit event for choice result
    emitEvent('hiloChoiceResult', {
      bet_id: game.bet_id,
      user_id: _id,
      choice,
      won,
      card: {
        rank: nextCard.rank,
        rankNumber: nextCard.rankNumber,
        suit: nextCard.suit,
        cardNumber: nextCard.cardNumber
      },
      hi_chance: hiChance,
      lo_chance: loChance,
      payout,
      profit: roundData.profit,
      round: nextRound,
      has_ended: game.has_ended
    });
    
    return {
      won,
      card: {
        rank: nextCard.rank,
        rankNumber: nextCard.rankNumber,
        suit: nextCard.suit,
        cardNumber: nextCard.cardNumber
      },
      hi_chance: hiChance,
      lo_chance: loChance,
      payout,
      profit: roundData.profit,
      round: nextRound,
      has_ended: game.has_ended
    };
  } catch (error) {
    console.error('Error handling choice:', error);
    throw error;
  }
}

/**
 * Handle player cashout
 * @param {Object} data - Cashout data
 * @param {Function} emitEvent - Function to emit events
 * @returns {Promise<Object>} - Cashout result
 */
async function handleCashout(data, emitEvent) {
  try {
    const { _id, betId } = data;
    
    // Find the game
    const game = await HiloGame.findOne({ bet_id: betId, user_id: _id });
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    if (game.has_ended) {
      throw new Error('Game has already ended');
    }
    
    // Calculate total payout
    let totalPayout = 1; // Start with 1x
    for (let i = 1; i <= game.round; i++) {
      totalPayout *= game.rounds[i].payout;
    }
    
    // Calculate total profit
    const totalProfit = game.bet_amount * totalPayout - game.bet_amount;
    
    // Update game
    game.has_ended = true;
    game.won = true;
    game.payout = totalPayout;
    game.profit = totalProfit;
    
    await game.save();
    
    // Create game history record
    await createGameHistory(game);
    
    // Emit event for cashout result
    emitEvent('hiloCashoutResult', {
      bet_id: game.bet_id,
      user_id: _id,
      payout: totalPayout,
      profit: totalProfit,
      rounds: game.round
    });
    
    return {
      payout: totalPayout,
      profit: totalProfit,
      rounds: game.round
    };
  } catch (error) {
    console.error('Error handling cashout:', error);
    throw error;
  }
}

/**
 * Get game details
 * @param {string} betId - Bet ID
 * @returns {Promise<Object>} - Game details
 */
async function getGameDetails(betId) {
  try {
    const game = await HiloGame.findOne({ bet_id: betId }).lean();
    
    if (!game) {
      throw new Error('Game not found');
    }
    
    // Get seeds
    const seeds = await HiloEncryptedSeeds.findOne({ seed_id: game.seed_id });
    
    // Format game details
    return {
      bet_id: game.bet_id,
      user_id: game.user_id,
      bet_amount: game.bet_amount,
      token: game.token,
      token_img: game.token_img,
      rounds: game.rounds,
      round: game.round,
      has_ended: game.has_ended,
      won: game.won,
      payout: game.payout,
      profit: game.profit,
      time: game.time,
      seeds: seeds ? {
        server_seed: seeds.is_open ? seeds.server_seed : null,
        client_seed: seeds.client_seed,
        hash_seed: seeds.hash_seed,
        nonce: seeds.nonce
      } : null
    };
  } catch (error) {
    console.error('Error getting game details:', error);
    throw error;
  }
}

/**
 * Create game history record
 * @param {Object} game - Game document
 * @returns {Promise<void>}
 /**
 * Create game history record
 * @param {Object} game - Game document
 * @returns {Promise<void>}
 */
async function createGameHistory(game) {
  try {
    const history = new HiloGameHistory({
      user_id: game.user_id,
      bet_id: parseInt(game.bet_id),
      bet_amount: game.bet_amount,
      token: game.token,
      token_img: game.token_img,
      won: game.won,
      payout: game.payout,
      time: game.time
    })
    
    await history.save()
  } catch (error) {
    console.error('Error creating game history:', error)
    throw error
  }
}

/**
 * Get user's game history
 * @param {string} userId - User ID
 * @param {number} limit - Limit of records to return
 * @returns {Promise<Array>} - User's game history
 */
async function getUserGameHistory(userId, limit = 20) {
  try {
    const history = await HiloGameHistory.find({ user_id: userId })
      .sort({ time: -1 })
      .limit(limit)
      .lean()
    
    return history
  } catch (error) {
    console.error('Error getting user game history:', error)
    throw error
  }
}

/**
 * Skip current round
 * @param {Object} data - Skip data
 * @param {Function} emitEvent - Function to emit events
 * @returns {Promise<Object>} - Skip result
 */
async function handleSkip(data, emitEvent) {
  try {
    const { _id, betId } = data
    
    // Find the game
    const game = await HiloGame.findOne({ bet_id: betId, user_id: _id })
    
    if (!game) {
      throw new Error('Game not found')
    }
    
    if (game.has_ended) {
      throw new Error('Game has already ended')
    }
    
    // Get user's seeds
    const seeds = await HiloEncryptedSeeds.findOne({ seed_id: game.seed_id })
    
    if (!seeds) {
      throw new Error('Seeds not found')
    }
    
    // Get current round
    const currentRound = game.round
    const nextRound = currentRound + 1
    
    // Generate next card using provably fair algorithm
    const hash = crypto.createHmac('sha256', seeds.server_seed)
      .update(`${seeds.client_seed}:${seeds.nonce}:${nextRound}`)
      .digest('hex')
    
    const nextCard = getCardFromHash(hash)
    
    // Calculate hi and lo chances for next card
    const hiChance = calculateHiChance(nextCard.rankNumber)
    const loChance = calculateLoChance(nextCard.rankNumber)
    
    // Create round data
    const roundData = {
      cardRank: nextCard.rank,
      cardRankNumber: nextCard.rankNumber,
      cardSuite: nextCard.suit,
      cardNumber: nextCard.cardNumber,
      hi_chance: hiChance,
      lo_chance: loChance,
      skipped: true
    }
    
    // Update game
    game.rounds.push(roundData)
    game.round = nextRound
    
    await game.save()
    
    // Emit event for skip result
    emitEvent('hiloSkipResult', {
      bet_id: game.bet_id,
      user_id: _id,
      card: {
        rank: nextCard.rank,
        rankNumber: nextCard.rankNumber,
        suit: nextCard.suit,
        cardNumber: nextCard.cardNumber
      },
      hi_chance: hiChance,
      lo_chance: loChance,
      round: nextRound
    })
    
    return {
      card: {
        rank: nextCard.rank,
        rankNumber: nextCard.rankNumber,
        suit: nextCard.suit,
        cardNumber: nextCard.cardNumber
      },
      hi_chance: hiChance,
      lo_chance: loChance,
      round: nextRound
    }
  } catch (error) {
    console.error('Error handling skip:', error)
    throw error
  }
}

/**
 * Verify fairness of a game
 * @param {string} betId - Bet ID
 * @returns {Promise<Object>} - Verification result
 */
async function verifyFairness(betId) {
  try {
    const game = await HiloGame.findOne({ bet_id: betId }).lean()
    
    if (!game) {
      throw new Error('Game not found')
    }
    
    // Get seeds
    const seeds = await HiloEncryptedSeeds.findOne({ seed_id: game.seed_id })
    
    if (!seeds || !seeds.is_open) {
      throw new Error('Seeds not found or not revealed yet')
    }
    
    // Verify each round
    const verificationResults = []
    
    for (let i = 0; i <= game.round; i++) {
      const hash = crypto.createHmac('sha256', seeds.server_seed)
        .update(`${seeds.client_seed}:${seeds.nonce}:${i}`)
        .digest('hex')
      
      const card = getCardFromHash(hash)
      const actualCard = game.rounds[i]
      
      // Check if the card matches
      const isValid = (
        card.rank === actualCard.cardRank &&
        card.rankNumber === actualCard.cardRankNumber &&
        card.suit === actualCard.cardSuite &&
        card.cardNumber === actualCard.cardNumber
      )
      
      verificationResults.push({
        round: i,
        expected: card,
        actual: {
          rank: actualCard.cardRank,
          rankNumber: actualCard.cardRankNumber,
          suit: actualCard.cardSuite,
          cardNumber: actualCard.cardNumber
        },
        isValid
      })
    }
    
    return {
      bet_id: game.bet_id,
      server_seed: seeds.server_seed,
      client_seed: seeds.client_seed,
      nonce: seeds.nonce,
      hash_seed: seeds.hash_seed,
      rounds: verificationResults,
      isValid: verificationResults.every(result => result.isValid)
    }
  } catch (error) {
    console.error('Error verifying fairness:', error)
    throw error
  }
}

module.exports = {
  getRecentBets,
  getUserSeeds,
  generateNewSeeds,
  updateSeeds,
  handleBet,
  handleChoice,
  handleCashout,
  handleSkip,
  getGameDetails,
  getUserGameHistory,
  verifyFairness
}       