const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Upcoming', 'Cancelled'],
    default: 'Upcoming'
  },
  totalSessions: {
    type: Number,
    default: 0
  },
  remainingSessions: {
    type: Number,
    default: 0
  },
  usageHistory: [{
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment'
    },
    usedAt: {
      type: Date,
      default: Date.now
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    notes: String
  }],
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Partial', 'Pending'],
    default: 'Pending'
  },
  totalPaid: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Middleware to set status based on dates before saving
membershipSchema.pre('save', function() {
  const now = new Date();
  if (this.status !== 'Cancelled') {
    if (now < this.startDate) {
      this.status = 'Upcoming';
    } else if (now > this.endDate) {
      this.status = 'Expired';
    } else {
      this.status = 'Active';
    }
  }
});

module.exports = mongoose.model('Membership', membershipSchema);
