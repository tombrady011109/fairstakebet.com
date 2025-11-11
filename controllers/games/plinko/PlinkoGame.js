const utils = require('./plinkoGameUtils');
const handlers = require('./plinkoGameHandlers');
const { calculateProbabilities , PAYOUTS} = require('./plinkoLogic');

class PlinkoGame {
  constructor(io) {
    this.io = io;
    this.PAYOUTS = PAYOUTS;
    this.calculateProbabilities = calculateProbabilities;
  }

  listen() {
    this.io.on('connection', (socket) => {
      socket.on('plinko-init', async (_, callback) => {
        socket.join('plinko-game');
        try {
          const result = await handlers.getRecentBets();
          callback({
            code: 0,
            data: {
              betLogs: result,
            },
          });
        } catch (error) {
          callback({ code: -1, message: error.message });
        }
      });

      socket.on('plinko-bet', async (data, callback) => {
        if (!data._id) {
          callback({ code: -1, message: 'UserId Not found' });
          return;
        }
        try {
          const bet = await handlers.handleBet(
            data,
            (event, payload) => {
              this.io.to('plinko-game').emit(event, payload);
            },
            this.PAYOUTS,
            this.calculateProbabilities
          );
          this.io.to('plinko-game').emit('plinkoBet', bet);
          callback({ code: 0, data: bet });
        } catch (error) {
          callback({ code: -1, message: error.message });
        }
      });
    });
  }
}

module.exports = PlinkoGame;