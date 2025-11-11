const crypto = require('crypto');

class HiloGames {
  constructor(io) {
    this.io = io;
    this.gameUtils = require('./HiloGameUtils');
    this.gameLogic = require('./HiloGameLogic');
    this.gameHandlers = require('./HiloGameHandlers');
  }

  listen() {
    this.io.on('connection', (socket) => {
      // Initialize game
      socket.on('hilo-init', async (data, callback) => {
        socket.join('hilo-game');
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
            const currentSeeds = await this.gameHandlers.getUserSeeds(data._id);
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
            console.log("No user data, just returning bet logs");
            // No user data, just return bet logs
            callback({
              code: 0,
              data: {
                betLogs: result
              }
            });
          }
        } catch (error) {
          console.error('Hilo init error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      // Place a bet and start a new game
      socket.on('hilo-bet', async (data, callback) => {
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
            this.io.to('hilo-game').emit(event, payload);
          });
       
          this.io.to('hilo-game').emit('hiloBet', bet);

          callback({ code: 0, data: bet });
        } catch (error) {
          console.error('Bet error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      // Make a choice (higher or lower)
      socket.on('hilo-choice', async (data, callback) => {
        if (!data._id || !data.betId || !data.choice) {
          callback({ code: -1, message: 'Missing required data' });
          return;
        }
        
        try {
          const result = await this.gameHandlers.handleChoice(data, (event, payload) => {
            this.io.to('hilo-game').emit(event, payload);
          });
          
          callback({ code: 0, data: result });
        } catch (error) {
          console.error('Choice error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      // Cash out
      socket.on('hilo-cashout', async (data, callback) => {
        if (!data._id || !data.betId) {
          callback({ code: -1, message: 'Missing required data' });
          return;
        }
        
        try {
          const result = await this.gameHandlers.handleCashout(data, (event, payload) => {
            this.io.to('hilo-game').emit(event, payload);
          });
          
          callback({ code: 0, data: result });
        } catch (error) {
          console.error('Cashout error:', error);
          callback({ code: -1, message: error.message });
        }
      });

      // Update seeds
      socket.on('hilo-update-seeds', async (data, callback) => {
        if (!data._id) {
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

      // Get game details
      socket.on('hilo-game-details', async (data, callback) => {
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
      
      // Get user seeds
      socket.on('hilo-get-seeds', async (data, callback) => {
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

module.exports = HiloGames;