const mongoose = require('mongoose');

const serviceSchema = mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  image: {
    type: String
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  commissionType: {
    type: String,
    enum: ['Percentage', 'Fixed'],
    default: 'Percentage'
  },
  commissionValue: {
    type: Number,
    default: 10
  },
  description: {
    type: String
  },
  inventoryUsage: [{
    inventoryItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      default: 0
    },
    unit: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
});

// Compound index to ensure service name is unique per branch
serviceSchema.index({ name: 1, branch: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
