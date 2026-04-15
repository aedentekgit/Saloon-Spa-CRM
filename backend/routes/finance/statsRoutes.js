const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../../controllers/finance/statsController');
const { protect } = require('../../middleware/authMiddleware');

router.get('/dashboard', protect, getDashboardStats);

module.exports = router;
