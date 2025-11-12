
/**
 * Initialize the Mines game with Socket.IO
 * @param {Object} io - Socket.IO instance
 * @returns {MinesGameEngine} - The mines game engine instance
 */
const MinesGameEngineClass = require('./MinesGameEngine');

function initMinesGame(io) {
  const minesGameEngine = new MinesGameEngineClass(io);
  return minesGameEngine;
}

module.exports = { initMinesGame };
module.exports = { initMinesGame };