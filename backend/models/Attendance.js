const mongoose = require('mongoose');

const attendanceSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  employeeName: {
    type: String,
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  checkIn: {
    type: String, // HH:MM AM/PM
    default: '--'
  },
  checkOut: {
    type: String, // HH:MM AM/PM
    default: '--'
  },
  status: {
    type: String,
    enum: ['Present', 'Absent', 'Half Day', 'On Leave'],
    default: 'Present'
  },
  shift: {
    type: String,
    default: 'None'
  },
  duration: {
    type: Number, // in minutes
    default: 0
  },
  overtimeMinutes: {
    type: Number,
    default: 0
  },
  dailyEarnings: {
    type: Number,
    default: 0
  },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  image: String
}, {
  timestamps: true
});

module.exports = mongoose.model('Attendance', attendanceSchema);
