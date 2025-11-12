const mongoose = require('mongoose');
const MinesGame = require('../../../models/games/mines/minesgame');
const MinesBet = require('../../../models/games/mines/minesbet');
const UserBalance = require('../../../models/user.model');
const Bills = require('../../../models/bill');
const crypto = require('crypto');
const MinesGameInstance = require('./MinesGameInstance');
const { handleError } = require('./utils');

class MinesGameEngine {
  constructor(io) {
    this.io = io;
    this.activeGames = new Map(); // Store active games by userId
    this.setupSocketListeners();
  }

  setupSocketListeners() {
    this.io.on('connection', (socket) => {
      // Join mines game room
      socket.on('mines-join', (data, callback) => {
        socket.join('mines-game');
        this.handleJoin(socket, data, callback);
      });

      // Start a new mines game
      socket.on('mines-start', async (data, callback) => {
        try {
          await this.handleStartGame(socket, data, callback);
        } catch (error) {
          handleError(error, callback, 'Failed to start game');
        }
      });

      // Reveal a tile
      socket.on('mines-reveal', async (data, callback) => {
        try {
          await this.handleRevealTile(socket, data, callback);
        } catch (error) {
          handleError(error, callback, 'Failed to reveal tile');
        }
      });

      // Cashout (end game)
      socket.on('mines-cashout', async (data, callback) => {
        try {
          await this.handleCashout(socket, data, callback);
        } catch (error) {
          handleError(error, callback, 'Failed to cashout');
        }
      });

      // Get game history
      socket.on('mines-history', async (data, callback) => {
        try {
          await this.handleGetHistory(socket, data, callback);
        } catch (error) {
          handleError(error, callback, 'Failed to get history');
        }
      });
    });
  }

  async handleJoin(socket, data, callback) {
    try {
      const { userId } = data;
      
      if (!userId) {
        return callback({ code: -1, message: 'User ID is required' });
      }

      // Check if user has an active game
      const activeGame = await this.getActiveGame(userId);
      
      if (activeGame) {
        // Return the active game state
        return callback({
          code: 0,
          data: {
            activeGame: {
              gameId: activeGame.gameId,
              betAmount: activeGame.betAmount,
              minesCount: activeGame.minesCount,
              grid: activeGame.clientGrid, // Only send revealed tiles to client
              revealedTiles: activeGame.revealedTiles, // Send the actual revealed tiles
              revealedCount: activeGame.revealedCount,
              potentialPayout: activeGame.getCurrentPayout(),
              gameState: activeGame.gameState,
              nextMultiplier: activeGame.getNextMultiplier()
            }
          }
        });
      }

      // Check if there's an active game in the database but not in memory
      const dbActiveGame = await MinesGame.findOne({ 
        user_id: userId, 
        game_state: 'active' 
      }).lean();

      if (dbActiveGame) {
        // Restore the game from the database
        const restoredGame = new MinesGameInstance(
          userId,
          dbActiveGame.game_id,
          dbActiveGame.bet_amount,
          dbActiveGame.mines_count
        );
        
        // Restore the game state
        restoredGame.grid = dbActiveGame.grid;
        restoredGame.revealedTiles = dbActiveGame.revealed_tiles || [];
        restoredGame.revealedCount = dbActiveGame.revealed_count || 0;
        restoredGame.gameState = dbActiveGame.game_state;
        
        // Add to active games
        this.activeGames.set(userId, restoredGame);
        
        // Return the restored game state
        return callback({
          code: 0,
          data: {
            activeGame: {
              gameId: restoredGame.gameId,
              betAmount: restoredGame.betAmount,
              minesCount: restoredGame.minesCount,
              grid: restoredGame.clientGrid,
              revealedTiles: restoredGame.revealedTiles,
              revealedCount: restoredGame.revealedCount,
              potentialPayout: restoredGame.getCurrentPayout(),
              gameState: restoredGame.gameState,
              nextMultiplier: restoredGame.getNextMultiplier()
            }
          }
        });
      }

      // Get user's recent games
      const recentGames = await MinesGame.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(10)
        .lean();

      callback({
        code: 0,
        data: {
          activeGame: null,
          recentGames: recentGames.map(game => ({
            gameId: game.game_id,
            betAmount: game.bet_amount,
            minesCount: game.mines_count,
            revealedCount: game.revealed_count,
            payout: game.payout,
            profit: game.profit,
            createdAt: game.created_at,
            completedAt: game.completed_at,
            won: game.won
          }))
        }
      });
    } catch (error) {
      handleError(error, callback, 'Failed to join game');
    }
  }

  async getActiveGame(userId) {
    // Check if there's an active game in memory
    return this.activeGames.get(userId);
  }

  async handleStartGame(socket, data, callback) {
    const { userId, betAmount, minesCount } = data;
    
    if (!userId) {
      return callback({ code: -1, message: 'User ID is required' });
    }
    
    if (!betAmount || betAmount <= 0) {
      return callback({ code: -1, message: 'Invalid bet amount' });
    }
    
    if (!minesCount || minesCount < 1 || minesCount > 24) {
      return callback({ code: -1, message: 'Invalid mines count (must be between 1 and 24)' });
    }
    
    try {
      // Check if user already has an active game in memory
      let activeGame = this.activeGames.get(userId);
      
      if (activeGame) {
        return callback({ 
          code: 0, 
          data: {
            gameId: activeGame.gameId,
            betAmount: activeGame.betAmount,
            minesCount: activeGame.minesCount,
            grid: activeGame.clientGrid,
            revealedTiles: activeGame.revealedTiles,
            revealedCount: activeGame.revealedCount,
            potentialPayout: activeGame.getCurrentPayout(),
            nextMultiplier: activeGame.getNextMultiplier(),
            message: 'Continuing existing game'
          }
        });
      }
      
      // Check if there's an active game in the database
      const dbActiveGame = await MinesGame.findOne({ 
        user_id: userId, 
        game_state: 'active' 
      }).lean();
      
      if (dbActiveGame) {
        // Restore the game from the database
        const restoredGame = new MinesGameInstance(
          userId,
          dbActiveGame.game_id,
          dbActiveGame.bet_amount,
          dbActiveGame.mines_count
        );
        
        // Restore the game state
        restoredGame.grid = dbActiveGame.grid;
        restoredGame.revealedTiles = dbActiveGame.revealed_tiles || [];
        restoredGame.revealedCount = dbActiveGame.revealed_count || 0;
        restoredGame.gameState = dbActiveGame.game_state;
        
        // Add to active games
        this.activeGames.set(userId, restoredGame);
        
        return callback({ 
          code: 0, 
          data: {
            gameId: restoredGame.gameId,
            betAmount: restoredGame.betAmount,
            minesCount: restoredGame.minesCount,
            grid: restoredGame.clientGrid,
            revealedTiles: restoredGame.revealedTiles,
            revealedCount: restoredGame.revealedCount,
            potentialPayout: restoredGame.getCurrentPayout(),
            nextMultiplier: restoredGame.getNextMultiplier(),
            message: 'Restored existing game'
          }
        });
      }
      
      // Check user balance
      const user = await UserBalance.findById(userId);
      
      if (!user) {
        return callback({ code: -1, message: 'User not found' });
      }
      
      if (user.balance < betAmount) {
        return callback({ code: -1, message: 'Insufficient balance' });
      }
      
      // Deduct bet amount from user balance
      await UserBalance.findByIdAndUpdate(
        userId,
        { $inc: { balance: -betAmount } }
      );
      
      // Create bill record for bet
      await Bills.create({
        user_id: userId,
        transaction_type: "Mines Game Bet",
        token_img: "/assets/token/usdt.png",
        token_name: "USDT",
        balance: betAmount,
        trx_amount: -betAmount,
        datetime: new Date(),
        status: false,
        bill_id: Math.floor(Math.random() * 100000000)
      });
      
      // Generate a new game
      const gameId = this.generateGameId();
      const game = new MinesGameInstance(userId, gameId, betAmount, minesCount);
      
      // Save to database
      await MinesGame.create({
        game_id: gameId,
        user_id: userId,
        bet_amount: betAmount,
        mines_count: minesCount,
        grid: game.grid,
        created_at: new Date(),
        game_state: 'active'
      });
      
      // Store in active games
      this.activeGames.set(userId, game);
      
      // Return game info to client
      callback({
        code: 0,
        data: {
          gameId: game.gameId,
          betAmount: game.betAmount,
          minesCount: game.minesCount,
          grid: game.clientGrid,
          revealedCount: 0,
          potentialPayout: game.getCurrentPayout(),
          nextMultiplier: game.getNextMultiplier()
        }
      });
      
      // Broadcast new game to all clients in the room
      socket.to('mines-game').emit('mines-new-game', {
        userId,
        gameId: game.gameId,
        betAmount: game.betAmount,
        minesCount: game.minesCount
      });
      
    } catch (error) {
      handleError(error, callback, 'Failed to start game');
    }
  }

  async handleRevealTile(socket, data, callback) {
    const { userId, position } = data;
    
    if (!userId) {
      return callback({ code: -1, message: 'User ID is required' });
    }
    
    if (position === undefined || position < 0 || position >= 25) {
      return callback({ code: -1, message: 'Invalid position' });
    }
    
    // Check if user has an active game
    const game = this.activeGames.get(userId);
    
    if (!game) {
      return callback({ code: -1, message: 'No active game found' });
    }
    
    try {
      // Reveal the tile
      const result = game.revealTile(position);
      
      // Update game in database
      await MinesGame.updateOne(
        { game_id: game.gameId },
        { 
          $set: {
            revealed_tiles: game.revealedTiles,
            revealed_count: game.revealedCount,
            current_multiplier: game.getCurrentMultiplier(),
            game_state: game.gameState
          }
        }
      );
      
      if (result.hitMine) {
        // Game over - user hit a mine
        await this.handleGameOver(userId, game, false);
        
        callback({
          code: 0,
          data: {
            hitMine: true,
            position,
            minePositions: game.getMinePositions(),
            gameOver: true,
            won: false,
            payout: 0
          }
        });
        
        // Broadcast game result to all clients in the room
        socket.to('mines-game').emit('mines-game-over', {
          userId,
          gameId: game.gameId,
          won: false,
          betAmount: game.betAmount,
          minesCount: game.minesCount
        });
        
      } else {
        // Successful reveal - gem found
        callback({
          code: 0,
          data: {
            hitMine: false,
            position,
            revealedCount: game.revealedCount,
            potentialPayout: game.getCurrentPayout(),
            nextMultiplier: game.getNextMultiplier()
          }
        });
        
        // Broadcast tile reveal to all clients in the room
        socket.to('mines-game').emit('mines-tile-revealed', {
          userId,
          gameId: game.gameId,
          position,
          revealedCount: game.revealedCount
        });
      }
      
    } catch (error) {
      handleError(error, callback, 'Failed to reveal tile');
    }
  }

  async handleCashout(socket, data, callback) {
    const { userId } = data;
    
    if (!userId) {
      return callback({ code: -1, message: 'User ID is required' });
    }
    
    // Check if user has an active game
    const game = this.activeGames.get(userId);
    
    if (!game) {
      return callback({ code: -1, message: 'No active game found' });
    }
    
    if (game.revealedCount === 0) {
      return callback({ code: -1, message: 'Cannot cashout without revealing any tiles' });
    }
    
    try {
      // Calculate payout
      const payout = game.getCurrentPayout();
      const profit = payout - game.betAmount;
      
      // Update user balance
      await UserBalance.findByIdAndUpdate(
        userId,
        { $inc: { balance: payout } }
      );
      
      // Create bill record for win
      await Bills.create({
        user_id: userId,
        transaction_type: "Mines Game Win",
        token_img: "/assets/token/usdt.png",
        token_name: "USDT",
        balance: game.betAmount,
        trx_amount: profit,
        datetime: new Date(),
        status: true,
        bill_id: Math.floor(Math.random() * 100000000)
      });
      
      // Handle successful game completion
      await this.handleGameOver(userId, game, true, payout, profit);
      
      // Return result to client
      callback({
        code: 0,
        data: {
          gameId: game.gameId,
          payout,
          profit,
          minePositions: game.getMinePositions(),
          multiplier: game.getCurrentMultiplier()
        }
      });
      
      // Broadcast cashout to all clients in the room
      socket.to('mines-game').emit('mines-cashout', {
        userId,
        gameId: game.gameId,
        payout,
        profit,
        revealedCount: game.revealedCount
      });
      
    } catch (error) {
      handleError(error, callback, 'Failed to cashout');
    }
  }

  async handleGameOver(userId, game, won, payout = 0, profit = 0) {
    try {
      // Update game in database
      await MinesGame.updateOne(
        { game_id: game.gameId },
        { 
          $set: {
            completed_at: new Date(),
            game_state: won ? 'won' : 'lost',
            payout: won ? payout : 0,
            profit: won ? profit : -game.betAmount,
            won,
            mine_positions: game.getMinePositions()
          }
        }
      );
      
      // Create bet record
      await MinesBet.create({
        game_id: game.gameId,
        user_id: userId,
        bet_amount: game.betAmount,
        mines_count: game.minesCount,
        revealed_count: game.revealedCount,
        payout: won ? payout : 0,
        profit: won ? profit : -game.betAmount,
        won,
        created_at: game.createdAt,
        completed_at: new Date()
      });
      
      // Remove from active games
      this.activeGames.delete(userId);
      
    } catch (error) {
      console.error('Error handling game over:', error);
    }
  }

  async handleGetHistory(socket, data, callback) {
    const { userId, limit = 10 } = data;
    
    if (!userId) {
      return callback({ code: -1, message: 'User ID is required' });
    }
    
    try {
      // Get user's recent games
      const recentGames = await MinesGame.find({ user_id: userId })
        .sort({ created_at: -1 })
        .limit(limit)
        .lean();
      
      callback({
        code: 0,
        data: {
          history: recentGames.map(game => ({
            gameId: game.game_id,
            betAmount: game.bet_amount,
            minesCount: game.mines_count,
            revealedCount: game.revealed_count,
            payout: game.payout,
            profit: game.profit,
            createdAt: game.created_at,
            completedAt: game.completed_at,
            won: game.won
          }))
        }
      });
      
    } catch (error) {
      handleError(error, callback, 'Failed to get history');
    }
  }

  generateGameId() {
    return crypto.randomBytes(16).toString('hex');
  }
}

module.exports = MinesGameEngine;