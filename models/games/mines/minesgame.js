const mongoose = require('mongoose');

const minesGameSchema = new mongoose.Schema({
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
    required: true,
    min: 1,
    max: 24
  },
  grid: {
    type: [Boolean],
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 25;
      },
      message: 'Grid must have exactly 25 elements'
    }
  },
  revealed_tiles: {
    type: [Number],
    default: []
  },
  revealed_count: {
    type: Number,
    default: 0
  },
  mine_positions: {
    type: [Number],
    default: []
  },
  current_multiplier: {
    type: Number,
    default: 1.0
  },
  payout: {
    type: Number,
    default: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  game_state: {
    type: String,
    enum: ['active', 'won', 'lost'],
    default: 'active'
  },
  won: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  completed_at: {
    type: Date,
    default: null
  }
});

// Create indexes for better query performance
minesGameSchema.index({ user_id: 1, created_at: -1 });
minesGameSchema.index({ game_id: 1 }, { unique: true });

const MinesGame = mongoose.model('MinesGame', minesGameSchema);

module.exports = MinesGame;