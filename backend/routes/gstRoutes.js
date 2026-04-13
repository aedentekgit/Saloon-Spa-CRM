const express = require('express');
const router = express.Router();
const { 
  getGSTRates, 
  createGSTRate, 
  updateGSTRate, 
  deleteGSTRate 
} = require('../controllers/gstController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getGSTRates)
  .post(protect, admin, createGSTRate);

router.route('/:id')
  .put(protect, admin, updateGSTRate)
  .delete(protect, admin, deleteGSTRate);

module.exports = router;
