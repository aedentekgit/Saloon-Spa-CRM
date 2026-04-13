const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const path = require('path');
const fs = require('fs');
const Settings = require('../models/Settings');

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
    const dir = './uploads';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`);
  }
});

// Dynamic Storage Engine
const dynamicStorage = {
  _handleFile: function (req, file, cb) {
    getActiveSettings()
      .then(settings => {
        const provider = settings.upload.provider;

        if (provider === 'cloudinary') {
          const cloudName = settings.upload.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
          const apiKey = settings.upload.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
          const apiSecret = settings.upload.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

          cloudinary.config({
            cloud_name: cloudName,
            api_key: apiKey,
            api_secret: apiSecret
          });

          const storage = new CloudinaryStorage({
            cloudinary: cloudinary,
            params: {
              folder: 'spa_documents',
              resource_type: 'auto',
              allowed_formats: ['jpg', 'png', 'jpeg', 'pdf', 'doc', 'docx']
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

const upload = multer({ storage: dynamicStorage });

// Helper to delete file from any provider
const deleteFile = async (url) => {
  if (!url) return;

  try {
    const settings = await getActiveSettings();
    
    // Check if it's a Cloudinary URL
    if (url.includes('cloudinary.com')) {
      const cloudName = settings.upload.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = settings.upload.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY;
      const apiSecret = settings.upload.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET;

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
      const relativePath = url.replace(/\\/g, '/');
      const filename = relativePath.split('/').pop();
      const filePath = path.join(__dirname, '..', 'uploads', filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`Local file deleted: ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Error deleting file:', error);
  }
};

module.exports = {
  upload,
  deleteFile
};
