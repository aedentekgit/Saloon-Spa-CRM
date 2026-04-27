const multer = require('multer');
const cloudinaryModule = require('cloudinary');
const cloudinary = cloudinaryModule.v2;
const cloudinaryStorageModule = require('multer-storage-cloudinary');
const CloudinaryStorage = cloudinaryStorageModule?.CloudinaryStorage || cloudinaryStorageModule;
const path = require('path');
const fs = require('fs');
const Settings = require('../models/core/Settings');
const { decrypt } = require('../utils/secretCrypto');

const MAX_UPLOAD_SIZE_BYTES = Number.parseInt(process.env.MAX_UPLOAD_SIZE_BYTES || '', 10) || (10 * 1024 * 1024); // 10MB default
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Fonts
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/font-woff',
  'application/font-woff2',
  // JSON & Archives
  'application/json',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  // Spreadsheets
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv'
]);

const DEFAULT_UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
const resolveUploadDir = () => {
  const configured = (process.env.UPLOAD_DIR || '').trim();
  if (!configured) return DEFAULT_UPLOAD_DIR;
  return path.isAbsolute(configured) ? configured : path.join(__dirname, '..', configured);
};

const normalizeSlashes = (value = '') => String(value).replace(/\\/g, '/');

const getStoredFilePath = (file) => {
  if (!file) return '';

  const url = file.secure_url || file.url || file.path;
  if (typeof url === 'string' && /^https?:\/\//i.test(url)) {
    return url;
  }

  if (file.filename) {
    return `uploads/${path.basename(file.filename)}`;
  }

  if (file.path) {
    const normalizedPath = normalizeSlashes(file.path);
    const normalizedUploadDir = normalizeSlashes(resolveUploadDir()).replace(/\/$/, '');

    if (normalizedPath.startsWith(`${normalizedUploadDir}/`)) {
      return `uploads/${normalizedPath.slice(normalizedUploadDir.length + 1)}`;
    }

    const uploadsIndex = normalizedPath.toLowerCase().lastIndexOf('/uploads/');
    if (uploadsIndex !== -1) {
      return `uploads/${normalizedPath.slice(uploadsIndex + '/uploads/'.length)}`;
    }

    return `uploads/${path.basename(normalizedPath)}`;
  }

  return '';
};

// Helper to get active settings
const getActiveSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  return settings;
};

// Local storage config
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = resolveUploadDir();
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const safeName = path.basename(file.originalname).replace(/[^\w.\-]+/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  }
});

// Dynamic Storage Engine
const dynamicStorage = {
  _handleFile: function (req, file, cb) {
    getActiveSettings()
      .then(settings => {
        // If UPLOAD_DIR is explicitly configured, prefer deterministic local disk storage.
        const hasExplicitUploadDir = Boolean((process.env.UPLOAD_DIR || '').trim());
        const provider = hasExplicitUploadDir ? 'local' : (settings?.upload?.provider || 'local');

        if (provider === 'cloudinary') {
          const cloudName = settings?.upload?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
          const apiKey = settings?.upload?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
          const apiSecret = decrypt(settings?.upload?.cloudinaryApiSecret) || process.env.CLOUDINARY_API_SECRET;

          const canUseCloudinary = typeof CloudinaryStorage === 'function' && cloudName && apiKey && apiSecret;
          if (!canUseCloudinary) {
            return localStorage._handleFile(req, file, cb);
          }

          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret
          });

          const storage = new CloudinaryStorage({
            cloudinary: cloudinaryModule,
            params: {
              folder: 'spa_documents',
              resource_type: 'auto',
              allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'csv', 'json', 'txt', 'zip', 'ttf', 'otf', 'woff', 'woff2']
            }
          });
          
          storage._handleFile(req, file, cb);
        } else {
          localStorage._handleFile(req, file, cb);
        }
      })
      .catch(error => {
        cb(error);
      });
  },
  _removeFile: function (req, file, cb) {
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    cb(null);
  }
};

const upload = multer({
  storage: dynamicStorage,
  limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
  fileFilter: (req, file, cb) => {
    const mimetype = file?.mimetype;
    const isZipAllowed = typeof req?.originalUrl === 'string' && req.originalUrl.includes('/settings/upload-font');
    const zipTypes = new Set(['application/zip', 'application/x-zip-compressed']);

    if (!mimetype) {
      return cb(new Error('Unsupported upload type: unknown'));
    }

    if (!ALLOWED_MIME_TYPES.has(mimetype) && !(isZipAllowed && zipTypes.has(mimetype))) {
      return cb(new Error(`Unsupported upload type: ${mimetype}`));
    }
    return cb(null, true);
  }
});

// Helper to delete file from any provider
const deleteFile = async (url) => {
  if (!url) return;

  try {
    const settings = await getActiveSettings();
    
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      const cloudName = settings?.upload?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = settings?.upload?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
      const apiSecret = decrypt(settings?.upload?.cloudinaryApiSecret) || process.env.CLOUDINARY_API_SECRET;

      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
      });

      // Extract public_id from URL
      // URL format: https://res.cloudinary.com/[cloud_name]/image/upload/v[version]/[folder]/[public_id].[ext]
      const parts = url.split('/');
      const lastPart = parts[parts.length - 1];
      const folderPart = parts[parts.length - 2];
      const publicId = `${folderPart}/${lastPart.split('.')[0]}`;
      
      await cloudinary.uploader.destroy(publicId);
      console.log(`Cloudinary file deleted: ${publicId}`);
    } else {
      // Local file
      // Normalize path (standardize / vs \)
      const relativePath = normalizeSlashes(url);
      const filename = relativePath.split('/').pop();
      const uploadMarkerIndex = relativePath.toLowerCase().lastIndexOf('/uploads/');
      const uploadRelativePath = uploadMarkerIndex === -1
        ? relativePath.replace(/^\.?\//, '').replace(/^uploads\//i, '')
        : relativePath.slice(uploadMarkerIndex + '/uploads/'.length);
      const cleanUploadRelativePath = uploadRelativePath.replace(/^uploads\//i, '');
      const candidatePaths = [
        path.join(resolveUploadDir(), cleanUploadRelativePath),
        path.join(DEFAULT_UPLOAD_DIR, cleanUploadRelativePath),
        filename ? path.join(resolveUploadDir(), filename) : '',
        filename ? path.join(DEFAULT_UPLOAD_DIR, filename) : ''
      ].filter(Boolean);

      for (const filePath of [...new Set(candidatePaths)]) {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Local file deleted: ${filePath}`);
          return;
        }
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

module.exports = {
  upload,
  deleteFile,
  getStoredFilePath,
  resolveUploadDir,
  DEFAULT_UPLOAD_DIR
};
