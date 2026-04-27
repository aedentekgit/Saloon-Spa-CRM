const express = require('express');
const router = express.Router();
const { generatePayroll } = require('../../controllers/finance/payrollController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.get('/', protect, requirePermission('payroll', 'finance'), generatePayroll);

module.exports = router;
