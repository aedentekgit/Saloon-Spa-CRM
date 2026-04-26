const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String, default: 'Therapist' },
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  password: { type: String, select: false },
  address: { type: String },
  dob: { type: Date },
  salary: { type: Number, default: 0 },
  profilePic: { type: String },
  services: [{ type: String }],
  attendance: { type: Number, default: 100 },
  earnings: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  shift: { type: String }, // Storing shift name for simplicity or mapping
  shiftType: { type: String, enum: ['Day', 'Week', 'Month'], default: 'Day' },
  payroll: {
    type: { type: String, enum: ['Monthly', 'Hourly'], default: 'Monthly' },
    baseAmount: { type: Number, default: 0 },
    otRate: { type: Number, default: 0 },
    shiftHours: { type: Number, default: 8 },
    commissionBasis: { type: Boolean, default: true }
  },
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  joiningDate: { type: Date, default: Date.now },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verificationToken: String,
  verificationTokenExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: true // Employees might be pre-verified by admin
  },
  loginAttempts: {
    type: Number,
    required: true,
    default: 0
  },
  lockUntil: {
    type: Date
  },
  documents: [{
    name: String,
    url: String,
    fileType: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  employeeId: {
    type: String,
    unique: true,
    sparse: true
  },
  createdAt: { type: Date, default: Date.now }
});

const bcrypt = require('bcryptjs');
employeeSchema.pre('save', async function() {
  if (!this.isModified('password') || !this.password) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

employeeSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Employee', employeeSchema);
