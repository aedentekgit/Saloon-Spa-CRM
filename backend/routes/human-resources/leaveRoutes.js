const express = require('express');
const router = express.Router();
const {
  getLeaves,
  createLeave,
  updateLeaveStatus,
  deleteLeave
} = require('../../controllers/human-resources/leaveController');
const { protect } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, getLeaves)
  .post(protect, createLeave);

router.route('/:id')
  .put(protect, updateLeaveStatus)
  .delete(protect, deleteLeave);

module.exports = router;
