const mongoose = require('mongoose');

const expenseSchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['Inventory', 'Utilities', 'Staff', 'Marketing', 'Rent', 'Misc'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
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

module.exports = mongoose.model('Expense', expenseSchema);
