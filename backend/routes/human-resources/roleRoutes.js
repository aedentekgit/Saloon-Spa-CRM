const express = require('express');
const router = express.Router();
const {
  getRoles,
  createRole,
  updateRole,
  deleteRole
} = require('../../controllers/human-resources/roleController');
const { protect, admin, requirePermission } = require('../../middleware/authMiddleware');

router.get('/', protect, requirePermission('roles'), getRoles);
router.post('/', protect, admin, createRole);
router.put('/:id', protect, admin, updateRole);
router.delete('/:id', protect, admin, deleteRole);

module.exports = router;
