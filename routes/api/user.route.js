const express = require('express');
const userController = require('../../controllers/user.controller');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

// Protected route - requires authentication
router.post('/update-details', authMiddleware, userController.updateUserDetails);

// Public route - no authentication required
router.get('/stats/:username', userController.getUserStatistics);
module.exports = router;