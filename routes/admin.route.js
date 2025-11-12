const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const chatController = require('../controllers/chat.controller');
const adminAuth = require('../middleware/adminAuth');

// Admin auth routes
router.post('/login', adminController.login);

// Protected admin routes
router.get('/users', adminAuth, adminController.getUsers);
router.get('/users/:userId', adminAuth, adminController.getUserDetails);
router.patch('/users/:userId/status', adminAuth, adminController.updateUserStatus);
router.put('/users/:userId', adminAuth, adminController.updateUser);

// Chat management routes
router.post('/chat/ban', adminAuth, chatController.banUser);
router.get('/chat/stats', adminAuth, chatController.getChatStats);
router.get('/chat/history', adminAuth, chatController.getChatHistory);
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/highest-wins', adminAuth, adminController.getHighestWins);
module.exports = router;


