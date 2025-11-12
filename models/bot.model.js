const mongoose = require('mongoose');

const BotSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  avatar: { type: String },
  balance: { type: Number, default: 10000 },
  affiliateCode: { type: String, unique: true },
  isBot: { type: Boolean, default: true },
  agreeToTerms: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Bot', BotSchema);