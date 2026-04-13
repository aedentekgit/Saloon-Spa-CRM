const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema({
  name: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  durationHours: { type: Number, default: 8 },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Shift', shiftSchema);
