const mongoose = require('mongoose');

/**
 * Chat Message Schema
 * Stores messages sent in the chat system
 */
const chatSchema = new mongoose.Schema({
  // User who sent the message
  username: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  
  // Message content
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: [500, 'Message cannot exceed 500 characters']
  },
  
  // VIP level of the sender
  vipLevel: {
    type: Number,
    default: 0,
    min: 0,
    max: 10
  },
  
  // Message timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Chat room identifier
  room: {
    type: String,
    default: 'general',
    trim: true,
    index: true
  },
  
  // Optional user reference if we want to link to user model
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  
  // Message status (for moderation purposes)
  status: {
    type: String,
    enum: ['active', 'deleted', 'flagged'],
    default: 'active'
  },
  
  // If message was edited
  isEdited: {
    type: Boolean,
    default: false
  },
  
  // Optional metadata (can store additional info like client info)
  metadata: {
    type: Object,
    default: {}
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
chatSchema.index({ room: 1, timestamp: -1 });
chatSchema.index({ username: 1, timestamp: -1 });

// Virtual for time ago
chatSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const seconds = Math.floor((now - this.timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
});

// Static method to get recent messages for a room
chatSchema.statics.getRecentMessages = async function(room = 'general', limit = 50) {
  return this.find({ room, status: 'active' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Static method to get messages by user
chatSchema.statics.getMessagesByUser = async function(username, limit = 50) {
  return this.find({ username, status: 'active' })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

// Instance method to mark message as deleted
chatSchema.methods.markAsDeleted = async function() {
  this.status = 'deleted';
  return this.save();
};

// Pre-save middleware to sanitize content
chatSchema.pre('save', function(next) {
  // Basic sanitization - remove excessive whitespace
  if (this.content) {
    this.content = this.content.trim().replace(/\s+/g, ' ');
  }
  next();
});

const ChatModel = mongoose.model('Chat', chatSchema);

module.exports = ChatModel;