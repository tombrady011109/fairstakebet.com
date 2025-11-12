/**
 * Calculate the multiplier for a mines game based on mines count and revealed tiles
 * @param {number} minesCount - Number of mines in the game (1-24)
 * @param {number} revealedCount - Number of revealed tiles (gems)
 * @returns {number} - The multiplier for the current game state
 */
function calculateMultiplier(minesCount, revealedCount) {
  if (revealedCount === 0) return 1.0;
  
  const totalTiles = 25;
  const totalGems = totalTiles - minesCount;
  
  // Base formula: (totalTiles / (totalTiles - minesCount)) ^ revealedCount
  // This accounts for the house edge
  const houseEdge = 0.01; // 1% house edge
  const fairMultiplier = Math.pow(totalTiles / totalGems, revealedCount);
  const multiplier = fairMultiplier * (1 - houseEdge);
  
  // Round to 2 decimal places
  return Math.round(multiplier * 100) / 100;
}

/**
 * Get a table of multipliers for different mine counts and reveal counts
 * @returns {Object} - Table of multipliers
 */
function getMultiplierTable() {
  const table = {};
  
  for (let mines = 1; mines <= 24; mines++) {
    table[mines] = {};
    const totalGems = 25 - mines;
    
    for (let revealed = 1; revealed <= totalGems; revealed++) {
      table[mines][revealed] = calculateMultiplier(mines, revealed);
    }
  }
  
  return table;
}

module.exports = {
  calculateMultiplier,
  getMultiplierTable
};