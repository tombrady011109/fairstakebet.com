const mongoose = require('mongoose');
const DiceHistory = require('../../../models/games/dice/dice_game_history');
const DiceEncrypt = require('../../../models/games/dice/dice_encrypted_seeds');
const User = require('../../../models/user.model');
const { generateRandomString } = require('../../../utils/generators');
const gameLogic = require('./DiceGameLogic');
const gameUtils = require('./DiceGameUtils');

// Handle a dice bet
async function handleBet(data, emitter) {
  const { _id, betValue } = data;
  const userId = _id;
  try {
    // Validate bet parameters
    gameLogic.validateBet(
      parseFloat(data.betAmount), 
      betValue.target, 
      betValue.mode
    );
    
    // Get or create seeds for the user
    let seeds = await DiceEncrypt.findOne({user_id:userId})
      .sort({ _id: -1 });
      
    if (!seeds) {
      const serverSeed = gameUtils.generateServerSeed();
      const hashSeed = gameUtils.hashServerSeed(serverSeed);
      const nextServerSeed = gameUtils.generateServerSeed();
      const nextHashSeed = gameUtils.hashServerSeed(nextServerSeed);
      
      [seeds] = await DiceEncrypt.create([
        {
          server_seed: serverSeed,
          hash_seed: hashSeed,
          user_id: userId,
          client_seed: generateRandomString(10),
          next_hash_seed: nextHashSeed,
          next_server_seed: nextServerSeed,
        },
      ]);
    }
    
    // Generate dice roll
    const hash = gameLogic.generateHash(
      seeds.client_seed,
      seeds.nonce,
      seeds.server_seed
    );
    
    const roll = gameLogic.generateDiceRoll(hash);
    const won = gameLogic.isWin(roll, betValue.target, betValue.mode);
    const winChance = gameLogic.calculateWinChance(betValue.target, betValue.mode);
    const multiplier = won ? gameLogic.calculateWinAmount(1, betValue.target, betValue.mode) : 0;
    const profit = won ? parseFloat(data.betAmount) * multiplier - parseFloat(data.betAmount) : -parseFloat(data.betAmount);
    
    // Create game record
    const [game] = await DiceHistory.create([
      {
        user_id:userId,
        seed_id: seeds.seed_id,
        bet_amount: parseFloat(data.betAmount),
        token: data.currencyName,
        token_img: data.currencyImage,
        roll: roll,
        target: betValue.target,
        mode: betValue.mode,
        multiplier: multiplier,
        won: won,
        profit: profit,
        nonce: seeds.nonce,
        time: new Date() // Ensure time is set
      },
    ]);
    
    // Update user wallet
    const balance = await gameUtils.updateWallet(
      {
        ...data,
        token: data.currencyName,
        betAmount: parseFloat(data.betAmount),
        won: won,
        profit: profit,
      },
      emitter
    );

    
    // Update nonce
    await DiceEncrypt.updateOne(
      { seed_id: seeds.seed_id },
      { $inc: { nonce: 1 } }
    );
    
    // Return bet result
    return {
      betId: game.bet_id,
      userId,
      name: data.name,
      hidden: data.hidden,
      avatar: data.avatar,
      currencyName: data.currencyName,
      currencyImage: data.currencyImage,
      betAmount: data.betAmount,
      roll: roll,
      target: betValue.target,
      mode: betValue.mode,
      multiplier: multiplier,
      winAmount: won ? parseFloat(data.betAmount) * multiplier : 0,
      won: won,
      balance,
      betTime: game.time,
    };
  } catch (error) {
    console.error('Bet error:', error);
    throw error;
  }
}
// Get recent bets
async function getRecentBets(data ) {
  try {
    const bets = await DiceHistory.find(data)
      .sort({ _id: -1 })
      .limit(10)
      .lean()
      .then((bets) =>
        Promise.all(
          bets.map(async (bet) => {
            return gameUtils.populateUser({
              ...bet,
              betId: bet.bet_id,
              betAmount: bet.bet_amount,
              currencyImage: bet.token_img,
              currencyName: bet.token,
              betTime: bet.time,
            });
          })
        )
      );
    return bets;
  } catch (error) {
    console.error('Recent bets error:', error);
    throw error;
  }
}

// Get game details
async function getGameDetails(betId) {
  try {
    let game = await DiceHistory.findOne({ bet_id: betId }).lean();
    
    if (!game) {
      throw new Error('Game not found!');
    }
  
    const seeds = await DiceEncrypt.findOne({ seed_id: game.seed_id });
    game = await gameUtils.populateUser(game);

    return {
      betLog: {
        betId: game.bet_id,
        betTime: game.time,
        name: game.name,
        avatar: game.avatar,
        userId: game.user_id,
        hidden: game.hidden,
        currencyName: game.token,
        currencyImage: game.token_img,
        roll: game.roll,
        target: game.target,
        mode: game.mode,
        multiplier: game.multiplier,
        profit: game.profit,
        won: game.won,
        betAmount: game.bet_amount,
        nonce: game.nonce || seeds.nonce,
      },
      seedHistory: {
        serverSeed: seeds.is_open ? seeds.server_seed : '',
        clientSeed: seeds.client_seed,
        serverSeedHash: seeds.hash_seed,
        nxt_hash: seeds.next_hash_seed,
        maxNonce: seeds.nonce,
      },
    };
  } catch (error) {
    console.error('Game details error:', error);
    throw error;
  }
}

// Update seeds
async function updateSeeds(userId, clientSeed) {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();

    const seeds = await DiceEncrypt.findOne({ is_open: false, user_id: userId })
      .sort({ _id: -1 })
      .session(session);
      
    if (!seeds) {
      throw new Error('Seeds not found. Play at least one game!');
    }

    if (!clientSeed) {
      throw new Error('Client Seed not found!');
    }

    const { next_server_seed: serverSeed, next_hash_seed: hashSeed } = seeds;

    // Mark current seed as open (revealed)
    await DiceEncrypt.updateOne(
      { seed_id: seeds.seed_id },
      { is_open: true }
    ).session(session);
    
    // Generate new next seed
    const nextServerSeed = gameUtils.generateServerSeed();
    const nextHashSeed = gameUtils.hashServerSeed(nextServerSeed);
    
    // Create new seed record
    await DiceEncrypt.create(
      [
        {
          server_seed: serverSeed,
          hash_seed: hashSeed,
          user_id: userId,
          client_seed: clientSeed,
          next_hash_seed: nextHashSeed,
          next_server_seed: nextServerSeed,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    await session.endSession();

    return {
      seeds: {
        serverSeed: seeds.server_seed,
        clientSeed: seeds.client_seed,
        serverSeedHash: seeds.hash_seed,
        maxNonce: seeds.nonce,
      },
    };
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    console.error('Update seeds error:', error);
    throw error;
  }
}

// Get user bets
async function getUserBets(userId) {
  try {
    return await getRecentBets({ user_id: userId });
  } catch (error) {
    console.error('User bets error:', error);
    throw error;
  }
}

// Get user seeds
async function getUserSeeds(userId) {
  try {
    const seeds = await DiceEncrypt.findOne({user_id:userId,
      is_open: false,
    }).sort({ _id: -1 });
    return seeds;
  } catch (error) {
    console.error('Error getting user seeds:', error);
    throw error;
  }
}

// Generate new seeds for a user
async function generateNewSeeds(userId) {
  try {
    const serverSeed = gameUtils.generateServerSeed();
    const hashSeed = gameUtils.hashServerSeed(serverSeed);
    const nextServerSeed = gameUtils.generateServerSeed();
    const nextHashSeed = gameUtils.hashServerSeed(nextServerSeed);
    const [seeds] = await DiceEncrypt.create([
      {
        server_seed: serverSeed,
        hash_seed: hashSeed,
        user_id: userId,
        client_seed: generateRandomString(10),
        next_hash_seed: nextHashSeed,
        next_server_seed: nextServerSeed,
        nonce: 0
      },
    ]);
    return seeds;
  } catch (error) {
    console.error('Error generating new seeds:', error);
    throw error;
  }
}

// Verify a roll
async function verifyRoll(clientSeed, serverSeed, nonce, roll) {
  try {
    const hash = gameLogic.generateHash(clientSeed, nonce, serverSeed);
    const calculatedRoll = gameLogic.generateDiceRoll(hash);
    
    return {
      verified: Math.abs(calculatedRoll - roll) < 0.01, // Allow for small floating point differences
      calculatedRoll,
      providedRoll: roll,
      hash
    };
  } catch (error) {
    console.error('Verify roll error:', error);
    throw error;
  }
}

module.exports = {
  handleBet,
  getRecentBets,
  getGameDetails,
  updateSeeds,
  getUserBets,
  getUserSeeds,
  generateNewSeeds,
  verifyRoll
}