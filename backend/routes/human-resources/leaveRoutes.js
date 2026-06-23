const express = require('express');
const router = express.Router();
const {
  getLeaves,
  createLeave,
  updateLeaveStatus,
  deleteLeave
} = require('../../controllers/human-resources/leaveController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('leave'), getLeaves)
  .post(protect, requirePermission('leave'), createLeave);

router.route('/:id')
  .put(protect, requirePermission('leave'), updateLeaveStatus)
  .delete(protect, requirePermission('leave'), deleteLeave);

module.exports = router;
