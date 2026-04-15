const Settings = require('../../models/core/Settings');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { sendNotification } = require('../../utils/firebase');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private/Admin
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const { general, upload, theme, notifications, billing, smtp } = req.body;

    if (general) {
      settings.general = { ...settings.general, ...general };
      settings.markModified('general');
    }
    if (upload) {
      settings.upload = { ...settings.upload, ...upload };
      settings.markModified('upload');
    }
    if (theme) {
      settings.theme = { ...settings.theme, ...theme };
      settings.markModified('theme');
    }
    if (notifications) {
      settings.notifications = { ...settings.notifications, ...notifications };
      settings.markModified('notifications');
    }
    if (billing) {
      settings.billing = { ...settings.billing, ...billing };
      settings.markModified('billing');
    }
    if (smtp) {
      settings.smtp = { ...settings.smtp, ...smtp };
      settings.markModified('smtp');
    }

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload Logo
// @route   POST /api/settings/upload-logo
// @access  Private/Admin
exports.uploadLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    // The file path will depend on whether it's cloudinary or local
    // Multer-cloudinary adds 'path' or 'secure_url'
    // Delete old logo if it exists and is different
    if (settings.general.logo) {
      await deleteFile(settings.general.logo);
    }

    const logoUrl = req.file.path.startsWith('http') 
      ? req.file.path 
      : `uploads/${req.file.filename}`;
    
    settings.general.logo = logoUrl;
    settings.markModified('general');
    await settings.save();

    res.json({ logoUrl });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Send test notification
// @route   POST /api/settings/test-notification
// @access  Private/Admin
exports.sendTestNotification = async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (!settings || !settings.notifications.pushEnabled) {
      return res.status(400).json({ message: 'Push notifications are disabled' });
    }

    if (!settings.notifications.fcmToken) {
      return res.status(400).json({ message: 'No target FCM token set in notifications config' });
    }

    await sendNotification(
      settings.notifications.fcmToken,
      'Zen Spa Test',
      'The cosmic alignment is complete. Push notifications are active.',
      { type: 'test' }
    );
    
    res.json({ message: 'Notification delivered to the destination device.' });
  } catch (error) {
    res.status(500).json({ message: `FCM Error: ${error.message}` });
  }
};
