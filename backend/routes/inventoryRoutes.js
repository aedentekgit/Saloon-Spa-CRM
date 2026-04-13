const express = require('express');
const router = express.Router();
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.route('/')
  .get(protect, getInventory)
  .post(protect, upload.single('inventoryImage'), createInventoryItem);

router.route('/:id')
  .put(protect, upload.single('inventoryImage'), updateInventoryItem)
  .delete(protect, deleteInventoryItem);

module.exports = router;
