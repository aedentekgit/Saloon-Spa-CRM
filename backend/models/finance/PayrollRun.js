const mongoose = require('mongoose');

const payrollRowSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  name: String,
  role: String,
  email: String,
  phone: String,
  status: String,
  branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  branch: String,
  month: String,
  monthLabel: String,
  salary: { type: Number, default: 0 },
  configuredBaseAmount: { type: Number, default: 0 },
  overtimeRate: { type: Number, default: 0 },
  shiftHours: { type: Number, default: 0 },
  shift: String,
  commissionBasis: String,
  basePay: { type: Number, default: 0 },
  basePayBeforeDeduction: { type: Number, default: 0 },
  regularPay: { type: Number, default: 0 },
  paidLeavePay: { type: Number, default: 0 },
  otPay: { type: Number, default: 0 },
  totalPay: { type: Number, default: 0 },
  totalHours: { type: Number, default: 0 },
  regularHours: { type: Number, default: 0 },
  otHours: { type: Number, default: 0 },
  daysWorked: { type: Number, default: 0 },
  presentCount: { type: Number, default: 0 },
  halfDayCount: { type: Number, default: 0 },
  absentCount: { type: Number, default: 0 },
  onLeaveCount: { type: Number, default: 0 },
  completedCheckouts: { type: Number, default: 0 },
  leavesCount: { type: Number, default: 0 },
  paidLeaveAllowance: { type: Number, default: 0 },
  paidLeaveApplied: { type: Number, default: 0 },
  unpaidLeaveUnits: { type: Number, default: 0 },
  leaveUnit: String,
  deduction: { type: Number, default: 0 },
  payType: String,
  joiningDate: Date,
  manualAddition: { type: Number, default: 0 },
  manualDeduction: { type: Number, default: 0 },
  finalPay: { type: Number, default: 0 },
  payoutStatus: {
    type: String,
    enum: ['Included', 'Hold', 'Excluded'],
    default: 'Included'
  },
  notes: String,
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adjustedAt: Date
}, { _id: false });

const auditEntrySchema = new mongoose.Schema({
  action: String,
  message: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date, default: Date.now }
}, { _id: false });

const payrollRunSchema = new mongoose.Schema({
  runNumber: { type: String, required: true, unique: true },
  month: { type: String, required: true },
  monthLabel: String,
  branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
  branchName: String,
  status: {
    type: String,
    enum: ['Draft', 'Approved', 'Paid', 'Voided'],
    default: 'Draft'
  },
  rows: [payrollRowSchema],
  stats: {
    total: { type: Number, default: 0 },
    calculatedTotal: { type: Number, default: 0 },
    additions: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    ot: { type: Number, default: 0 },
    hours: { type: Number, default: 0 },
    includedCount: { type: Number, default: 0 },
    holdCount: { type: Number, default: 0 },
    excludedCount: { type: Number, default: 0 }
  },
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  auditTrail: [auditEntrySchema]
}, { timestamps: true });

payrollRunSchema.index({ month: 1, branch: 1 }, { unique: true });
payrollRunSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('PayrollRun', payrollRunSchema);
