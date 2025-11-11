const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  username: { type: String, required: true },
  firstName: { type: String },
  lastName: { type: String },
  country: { type: String },
  state: { type: String }, // Added state field
  place: { type: String },
  dateOfBirth: { type: Date },
  residentAddress: { type: String }, // For the address field from the form
  city: { type: String },
  postalCode: { type: String },
  balance: { type: Number, default: 0 },
  language: { type: String, default: 'English' },
  verificationCode: { type: String }, // 6-digit verification code
  verificationCodeExpires: { type: Date }, // Expiration time for the verification code
  is_verified: { type: Boolean, default: false }, // Account verification status
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCampaign: {
    type: String
  },
  commissionRate: { 
    type: Number, 
    default: 10 
  },
  current_level:{
    type: Number, 
    default: 0
  },
  
  // Fields for affiliate system
  affiliateCode: { type: String, unique: true }, // Unique affiliate code for this user
  referralCount: { type: Number, default: 0 }, // Number of users this user has referred
  referrals: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Array of users referred by this user
  // Additional fields for terms agreement
  agreeToTerms: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);