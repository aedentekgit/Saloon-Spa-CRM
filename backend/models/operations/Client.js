const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  dob: { type: Date },
  anniversary: { type: Date },
  notes: { type: String },
  preferences: { type: String },
  totalSpending: { type: Number, default: 0 },
  visits: { type: Number, default: 0 },
  password: { type: String, select: false },
  profilePic: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verificationToken: String,
  verificationTokenExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  createdAt: { type: Date, default: Date.now }
});

const bcrypt = require('bcryptjs');
clientSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

clientSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Indexes for performance
clientSchema.index({ branch: 1 });
clientSchema.index({ createdAt: -1 });

// Text index for unified name and phone searching
clientSchema.index({ name: 'text', phone: 'text' });

module.exports = mongoose.model('Client', clientSchema);
