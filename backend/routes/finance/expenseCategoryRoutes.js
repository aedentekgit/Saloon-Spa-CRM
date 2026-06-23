const express = require('express');
const router = express.Router();
const {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} = require('../../controllers/finance/expenseCategoryController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, getExpenseCategories)
  .post(protect, admin, createExpenseCategory);

router.route('/:id')
  .patch(protect, admin, updateExpenseCategory)
  .delete(protect, admin, deleteExpenseCategory);

module.exports = router;
