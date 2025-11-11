const Profile = require('../models/user.model');
const PublicChat = require('../models/chat.model');

const chatController = {
  banUser: async (req, res) => {
    try {
      const { username } = req.body;
      
      const user = await Profile.findOne({ username });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      await Profile.findOneAndUpdate(
        { username },
        { $set: { chatBanned: true, chatBanDate: new Date() } }
      );

      res.status(200).json({
        success: true,
        message: 'User banned from chat successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error banning user from chat',
        error: error.message
      });
    }
  },

  getChatStats: async (req, res) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await PublicChat.findOne({
        date: {
          $gte: today
        }
      });

      const bannedUsers = await Profile.countDocuments({ chatBanned: true });
      const activeUsers = await Profile.countDocuments({ 
        lastChatActivity: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // active in last 15 minutes
      });

      res.status(200).json({
        success: true,
        data: {
          totalMessages: stats?.messageCount || 0,
          activeUsers,
          bannedUsers
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching chat stats',
        error: error.message
      });
    }
  },

  getChatHistory: async (req, res) => {
    try {
      const hours = parseInt(req.query.hours) || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);

      const chatHistory = await PublicChat.aggregate([
        {
          $match: {
            time: { $gte: since }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d %H:00:00",
                date: "$time"
              }
            },
            messageCount: { $sum: 1 }
          }
        },
        {
          $sort: { "_id": 1 }
        },
        {
          $project: {
            _id: 0,
            timestamp: "$_id",
            messageCount: 1
          }
        }
      ]);

      res.status(200).json({
        success: true,
        data: chatHistory
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error fetching chat history',
        error: error.message
      });
    }
  }
};

module.exports = chatController;
