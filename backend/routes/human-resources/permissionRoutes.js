const express = require('express');
const router = express.Router();
const {
  getPermissions,
  createPermission,
  updatePermissionStatus
} = require('../../controllers/human-resources/permissionController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('leave'), getPermissions) // Using leave permission as it's similar
  .post(protect, requirePermission('leave'), createPermission);

router.patch('/:id/status', protect, requirePermission('leave'), updatePermissionStatus);

module.exports = router;
