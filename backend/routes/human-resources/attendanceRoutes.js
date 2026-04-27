const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  deleteAttendance,
  updateAttendance
} = require('../../controllers/human-resources/attendanceController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('attendance'), getAttendance)
  .post(protect, requirePermission('attendance'), markAttendance);

router.route('/:id')
  .put(protect, requirePermission('attendance'), updateAttendance)
  .delete(protect, requirePermission('attendance'), deleteAttendance);

module.exports = router;
