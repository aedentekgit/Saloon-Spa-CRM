const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../../controllers/finance/statsController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.get('/dashboard', protect, requirePermission('dashboard'), getDashboardStats);

module.exports = router;
