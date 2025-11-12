const {
  handleHiloBet,
  handleHiloNextRound,
  handleHiloCashout,
  initHiloGame,
} = require("./hilo.controller");

class HiloGames {
  constructor(io) {
    this.io = io;
  }

  listen() {
    this.io.on('connection', (socket) => {
      // Initialize game
      socket.on("hilo-init", (data, callback) => {
        socket.join('hilo-game');
        initHiloGame(data, (event, payload) => {
          this.io.to('hilo-game').emit(event, payload);
        })
        .then(response => {
          // Make sure to call the callback with the response
          if (typeof callback === 'function') {
            callback(response);
          }
        })
        .catch(error => {
          console.error("Error in hilo-init:", error);
          if (typeof callback === 'function') {
            callback({ code: 1, message: error.message || "Failed to initialize game" });
          }
        });
      });

      socket.on("hilo-bet", (data, callback) => {
        handleHiloBet(data, (event, payload) => {
          this.io.to('hilo-game').emit(event, payload);
        })
        .then(response => {
          // Make sure to call the callback with the response
          if (typeof callback === 'function') {
            callback(response);
          }
        })
        .catch(error => {
          console.error("Error in hilo-bet:", error);
          if (typeof callback === 'function') {
            callback({ code: 1, message: error.message || "Failed to place bet" });
          }
          // Also emit an error event to the client
          socket.emit("hilo-error", { message: error.message || "Failed to place bet" });
        });
      });

      socket.on("hilo-next-round", (data, callback) => {
        console.log("Received hilo-next-round request:", data);
        
        handleHiloNextRound(data, (event, payload) => {
          console.log(`Emitting ${event} with payload:`, payload);
          this.io.to('hilo-game').emit(event, payload);
        })
        .then(response => {
          console.log("hilo-next-round processed successfully:", response);
          // Make sure to call the callback with the response
          if (typeof callback === 'function') {
            callback(response);
          }
        })
        .catch(error => {
          console.error("Error in hilo-next-round:", error);
          if (typeof callback === 'function') {
            callback({ code: 1, message: error.message || "Failed to proceed to next round" });
          }
          // Also emit an error event to the client
          socket.emit("hilo-error", { message: error.message || "Failed to proceed to next round" });
        });
      });

      socket.on("hilo-cashout", (data, callback) => {
        handleHiloCashout(data, (event, payload) => {
          this.io.to('hilo-game').emit(event, payload);
        })
        .then(response => {
          // Make sure to call the callback with the response
          if (typeof callback === 'function') {
            callback(response);
          }
        })
        .catch(error => {
          console.error("Error in hilo-cashout:", error);
          if (typeof callback === 'function') {
            callback({ code: 1, message: error.message || "Failed to cash out" });
          }
          // Also emit an error event to the client
          socket.emit("hilo-error", { message: error.message || "Failed to cash out" });
        });
      });
    });
  }
}
module.exports = HiloGames;