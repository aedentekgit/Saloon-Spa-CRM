const express = require('express');
const router = express.Router();
const {
  getSettings,
  updateSettings,
  uploadLogo,
  sendTestNotification
} = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.post('/upload-logo', protect, upload.single('logo'), uploadLogo);
router.post('/test-notification', protect, sendTestNotification);

module.exports = router;
