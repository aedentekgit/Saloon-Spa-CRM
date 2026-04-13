const mongoose = require('mongoose');

const membershipPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  durationDays: {
    type: Number,
    required: true 
  },
  maxSessions: {
    type: Number,
    required: true
  },
  applicableServices: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  }],
  description: {
    type: String
  },
  branches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }], 
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
