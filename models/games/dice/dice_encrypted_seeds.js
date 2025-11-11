const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const Schema = mongoose.Schema;

const diceEncryptedSeedsSchema = new Schema({
  seed_id: {
    type: String,
    default: () => uuidv4(),
    unique: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  server_seed: {
    type: String,
    required: true
  },
  hash_seed: {
    type: String,
    required: true
  },
  client_seed: {
    type: String,
    required: true
  },
  next_server_seed: {
    type: String,
    required: true
  },
  next_hash_seed: {
    type: String,
    required: true
  },
  nonce: {
    type: Number,
    default: 0
  },
  is_open: {
    type: Boolean,
    default: false
  },
  created_at: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DiceEncryptedSeeds', diceEncryptedSeedsSchema);