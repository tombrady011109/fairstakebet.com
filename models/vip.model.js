const mongoose = require('mongoose');

const VipTierSchema = new mongoose.Schema({
  name: { type: String, required: true },
  color: { type: String, required: true },
  wagerAmount: { type: String, required: true },
  icon: { type: mongoose.Schema.Types.Mixed, required: true },
  features: [{ type: String }],
  requiredWager: { type: Number, required: true }, // Actual wager amount required in numbers
  level: { type: Number, required: true } // Level number for this tier
});

const VipProgressSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    unique: true
  },
  currentWager: { type: Number, default: 0 },
  currentTier: { type: String, default: 'None' },
  nextTier: { type: String, default: 'Bronze' },
  progress: { type: Number, default: 0 }, // Percentage progress to next tier
  wagerToNextTier: { type: Number, default: 10000 }, // Amount needed to reach next tier
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const VipTier = mongoose.model('VipTier', VipTierSchema);
const VipProgress = mongoose.model('VipProgress', VipProgressSchema);

module.exports = { VipTier, VipProgress };