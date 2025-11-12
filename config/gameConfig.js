module.exports = {
  plinko: {
    rows: 16, // Number of rows in the Plinko board
    pins: 16, // Number of pins in the last row
    multipliers: {
      low: [
        5.6, 2.1, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2.1, 5.6,
        2.1, 1.4, 1.1, 1.0, 0.5, 1.0, 1.1, 1.4, 2.1, 5.6
      ],
      medium: [
        13, 3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 13,
        3, 1.3, 0.7, 0.4, 0.4, 0.7, 1.3, 3, 13
      ],
      high: [
        110, 41, 10, 3, 1.3, 0.2, 0.2, 1.3, 3, 10, 41, 110,
        41, 10, 3, 1.3, 0.2, 0.2, 1.3, 3, 10, 41, 110
      ]
    },
    riskOptions: ['low', 'medium', 'high'],
    minBet: 0.1,
    maxBet: 1000,
    maxPayout: 10000 // Maximum payout allowed
  }
};