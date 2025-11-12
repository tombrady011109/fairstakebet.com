const crypto = require('crypto');

class DiceGame {
  constructor(io) {
    this.io = io;
    this.gameUtils = require('./DiceGameUtils');
    this.gameLogic = require('./DiceGameLogic');
    this.gameHandlers = require('./DiceGameHandlers');
  }

  listen() {
    this.io.on('connection', (socket) => {
      socket.on('dice-init', async (data, callback) => {
        socket.join('dice-game');
        try {
          let result = await this.gameHandlers.getRecentBets();
          
          // Check if user data was provided
          if (data && data._id) {
            // Check if user has seeds
            const userSeeds = await this.gameHandlers.getUserSeeds(data._id);
            // If no seeds exist, generate new ones
            if (!userSeeds) {
              await this.gameHandlers.generateNewSeeds(data._id);
            }
            
            // Get the current seeds to return to the client
            const currentSeeds = await this.gameHandlers.getUserSeeds(data._id)
            callback({
              code: 0,
              data: {
                betLogs: result,
                seeds: currentSeeds ? {
                  clientSeed: currentSeeds.client_seed,
                  serverSeedHash: currentSeeds.hash_seed,
                  nonce: currentSeeds.nonce,
                  nextServerSeedHash: currentSeeds.next_hash_seed
                } : null
              }
            });
          } else {
            // No user data, just return bet logs
            callback({
              code: 0,
              data: {
                betLogs: result
              }
            });
          }
        } catch (error) {
          console.error('Dice init error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      socket.on('dice-bet', async (data, callback) => {
        if (!data._id) {
          callback({ code: -1, message: 'UserId Not found' });
          return;
        }
        
        try {
          // Check if user has seeds before placing bet
          const userSeeds = await this.gameHandlers.getUserSeeds(data._id);
          if (!userSeeds) {
            // Generate new seeds if none exist
            await this.gameHandlers.generateNewSeeds(data._id);
          }
          
          const bet = await this.gameHandlers.handleBet(data, (event, payload) => {
            this.io.to('dice-game').emit(event, payload);
          });
       
          this.io.to('dice-game').emit('diceBet', bet);

          callback({ code: 0, data: bet });
        } catch (error) {
          console.error('Bet error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      socket.on('dice-update-seeds', async (data, callback) => {
        if (!data.userId) {
          callback({ code: -1, message: 'UserId Not found' });
          return;
        }
        
        try {
          const result = await this.gameHandlers.updateSeeds(data._id, data.clientSeed);
          callback({ code: 0, data: result });
        } catch (error) {
          console.error('Update seeds error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      socket.on('dice-game-details', async (data, callback) => {
        if (!data.betId) {
          callback({ code: -1, message: 'Bet ID Not found' });
          return;
        }
        
        try {
          const result = await this.gameHandlers.getGameDetails(data.betId);
          callback({ code: 0, data: result });
        } catch (error) {
          console.error('Game details error:', error);
          callback({ code: -1, message: error.message });
        }
      });
      
      socket.on('dice-get-seeds', async (data, callback) => {
        if (!data._id) {
          callback({ code: -1, message: 'UserId Not found' });
          return;
        }
        
        try {
          const userSeeds = await this.gameHandlers.getUserSeeds(data._id);
          
          if (!userSeeds) {
            // Generate new seeds if none exist
            const newSeeds = await this.gameHandlers.generateNewSeeds(data._id);
            
            callback({ 
              code: 0, 
              data: {
                clientSeed: newSeeds.client_seed,
                serverSeedHash: newSeeds.hash_seed,
                nonce: newSeeds.nonce,
                nextServerSeedHash: newSeeds.next_hash_seed
              }
            });
          } else {
            callback({ 
              code: 0, 
              data: {
                clientSeed: userSeeds.client_seed,
                serverSeedHash: userSeeds.hash_seed,
                nonce: userSeeds.nonce,
                nextServerSeedHash: userSeeds.next_hash_seed
              }
            });
          }
        } catch (error) {
          console.error('Get seeds error:', error);
          callback({ code: -1, message: error.message });
        }
      });
    });
  }
}
module.exports = DiceGame;