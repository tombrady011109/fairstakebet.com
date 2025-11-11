const { Server } = require("socket.io");
const Chat = require("../controllers/public_chat.controller.js");
const { CrashGameEngine } = require('../controllers/games/crash');
const { initMinesGame } = require('../controllers/games/mines');
const PlinkoGameSocket   = require('../controllers/games/plinko/PlinkoGame.js');
const DiceGameSocket = require("../controllers/games/dice/DiceGame.js")
const limboGame = require("../controllers/games/limbo/LimboGame.js")
const HiloGame = require("../controllers/games/hilo")

async function createsocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173","https://fairstakebet.com","https://www.fairstakebet.com","https://admin.fairstakebet.com"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });
  
  // Initialize chat controller
  const chat = new Chat(io);
  
  // // Initialize crash game manager with the main io instance
  // const crashGame = new CrashGameEngine(io).run();
  // Initialize the crash game
const crashGame = new CrashGameEngine(io);
crashGame.run((bet) => {
  // Handle bet callback if needed
  io.emit('new-bet', bet);
});
const minesGameEngine = initMinesGame(io);
const plinkoController = new PlinkoGameSocket(io);
const diceController = new DiceGameSocket(io);
const limboController = new limboGame(io);
const hiloController = new HiloGame(io);
diceController.listen()
limboController.listen()
plinkoController.listen()
hiloController.listen()

// global.gameEngines = {
//   mines: minesGameEngine,
//   plinko: plinkoController,
//   dice: diceController
//   // other games...
// };

  io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}

module.exports = { createsocket };
