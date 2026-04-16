const mongoose = require('mongoose');

const invoiceSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  invoiceNumber: {
    type: String,
    required: true,
    unique: true
  },
  clientName: {
    type: String,
    required: true
  },
  items: [
    {
      name: String,
      price: Number,
      duration: Number
    }
  ],
  subtotal: {
    type: Number,
    required: true
  },
  gst: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },
  paymentMode: {
    type: String,
    enum: ['Cash', 'Card', 'UPI', 'GPay', 'Split'],
    default: 'Card'
  },
  payments: [
    {
      mode: { type: String, enum: ['Cash', 'Card', 'UPI', 'GPay'] },
      amount: Number
    }
  ],
  date: {
    type: String,
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }
}, {
  timestamps: true
});

// Indexes for fast branch-specific financial reports and dashboard trends
invoiceSchema.index({ branch: 1, date: -1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ invoiceNumber: 1 });

module.exports = mongoose.model('Invoice', invoiceSchema);
