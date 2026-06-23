const express = require('express');
const router = express.Router();
const {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
} = require('../../controllers/inventory/inventoryController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.route('/')
  .get(protect, requirePermission('inventory'), getInventory)
  .post(protect, requirePermission('inventory'), upload.single('inventoryImage'), createInventoryItem);

router.route('/:id')
  .put(protect, requirePermission('inventory'), upload.single('inventoryImage'), updateInventoryItem)
  .delete(protect, requirePermission('inventory'), deleteInventoryItem);

module.exports = router;
