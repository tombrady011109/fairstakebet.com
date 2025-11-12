const { calculateMultiplier } = require('./payoutCalculator');

class MinesGameInstance {
  constructor(userId, gameId, betAmount, minesCount) {
    this.userId = userId;
    this.gameId = gameId;
    this.betAmount = betAmount;
    this.minesCount = minesCount;
    this.grid = this.generateGrid();
    this.clientGrid = Array(25).fill(null); // What the client sees (null = unrevealed)
    this.revealedTiles = []; // Positions of revealed tiles
    this.revealedCount = 0;
    this.gameState = 'active'; // active, won, lost
    this.createdAt = new Date();
  }

  /**
   * Generate a 5x5 grid with mines and gems
   * @returns {Array} - 25-element array where true = mine, false = gem
   */
  generateGrid() {
    // Create array of 25 elements (all gems initially)
    const grid = Array(25).fill(false);
    
    // Place mines randomly
    let minesPlaced = 0;
    while (minesPlaced < this.minesCount) {
      const position = Math.floor(Math.random() * 25);
      if (!grid[position]) {
        grid[position] = true; // true = mine
        minesPlaced++;
      }
    }
    
    return grid;
  }

  /**
   * Reveal a tile at the specified position
   * @param {number} position - Position to reveal (0-24)
   * @returns {Object} - Result of the reveal operation
   */
  revealTile(position) {
    // Check if position is valid
    if (position < 0 || position >= 25) {
      throw new Error('Invalid position');
    }
    
    // Check if tile is already revealed
    if (this.revealedTiles.includes(position)) {
      throw new Error('Tile already revealed');
    }
    
    // Check if game is still active
    if (this.gameState !== 'active') {
      throw new Error('Game is not active');
    }
    
    // Reveal the tile
    const isMine = this.grid[position];
    this.revealedTiles.push(position);
    this.revealedCount++;
    
    // Update client grid
    this.clientGrid[position] = isMine ? 'mine' : 'gem';
    
    if (isMine) {
      // Hit a mine - game over
      this.gameState = 'lost';
      return { hitMine: true, position };
    } else {
      // Found a gem
      // Check if all gems have been revealed (win condition)
      const totalGems = 25 - this.minesCount;
      if (this.revealedCount === totalGems) {
        this.gameState = 'won';
      }
      
      return { hitMine: false, position };
    }
  }

  /**
   * Get the current multiplier based on revealed tiles
   * @returns {number} - Current multiplier
   */
  getCurrentMultiplier() {
    return calculateMultiplier(this.minesCount, this.revealedCount);
  }

  /**
   * Get the next multiplier (if another gem is revealed)
   * @returns {number} - Next potential multiplier
   */
  getNextMultiplier() {
    return calculateMultiplier(this.minesCount, this.revealedCount + 1);
  }

  /**
   * Calculate the current potential payout
   * @returns {number} - Current potential payout
   */
  getCurrentPayout() {
    return this.betAmount * this.getCurrentMultiplier();
  }

  /**
   * Get positions of all mines in the grid
   * @returns {Array} - Array of positions (0-24) where mines are located
   */
  getMinePositions() {
    return this.grid.map((isMine, index) => isMine ? index : -1).filter(pos => pos !== -1);
  }

  /**
   * Get positions of all gems in the grid
   * @returns {Array} - Array of positions (0-24) where gems are located
   */
  getGemPositions() {
    return this.grid.map((isMine, index) => !isMine ? index : -1).filter(pos => pos !== -1);
  }

  /**
   * Get the number of remaining gems (not yet revealed)
   * @returns {number} - Count of remaining gems
   */
  getRemainingGems() {
    const totalGems = 25 - this.minesCount;
    return totalGems - this.revealedCount;
  }

  /**
   * Check if a specific position contains a mine
   * @param {number} position - Position to check (0-24)
   * @returns {boolean} - True if position contains a mine
   */
  isMine(position) {
    if (position < 0 || position >= 25) {
      throw new Error('Invalid position');
    }
    return this.grid[position];
  }

  /**
   * Get game state information
   * @returns {Object} - Current game state
   */
  getGameState() {
    return {
      gameId: this.gameId,
      betAmount: this.betAmount,
      minesCount: this.minesCount,
      revealedCount: this.revealedCount,
      clientGrid: this.clientGrid,
      gameState: this.gameState,
      currentMultiplier: this.getCurrentMultiplier(),
      potentialPayout: this.getCurrentPayout()
    };
  }
}

module.exports = MinesGameInstance;