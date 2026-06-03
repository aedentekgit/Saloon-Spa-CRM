const express = require('express');
const router = express.Router();
const {
  generatePayroll,
  createPayrollRun,
  updatePayrollRow,
  approvePayrollRun,
  deletePayrollRun
} = require('../../controllers/finance/payrollController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.get('/', protect, requirePermission('payroll', 'finance'), generatePayroll);
router.post('/runs', protect, requirePermission('payroll', 'finance'), createPayrollRun);
router.patch('/runs/:id/rows/:employeeId', protect, requirePermission('payroll', 'finance'), updatePayrollRow);
router.patch('/runs/:id/approve', protect, requirePermission('payroll', 'finance'), approvePayrollRun);
router.delete('/runs/:id', protect, requirePermission('payroll', 'finance'), deletePayrollRun);

module.exports = router;
