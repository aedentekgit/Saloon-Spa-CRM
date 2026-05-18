const mongoose = require('mongoose');

const inventoryUsageSchema = new mongoose.Schema({
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
}, { _id: false });

const serviceBranchSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive']
  },
  commissionType: {
    type: String,
    enum: ['Percentage', 'Fixed']
  },
  commissionValue: {
    type: Number
  },
  inventoryUsage: {
    type: [inventoryUsageSchema],
    default: undefined
  }
}, { _id: true });

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
  branches: [serviceBranchSchema],
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
  inventoryUsage: [inventoryUsageSchema]
}, {
  timestamps: true
});

serviceSchema.index({ name: 1 });
serviceSchema.index({ 'branches.branch': 1 });

module.exports = mongoose.model('Service', serviceSchema);
