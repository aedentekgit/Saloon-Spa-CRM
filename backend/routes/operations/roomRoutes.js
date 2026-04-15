const express = require('express');
const router = express.Router();
const {
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
} = require('../../controllers/operations/roomController');
const { protect, manager } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.route('/')
  .get(getRooms)
  .post(protect, manager, upload.fields([{ name: 'image', maxCount: 1 }]), createRoom);

router.route('/:id')
  .put(protect, manager, upload.fields([{ name: 'image', maxCount: 1 }]), updateRoom)
  .delete(protect, manager, deleteRoom);

module.exports = router;
