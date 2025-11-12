const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const limboGameHistorySchema = new Schema({
  bet_id: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  seed_id: {
    type: String,
    required: true
  },
  bet_amount: {
    type: Number,
    required: true
  },
  token: {
    type: String,
    required: true
  },
  token_img: {
    type: String,
    required: true
  },
  roll: {
    type: Number,
    required: true
  },
  target: {
    type: Number,
    required: true
  },
  mode: {
    type: String,
    enum: ['over', 'under'],
    required: true
  },
  multiplier: {
    type: Number,
    required: true
  },
  won: {
    type: Boolean,
    required: true
  },
  profit: {
    type: Number,
    required: true
  },
  nonce: {
    type: Number,
    required: true
  },
  time: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('LimboGameHistory', limboGameHistorySchema);