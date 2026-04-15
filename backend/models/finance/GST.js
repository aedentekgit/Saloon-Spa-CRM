const mongoose = require('mongoose');

const gstSchema = new mongoose.Schema({
  name: { type: String, required: true },
  percentage: { type: Number, required: true },
  isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('GST', gstSchema);
