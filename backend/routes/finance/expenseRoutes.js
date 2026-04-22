const express = require('express');
const router = express.Router();
const {
  getExpenses,
  createExpense,
  deleteExpense,
  updateExpense
} = require('../../controllers/finance/expenseController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, getExpenses)
  .post(protect, createExpense);

router.route('/:id')
  .patch(protect, updateExpense)
  .delete(protect, deleteExpense);

module.exports = router;
