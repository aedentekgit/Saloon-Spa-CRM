const express = require('express');
const router = express.Router();
const {
  getShifts,
  createShift,
  updateShift,
  deleteShift
} = require('../../controllers/human-resources/shiftController');
const { protect, admin, requirePermission } = require('../../middleware/authMiddleware');

router.route('/public')
  .get(getShifts);

router.route('/')
  .get(protect, requirePermission('shifts', 'attendance', 'appointments', 'settings'), getShifts)
  .post(protect, admin, createShift);

router.route('/:id')
  .put(protect, admin, updateShift)
  .delete(protect, admin, deleteShift);

module.exports = router;
