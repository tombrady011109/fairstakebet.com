const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateAdmin } = require('../middleware/auth');

router.get('/dashboard/stats', authenticateAdmin, adminController.getDashboardStats);

// ... other existing routes

module.exports = router;