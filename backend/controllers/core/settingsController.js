const Settings = require('../../models/core/Settings');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { sendNotification } = require('../../utils/firebase');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { encrypt } = require('../../utils/secretCrypto');

const SECRET_MASK = '********';

const isSecretValueSet = (value) => {
  if (!value) return false;
  if (typeof value !== 'string') return true;
  return value.length > 0;
};

const maskIfSet = (value) => (isSecretValueSet(value) ? SECRET_MASK : '');

const sanitizeSettingsForResponse = (settingsDoc) => {
  const settings = settingsDoc?.toObject ? settingsDoc.toObject() : settingsDoc;
  if (!settings) return settings;

  return {
    ...settings,
    upload: {
      ...settings.upload,
      cloudinaryApiSecret: maskIfSet(settings.upload?.cloudinaryApiSecret)
    },
    notifications: {
      ...settings.notifications,
      firebasePrivateKey: maskIfSet(settings.notifications?.firebasePrivateKey),
      firebaseServiceAccount: maskIfSet(settings.notifications?.firebaseServiceAccount)
    },
    smtp: {
      ...settings.smtp,
      password: maskIfSet(settings.smtp?.password)
    },
    whatsapp: {
      ...settings.whatsapp,
      token: maskIfSet(settings.whatsapp?.token)
    }
  };
};

const buildPublicSettings = (settings) => ({
  general: {
    siteName: settings?.general?.siteName || 'Zen Spa & Saloon',
    logo: settings?.general?.logo || '',
    email: settings?.general?.email || 'contact@zenspa.com',
    address: settings?.general?.address || '123 Wellness St, City',
    contactNumber: settings?.general?.contactNumber || '+1234567890',
    country: settings?.general?.country || 'Qatar',
    countryIso: settings?.general?.countryIso || 'QA',
    currency: settings?.general?.currency || 'QAR',
    dialingCode: settings?.general?.dialingCode || '+974',
    currencySymbol: settings?.general?.currencySymbol || 'QR',
    dateTimeFormat: settings?.general?.dateTimeFormat || 'DD/MM/YYYY hh:mm A'
  },
  theme: {
    primaryColor: settings?.theme?.primaryColor || '#2D1622',
    headingFont: settings?.theme?.headingFont || 'Italiana',
    bodyFont: settings?.theme?.bodyFont || 'Plus Jakarta Sans'
  },
  upload: {
    provider: settings?.upload?.provider || 'local'
  },
  billing: {
    gstEnabled: Boolean(settings?.billing?.gstEnabled)
  },
  workingHours: settings?.workingHours || {
    monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    friday: { isOpen: true, openTime: '14:00', closeTime: '23:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '21:00' }
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
    res.json(sanitizeSettingsForResponse(settings));
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

    const { general, upload, theme, notifications, billing, smtp, payroll, whatsapp, workingHours } = req.body;

    if (general) {
      settings.general = { ...settings.general, ...general };
      settings.markModified('general');
    }
    if (upload) {
      const merged = { ...settings.upload, ...upload };
      if (Object.prototype.hasOwnProperty.call(upload, 'cloudinaryApiSecret')) {
        if (upload.cloudinaryApiSecret === SECRET_MASK) {
          merged.cloudinaryApiSecret = settings.upload?.cloudinaryApiSecret;
        } else {
          merged.cloudinaryApiSecret = encrypt(upload.cloudinaryApiSecret);
        }
      }
      settings.upload = merged;
      settings.markModified('upload');
    }
    if (theme) {
      settings.theme = { ...settings.theme, ...theme };
      settings.markModified('theme');
    }
    if (notifications) {
      const merged = { ...settings.notifications, ...notifications };
      if (Object.prototype.hasOwnProperty.call(notifications, 'firebasePrivateKey')) {
        if (notifications.firebasePrivateKey === SECRET_MASK) {
          merged.firebasePrivateKey = settings.notifications?.firebasePrivateKey;
        } else {
          merged.firebasePrivateKey = encrypt(notifications.firebasePrivateKey);
        }
      }
      if (Object.prototype.hasOwnProperty.call(notifications, 'firebaseServiceAccount')) {
        if (notifications.firebaseServiceAccount === SECRET_MASK) {
          merged.firebaseServiceAccount = settings.notifications?.firebaseServiceAccount;
        } else {
          merged.firebaseServiceAccount = encrypt(notifications.firebaseServiceAccount);
        }
      }
      settings.notifications = merged;
      settings.markModified('notifications');
    }
    if (billing) {
      settings.billing = { ...settings.billing, ...billing };
      settings.markModified('billing');
    }
    if (smtp) {
      const merged = { ...settings.smtp, ...smtp };
      if (Object.prototype.hasOwnProperty.call(smtp, 'password')) {
        if (smtp.password === SECRET_MASK) {
          merged.password = settings.smtp?.password;
        } else {
          merged.password = encrypt(smtp.password);
        }
      }
      settings.smtp = merged;
      settings.markModified('smtp');
    }
    if (whatsapp) {
      const merged = { ...settings.whatsapp, ...whatsapp };
      if (Object.prototype.hasOwnProperty.call(whatsapp, 'token')) {
        if (whatsapp.token === SECRET_MASK) {
          merged.token = settings.whatsapp?.token;
        } else {
          merged.token = encrypt(whatsapp.token);
        }
      }
      settings.whatsapp = merged;
      settings.markModified('whatsapp');
    }
    if (payroll) {
      settings.payroll = { ...settings.payroll, ...payroll };
      settings.markModified('payroll');
    }
    if (workingHours) {
      settings.workingHours = { ...settings.workingHours, ...workingHours };
      settings.markModified('workingHours');
    }

    const updatedSettings = await settings.save();
    res.json(sanitizeSettingsForResponse(updatedSettings));
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

    const logoUrl = getStoredFilePath(req.file);
    
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
    let fontUrl = getStoredFilePath(req.file);
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
    const { token } = req.body;
    const settings = await Settings.findOne();
    
    if (!settings || !settings.notifications.pushEnabled) {
      return res.status(400).json({ message: 'Push notifications are disabled in system configuration.' });
    }

    const targetToken = token || settings.notifications.fcmToken;
    
    if (!targetToken) {
      return res.status(400).json({ message: 'No target device token provided or set in configuration.' });
    }

    await sendNotification(
      targetToken,
      'Sanctuary Gateway Test',
      'The cosmic alignment is complete. Push notifications are active and synchronized.',
      { type: 'test' }
    );
    
    res.json({ message: 'Notification delivered to the destination device.' });
  } catch (error) {
    res.status(500).json({ message: `FCM Error: ${error.message}` });
  }
};

// @desc    Test SMTP connection
// @route   POST /api/settings/test-email
// @access  Private/Admin
exports.testEmailConnection = async (req, res) => {
  const { host, port, user, password, fromName, fromEmail, encryption, targetEmail } = req.body;

  if (!host || !user || !password) {
    return res.status(400).json({ message: 'Required SMTP credentials (host, user, password) are missing for the test.' });
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port) || 587,
      secure: encryption === 'ssl' || parseInt(port) === 465,
      auth: {
        user,
        pass: password
      },
      timeout: 10000 // 10 seconds timeout for test
    });

    // Verify connection configuration
    await transporter.verify();

    // Send test email
    const info = await transporter.sendMail({
      from: `${fromName || 'Sanctuary Gateway'} <${fromEmail || user}>`,
      to: targetEmail || user,
      subject: 'Sanctuary SMTP Connection Test',
      text: 'Greetings. This is a synchronization test from your Saloon & Spa CRM. Your SMTP gateway is now perfectly aligned and operational.'
    });

    res.json({ message: `Success! Test email dispatched to ${targetEmail || user}.` });

  } catch (error) {
    console.error('SMTP Test Error:', error);
    res.status(500).json({ message: `SMTP Failure: ${error.message}` });
  }
};

// @desc    Upload & Parse Firebase JSON
// @route   POST /api/settings/upload-firebase-config
// @access  Private/Admin
exports.uploadFirebaseConfig = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let configData;
    if (req.file.path.startsWith('http')) {
      const axios = require('axios');
      const response = await axios.get(req.file.path);
      configData = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    } else {
      configData = fs.readFileSync(req.file.path, 'utf8');
    }

    let config;
    try {
      config = JSON.parse(configData);
    } catch (e) {
      // Handle nested JSON strings if encountered
      config = JSON.parse(JSON.parse(configData));
    }

    // Validation: Check if this is a Web Config instead of a Service Account
    if (!config.private_key && (config.apiKey || config.appId)) {
      return res.status(400).json({ 
        message: 'Invalid File Type: You uploaded a Firebase Web SDK Config. Please upload the "Service Account Private Key" JSON generated from the Firebase Console (Settings -> Service Accounts).' 
      });
    }

    const mappedConfig = {
      firebaseProjectId: config.project_id || '',
      firebaseClientEmail: config.client_email || '',
      firebasePrivateKey: config.private_key || ''
    };

    if (!mappedConfig.firebasePrivateKey) {
      return res.status(400).json({ message: 'Parse Error: No private_key found in the provided JSON. Ensure you generated a Service Account token.' });
    }

    // Cleanup local file
    if (!req.file.path.startsWith('http') && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    // Persist settings securely
    let settings = await Settings.findOne();
    if (!settings) settings = new Settings();
    settings.notifications = {
      ...settings.notifications,
      firebaseProjectId: mappedConfig.firebaseProjectId,
      firebaseClientEmail: mappedConfig.firebaseClientEmail,
      firebasePrivateKey: encrypt(mappedConfig.firebasePrivateKey)
    };
    settings.markModified('notifications');
    await settings.save();

    res.json({ 
      message: 'Service credentials synchronized successfully.', 
      config: {
        firebaseProjectId: mappedConfig.firebaseProjectId,
        firebaseClientEmail: mappedConfig.firebaseClientEmail,
        firebasePrivateKey: SECRET_MASK
      }
    });
  } catch (error) {
    if (req.file && !req.file.path.startsWith('http') && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Firebase Config Parse Error:', error);
    res.status(500).json({ message: `Relay Error: ${error.message}` });
  }
};
