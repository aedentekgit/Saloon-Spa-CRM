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
  },
  benefits: [{
    type: String
  }],
  icon: {
    type: String,
    default: 'Sparkles'
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  document: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MembershipPlan', membershipPlanSchema);
