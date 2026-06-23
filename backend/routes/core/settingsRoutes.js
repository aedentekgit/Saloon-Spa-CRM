const express = require('express');
const router = express.Router();
const {
  getSettings,
  getPublicSettings,
  updateSettings,
  uploadLogo,
  uploadFont,
  uploadFirebaseConfig,
  sendTestNotification,
  testEmailConnection
} = require('../../controllers/core/settingsController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.get('/public', getPublicSettings);
router.get('/', protect, requirePermission('settings'), getSettings);
router.put('/', protect, requirePermission('settings'), updateSettings);
router.post('/upload-logo', protect, requirePermission('settings'), upload.single('logo'), uploadLogo);
router.post('/upload-font', protect, requirePermission('settings'), upload.single('font'), uploadFont);
router.post('/upload-firebase-config', protect, requirePermission('settings'), upload.single('firebaseJSON'), uploadFirebaseConfig);
router.post('/test-notification', protect, requirePermission('settings'), sendTestNotification);
router.post('/test-email', protect, requirePermission('settings'), testEmailConnection);

module.exports = router;
