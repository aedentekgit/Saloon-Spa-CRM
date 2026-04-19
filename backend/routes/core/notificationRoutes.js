const express = require('express');
const router = express.Router();
const { getNotifications, markAsRead, clearAll } = require('../../controllers/core/notificationController');
const { protect } = require('../../middleware/authMiddleware');

router.use(protect);

router.get('/', getNotifications);
router.patch('/:id', markAsRead);
router.delete('/', clearAll);

module.exports = router;
