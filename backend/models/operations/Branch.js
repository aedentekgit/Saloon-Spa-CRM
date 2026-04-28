const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a branch name'],
    unique: true,
    trim: true
  },
  contactNumber: {
    type: String,
    required: [true, 'Please add a contact number']
  },
  email: {
    type: String,
    required: [true, 'Please add an email']
  },
  address: {
    type: String,
    required: [true, 'Please add an address']
  },
  logo: {
    type: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lat: { type: Number },
  lng: { type: Number },
  radius: { type: Number, default: 100 }, // Radius in meters
  allowedIPs: [{ type: String }],
  restrictionMode: {
    type: String,
    enum: ['geofence', 'ip', 'none'],
    default: 'geofence'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Branch', branchSchema);
