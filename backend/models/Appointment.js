const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
  client: {
    type: String,
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client'
  },
  service: {
    type: String,
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  employee: {
    type: String,
    required: true
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  date: {
    type: String,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  room: {
    type: String
  },
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Appointment', appointmentSchema);
