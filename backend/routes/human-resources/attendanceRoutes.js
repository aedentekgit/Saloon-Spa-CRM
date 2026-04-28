const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  deleteAttendance,
  updateAttendance,
  checkIn,
  checkOut,
  backfillAbsent
} = require('../../controllers/human-resources/attendanceController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('attendance'), getAttendance)
  .post(protect, requirePermission('attendance'), markAttendance);

router.post('/check-in', protect, requirePermission('attendance'), checkIn);
router.post('/check-out', protect, requirePermission('attendance'), checkOut);
router.post('/backfill', protect, backfillAbsent);

router.route('/:id')
  .put(protect, requirePermission('attendance'), updateAttendance)
  .delete(protect, requirePermission('attendance'), deleteAttendance);

module.exports = router;
