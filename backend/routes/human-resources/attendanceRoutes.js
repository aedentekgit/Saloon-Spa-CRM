const express = require('express');
const router = express.Router();
const {
  getAttendance,
  markAttendance,
  deleteAttendance,
  updateAttendance
} = require('../../controllers/human-resources/attendanceController');
const { protect } = require('../../middleware/authMiddleware');

router.get('/public', getAttendance);

router.route('/')
  .get(protect, getAttendance)
  .post(protect, markAttendance);

router.route('/:id')
  .put(protect, updateAttendance)
  .delete(protect, deleteAttendance);

module.exports = router;
