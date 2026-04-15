const mongoose = require('mongoose');

const inventorySchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Oils'
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  lowStock: {
    type: Number,
    default: 5
  },
  vendor: {
    type: String,
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  unit: {
    type: String,
    enum: ['kg', 'L', 'gm', 'ml', 'Nos', 'Pack', 'Bottle'],
    default: 'Nos'
  },
  image: {
    type: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

inventorySchema.virtual('status').get(function() {
  return this.stock <= this.lowStock ? 'Low Stock' : 'High Stock';
});

// Index for fast branch-specific filtering
inventorySchema.index({ branch: 1 });

// Compound index for search optimization
inventorySchema.index({ name: 'text', category: 'text' });

// Index for stock monitoring performance
inventorySchema.index({ stock: 1, lowStock: 1 });

module.exports = mongoose.model('Inventory', inventorySchema);
