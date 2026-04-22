const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  general: {
    siteName: { type: String, default: 'Zen Spa & Saloon' },
    logo: { type: String, default: '' },
    email: { type: String, default: 'contact@zenspa.com' },
    address: { type: String, default: '123 Wellness St, City' },
    contactNumber: { type: String, default: '+1234567890' },
    country: { type: String, default: 'Qatar' },
    countryIso: { type: String, default: 'QA' },
    dialingCode: { type: String, default: '+974' },
    currency: { type: String, default: 'Qatari Riyal' },
    currencySymbol: { type: String, default: 'QR' },
    dateTimeFormat: { type: String, default: 'DD/MM/YYYY HH:mm' }
  },
  upload: {
    provider: { type: String, enum: ['cloudinary', 'local'], default: 'local' },
    cloudinaryCloudName: { type: String, default: '' },
    cloudinaryApiKey: { type: String, default: '' },
    cloudinaryApiSecret: { type: String, default: '' }
  },
  theme: {
    primaryColor: { type: String, default: '#2D1622' }, // Deep Zen Plum
    headingFont: { type: String, default: 'Italiana' },
    bodyFont: { type: String, default: 'Plus Jakarta Sans' },
    darkMode: { type: Boolean, default: false }
  },
  notifications: {
    pushEnabled: { type: Boolean, default: false },
    fcmToken: { type: String, default: '' },
    // Client Side Config
    firebaseApiKey: { type: String, default: '' },
    firebaseAuthDomain: { type: String, default: '' },
    firebaseProjectId: { type: String, default: '' },
    firebaseStorageBucket: { type: String, default: '' },
    firebaseMessagingSenderId: { type: String, default: '' },
    firebaseAppId: { type: String, default: '' },
    firebaseMeasurementId: { type: String, default: '' },
    firebaseVapidKey: { type: String, default: '' },
    // Admin SDK Config (Backend)
    firebaseClientEmail: { type: String, default: '' },
    firebasePrivateKey: { type: String, default: '' },
    firebaseServiceAccount: { type: String, default: '' } 
  },
  billing: {
    gstEnabled: { type: Boolean, default: false }
  },
  smtp: {
    host: { type: String, default: '' },
    port: { type: Number, default: 587 },
    user: { type: String, default: '' },
    password: { type: String, default: '' },
    fromName: { type: String, default: '' },
    fromEmail: { type: String, default: '' },
    encryption: { type: String, enum: ['ssl', 'tls', 'none'], default: 'tls' }
  },
  whatsapp: {
    instanceId: { type: String },
    token: { type: String },
    provider: { type: String, default: 'ultramsg' },
    enabled: { type: Boolean, default: false }
  },
  payroll: {
    type: { type: String, enum: ['Monthly', 'Hourly'], default: 'Monthly' },
    allowedPaidLeaves: { type: Number, default: 1.5 },
    allowedPaidHours: { type: Number, default: 12 }
  },
  workingHours: {
    monday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } },
    tuesday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } },
    wednesday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } },
    thursday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } },
    friday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '14:00' }, closeTime: { type: String, default: '23:00' } },
    saturday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } },
    sunday: { isOpen: { type: Boolean, default: true }, openTime: { type: String, default: '09:00' }, closeTime: { type: String, default: '21:00' } }
  }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
