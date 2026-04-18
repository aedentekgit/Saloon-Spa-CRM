const Settings = require('../../models/core/Settings');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { sendNotification } = require('../../utils/firebase');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const buildPublicSettings = (settings) => ({
  general: {
    siteName: settings?.general?.siteName || 'Zen Spa & Saloon',
    logo: settings?.general?.logo || '',
    email: settings?.general?.email || 'contact@zenspa.com',
    address: settings?.general?.address || '123 Wellness St, City',
    contactNumber: settings?.general?.contactNumber || '+1234567890',
    country: settings?.general?.country || 'Qatar',
    dialingCode: settings?.general?.dialingCode || '+974',
    currencySymbol: settings?.general?.currencySymbol || 'QR'
  },
  theme: {
    primaryColor: settings?.theme?.primaryColor || '#2D1622',
    headingFont: settings?.theme?.headingFont || 'Italiana',
    bodyFont: settings?.theme?.bodyFont || 'Plus Jakarta Sans'
  }
});

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

// @desc    Get public settings
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    res.json(buildPublicSettings(settings));
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

// @desc    Upload Font (Zip or direct)
// @route   POST /api/settings/upload-font
// @access  Private/Admin
exports.uploadFont = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { type } = req.body; // 'heading' or 'body'
    if (!type) {
      return res.status(400).json({ message: 'Must specify font type (heading or body)' });
    }

    let filePath = req.file.path.replace(/\\/g, '/');
    let fontUrl = filePath.startsWith('http') ? filePath : `uploads/${req.file.filename}`;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    // If it's a zip file and local, extract it
    if (fileExt === '.zip' && !filePath.startsWith('http')) {
      const parentDir = path.dirname(filePath);
      const extractDir = path.join(parentDir, `extract_${Date.now()}`);
      fs.mkdirSync(extractDir, { recursive: true });
      
      try {
        execSync(`unzip -o "${filePath}" -d "${extractDir}"`);
        // Find first .ttf, .otf, .woff, .woff2
        const files = fs.readdirSync(extractDir);
        const fontFile = files.find(f => ['.ttf', '.otf', '.woff', '.woff2'].includes(path.extname(f).toLowerCase()));
        
        if (fontFile) {
          const extractedPath = path.join(extractDir, fontFile);
          const finalFilename = `${Date.now()}_${fontFile}`;
          const finalPath = path.join(parentDir, finalFilename);
          fs.renameSync(extractedPath, finalPath);
          fontUrl = `uploads/${finalFilename}`;
        }
        // Cleanup extraction dir and the original zip
        fs.rmSync(extractDir, { recursive: true, force: true });
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error("Unzip error:", err);
      }
    }

    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();

    if (type === 'heading') {
      settings.theme.headingFont = fontUrl;
    } else {
      settings.theme.bodyFont = fontUrl;
    }
    
    settings.markModified('theme');
    await settings.save();

    res.json({ fontUrl, type });
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
