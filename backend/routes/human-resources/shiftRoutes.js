const express = require('express');
const router = express.Router();
const {
  getShifts,
  createShift,
  updateShift,
  deleteShift
} = require('../../controllers/human-resources/shiftController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, getShifts)
  .post(protect, createShift);

router.route('/:id')
  .put(protect, updateShift)
  .delete(protect, deleteShift);

module.exports = router;
