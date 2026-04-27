const express = require('express');
const router = express.Router();
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../../controllers/operations/categoryController');
const { protect, admin, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('room-categories', 'service-categories', 'settings', 'services', 'rooms', 'inventory'), getCategories)
  .post(protect, admin, createCategory);

router.route('/:id')
  .put(protect, admin, updateCategory)
  .delete(protect, admin, deleteCategory);

module.exports = router;
