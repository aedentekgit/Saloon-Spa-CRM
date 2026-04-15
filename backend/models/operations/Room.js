const mongoose = require('mongoose');

const roomSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    default: 'Standard'
  },
  status: {
    type: String,
    default: 'Free'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  timer: {
    type: String,
    default: '00:00'
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  image: {
    type: String
  },
  cleaningDuration: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Room', roomSchema);
