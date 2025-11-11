const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PlinkoGameSchema = new Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  bet_amount: {
    type: Number,
    required: true,
    min: 0
  },
  risk_level: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  client_seed: {
    type: String,
    required: true
  },
  server_seed: {
    type: String,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  },
  hash: {
    type: String,
    required: true
  },
  path: {
    type: [Number],
    required: true
  },
  multiplier: {
    type: Number,
    required: true
  },
  payout: {
    type: Number,
    required: true
  },
  created_at: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Create compound indexes for efficient queries
PlinkoGameSchema.index({ user_id: 1, created_at: -1 });
PlinkoGameSchema.index({ multiplier: -1 });

// Virtual for profit calculation
PlinkoGameSchema.virtual('profit').get(function() {
  return this.payout - this.bet_amount;
});

// Configure the schema to include virtuals when converting to JSON
PlinkoGameSchema.set('toJSON', { virtuals: true });
PlinkoGameSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('PlinkoGame', PlinkoGameSchema);