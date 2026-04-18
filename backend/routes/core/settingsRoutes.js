const express = require('express');
const router = express.Router();
const {
  getSettings,
  getPublicSettings,
  updateSettings,
  uploadLogo,
  uploadFont,
  sendTestNotification
} = require('../../controllers/core/settingsController');
const { protect } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.get('/public', getPublicSettings);
router.get('/', protect, getSettings);
router.put('/', protect, updateSettings);
router.post('/upload-logo', protect, upload.single('logo'), uploadLogo);
router.post('/upload-font', protect, upload.single('font'), uploadFont);
router.post('/test-notification', protect, sendTestNotification);

module.exports = router;
