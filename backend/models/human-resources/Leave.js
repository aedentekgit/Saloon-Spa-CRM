const mongoose = require('mongoose');

const leaveSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Full Day', 'Half Day', 'Short Leave', 'Annual Leave', 'Sick Leave', 'Casual Leave', 'Emergency Leave'],
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  startDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  endDate: {
    type: String, // YYYY-MM-DD
    required: true
  },
  daysCount: {
    type: Number,
    required: true,
    default: 1
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Leave', leaveSchema);

