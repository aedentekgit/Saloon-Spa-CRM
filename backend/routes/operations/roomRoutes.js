const express = require('express');
const router = express.Router();
const {
  getPublicRooms,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../../controllers/operations/roomController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.route('/public')
  .get(getPublicRooms);

router.route('/')
  .get(protect, requirePermission('rooms', 'appointments', 'book'), getRooms)
  .post(protect, requirePermission('rooms'), upload.fields([{ name: 'image', maxCount: 1 }]), createRoom);

router.route('/:id')
  .put(protect, requirePermission('rooms'), upload.fields([{ name: 'image', maxCount: 1 }]), updateRoom)
  .delete(protect, requirePermission('rooms'), deleteRoom);

module.exports = router;
