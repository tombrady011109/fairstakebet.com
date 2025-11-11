const express = require('express');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// Login route
router.post('/login', authController.login);

// Register route
router.post('/register', authController.register);

// Verify account route
router.post('/verify-account', authController.verifyAccount);

// Resend verification code route
router.post('/resend-code', authController.resendVerificationCode);

// Get user profile route (protected)
router.get('/profile', authMiddleware, authController.getUserProfile);

module.exports = router;