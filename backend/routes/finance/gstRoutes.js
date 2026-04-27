const express = require('express');
const router = express.Router();
const { 
  getGSTRates, 
  createGSTRate, 
  updateGSTRate, 
  deleteGSTRate 
} = require('../../controllers/finance/gstController');
const { protect, admin, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('billing', 'settings'), getGSTRates)
  .post(protect, admin, createGSTRate);

router.route('/:id')
  .put(protect, admin, updateGSTRate)
  .delete(protect, admin, deleteGSTRate);

module.exports = router;
