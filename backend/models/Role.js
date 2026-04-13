const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  permissions: [{
    type: String // e.g., 'dashboard', 'clients', 'appointments', 'rooms', 'employees', 'attendance', 'leave', 'services', 'billing', 'finance', 'inventory', 'whatsapp', 'reports', 'settings', 'roles'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Role', roleSchema);
