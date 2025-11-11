const mongoose = require('mongoose');

const minesBetSchema = new mongoose.Schema({
  game_id: {
    type: String,
    required: true,
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bet_amount: {
    type: Number,
    required: true
  },
  mines_count: {
    type: Number,
    required: true
  },
  revealed_count: {
    type: Number,
    required: true
  },
  payout: {
    type: Number,
    required: true
  },
  profit: {
    type: Number,
    required: true
  },
  won: {
    type: Boolean,
    required: true
  },
  created_at: {
    type: Date,
    required: true
  },
  completed_at: {
    type: Date,
    required: true
  }
});

// Create indexes for better query performance
minesBetSchema.index({ user_id: 1, created_at: -1 });
minesBetSchema.index({ game_id: 1 }, { unique: true });

const MinesBet = mongoose.model('MinesBet', minesBetSchema);

module.exports = MinesBet;