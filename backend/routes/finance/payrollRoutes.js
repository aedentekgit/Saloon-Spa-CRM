const express = require('express');
const router = express.Router();
const { generatePayroll } = require('../../controllers/finance/payrollController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.get('/', protect, admin, generatePayroll);

module.exports = router;
