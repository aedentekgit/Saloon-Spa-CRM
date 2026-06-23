const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  deleteExpense,
  updateExpense
} = require('../../controllers/finance/expenseController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('finance'), getExpenses)
  .post(protect, requirePermission('finance'), createExpense);

router.route('/:id')
  .patch(protect, requirePermission('finance'), updateExpense)
  .delete(protect, requirePermission('finance'), deleteExpense);

module.exports = router;
