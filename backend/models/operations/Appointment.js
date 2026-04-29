const mongoose = require('mongoose');

const appointmentSchema = mongoose.Schema({
  client: {
    type: String,
    required: true
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  service: {
    type: String,
    required: true
  },
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
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
  clientPhone: {
    type: String
  },
  clientEmail: {
    type: String
  },
  bookingType: {
    type: String,
    enum: ['Normal', 'Membership', 'Guest'],
    default: 'Normal'
  },
  status: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Completed', 'Cancelled'],
    default: 'Confirmed'
  },
  cancellationReason: {
    type: String
  },
  completedAt: {
    type: Date
  },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId
  },
  completedBySource: {
    type: String,
    enum: ['User', 'Employee']
  },
  completedByEmployeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  completedByName: {
    type: String
  },
  completedByRole: {
    type: String
  },
  billedInvoiceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  billedAt: {
    type: Date
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  addOns: [{
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service'
    },
    service: String,
    price: Number,
    duration: Number,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    }
  }],
  totalQuantity: {
    type: Number,
    default: 1
  },
  totalDuration: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for fast branch and date lookups (Crucial for Daily Calendars)
appointmentSchema.index({ branch: 1, date: -1 });

// Index for client history tracking
appointmentSchema.index({ clientId: 1 });

// Index for employee schedule tracking
appointmentSchema.index({ employeeId: 1 });

module.exports = mongoose.model('Appointment', appointmentSchema);
