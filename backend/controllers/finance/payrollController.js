const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');
const Settings = require('../../models/core/Settings');
const PayrollRun = require('../../models/finance/PayrollRun');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');

const toText = (value) => {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(toText).join(' ');
  return String(value);
};

const recordMatchesSearch = (record, search) => {
  const searchTerm = String(search || '').trim().toLowerCase();
  if (!searchTerm) return true;

  return [
    record.employeeId,
    record.name,
    record.role,
    record.email,
    record.phone,
    record.status,
    record.branchId,
    record.branch,
    record.month,
    record.monthLabel,
    record.payType,
    record.salary,
    record.configuredBaseAmount,
    record.overtimeRate,
    record.shiftHours,
    record.shift,
    record.commissionBasis,
    record.daysWorked,
    record.presentCount,
    record.halfDayCount,
    record.absentCount,
    record.onLeaveCount,
    record.completedCheckouts,
    record.totalHours,
    record.regularHours,
    record.otHours,
    record.leaveUnit,
    record.leavesCount,
    record.paidLeaveAllowance,
    record.paidLeaveApplied,
    record.unpaidLeaveUnits,
    record.basePayBeforeDeduction,
    record.basePay,
    record.otPay,
    record.deduction,
    record.manualAddition,
    record.manualDeduction,
    record.finalPay,
    record.payoutStatus,
    record.notes,
    record.totalPay,
    record.joiningDate
  ].some(value => toText(value).toLowerCase().includes(searchTerm));
};

const getScope = (req) => {
  const userBranchId = getBranchId(req.user.branch);
  const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
  const employeeQuery = {};

  if (req.user.role === 'Admin') {
    if (requestedBranch) employeeQuery.branch = toObjectIdIfValid(requestedBranch);
  } else {
    if (!userBranchId) {
      const error = new Error('Access Denied: Branch assignment required.');
      error.statusCode = 403;
      throw error;
    }
    if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
      const error = new Error('Access Denied: Cannot view payroll for another branch.');
      error.statusCode = 403;
      throw error;
    }
    employeeQuery.branch = toObjectIdIfValid(userBranchId);
  }

  return {
    employeeQuery,
    runBranch: requestedBranch || (req.user.role === 'Admin' ? null : userBranchId)
  };
};

const computeStats = (rows) => rows.reduce((stats, row) => {
  const isIncluded = row.payoutStatus !== 'Excluded';
  const isHold = row.payoutStatus === 'Hold';
  stats.calculatedTotal += Number(row.totalPay) || 0;
  stats.additions += Number(row.manualAddition) || 0;
  stats.deductions += (Number(row.deduction) || 0) + (Number(row.manualDeduction) || 0);
  stats.ot += Number(row.otPay) || 0;
  stats.hours += Number(row.totalHours) || 0;
  if (row.payoutStatus === 'Excluded') stats.excludedCount += 1;
  else if (isHold) stats.holdCount += 1;
  else stats.includedCount += 1;
  if (isIncluded && !isHold) stats.total += Number(row.finalPay ?? row.totalPay) || 0;
  return stats;
}, {
  total: 0,
  calculatedTotal: 0,
  additions: 0,
  deductions: 0,
  ot: 0,
  hours: 0,
  includedCount: 0,
  holdCount: 0,
  excludedCount: 0
});

const normalizeRow = (row, userId) => {
  const manualAddition = Math.max(0, Number(row.manualAddition) || 0);
  const manualDeduction = Math.max(0, Number(row.manualDeduction) || 0);
  const totalPay = Number(row.totalPay) || 0;
  return {
    ...row,
    manualAddition,
    manualDeduction,
    finalPay: Math.max(0, Math.round(totalPay + manualAddition - manualDeduction)),
    payoutStatus: ['Included', 'Hold', 'Excluded'].includes(row.payoutStatus) ? row.payoutStatus : 'Included',
    adjustedBy: row.adjustedBy || userId,
    adjustedAt: row.adjustedAt || new Date()
  };
};

const buildPayrollRows = async (req, month) => {
  const { employeeQuery } = getScope(req);
  employeeQuery.status = 'Active';
  employeeQuery.$or = [
    { salary: { $gt: 0 } },
    { 'payroll.baseAmount': { $gt: 0 } }
  ];
  const settings = await Settings.findOne();
  const globalPaidDays = settings?.payroll?.allowedPaidLeaves || 0;
  const globalPaidHours = settings?.payroll?.allowedPaidHours || 0;
  const employees = await Employee.find(employeeQuery).populate('branch');
  const attendance = await Attendance.find({ date: { $regex: new RegExp(`^${month}`) } });

  return employees.map(emp => {
    const empAtt = attendance.filter(a => a.user.toString() === emp._id.toString());
    let otPay = 0;
    let basePay = 0;
    let basePayBeforeDeduction = 0;
    let regularPay = 0;
    let paidLeavePay = 0;
    let totalHours = 0;
    let otMin = 0;
    let leavesCount = 0;
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let onLeaveCount = 0;
    let completedCheckouts = 0;

    empAtt.forEach(a => {
      totalHours += (a.duration || 0) / 60;
      otMin += (a.overtimeMinutes || 0);
      if (a.checkOut && a.checkOut !== '--') completedCheckouts += 1;

      if (a.status === 'Present') presentCount += 1;
      if (a.status === 'Half Day') {
        halfDayCount += 1;
        leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) / 2 : 0.5);
      } else if (a.status === 'Absent' || a.status === 'On Leave') {
        if (a.status === 'Absent') absentCount += 1;
        if (a.status === 'On Leave') onLeaveCount += 1;
        leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) : 1);
      }

      if (emp.payroll?.type === 'Monthly') {
        otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
      } else {
        const regMin = (a.duration || 0) - (a.overtimeMinutes || 0);
        const rowRegularPay = (regMin / 60) * (emp.payroll?.baseAmount || 0);
        basePay += rowRegularPay;
        regularPay += rowRegularPay;
        otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
      }
    });

    let deduction = 0;
    let paidLeaveApplied = 0;
    let unpaidLeaveUnits = 0;
    const payType = emp.payroll?.type || 'Monthly';
    if (emp.payroll?.type === 'Monthly') {
      const rawSalary = emp.payroll?.baseAmount || emp.salary || 0;
      const dailyRate = rawSalary / 30;
      paidLeaveApplied = Math.min(leavesCount, globalPaidDays);
      unpaidLeaveUnits = Math.max(0, leavesCount - globalPaidDays);
      deduction = unpaidLeaveUnits * dailyRate;
      basePayBeforeDeduction = rawSalary;
      basePay = rawSalary - deduction;
    } else {
      const paidMissedHours = Math.min(leavesCount, globalPaidHours);
      const hourlyRate = emp.payroll?.baseAmount || 0;
      paidLeaveApplied = paidMissedHours;
      unpaidLeaveUnits = Math.max(0, leavesCount - globalPaidHours);
      paidLeavePay = paidMissedHours * hourlyRate;
      basePay += paidLeavePay;
      deduction = unpaidLeaveUnits * hourlyRate;
      basePayBeforeDeduction = regularPay + paidLeavePay + deduction;
    }

    const totalPay = Math.round(basePay + otPay);
    return {
      employeeId: emp._id,
      name: emp.name,
      role: emp.role,
      email: emp.email,
      phone: emp.phone,
      status: emp.status,
      branchId: getBranchId(emp.branch) || undefined,
      branch: emp.branch?.name || 'Main Registry',
      month,
      monthLabel: new Date(`${month}-01T00:00:00.000Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      salary: emp.salary || 0,
      configuredBaseAmount: emp.payroll?.baseAmount || 0,
      overtimeRate: emp.payroll?.otRate || 0,
      shiftHours: emp.payroll?.shiftHours || 8,
      shift: emp.shift || 'Flexible',
      commissionBasis: emp.payroll?.commissionBasis === false ? 'No' : 'Yes',
      basePay: Math.round(basePay),
      basePayBeforeDeduction: Math.round(basePayBeforeDeduction),
      regularPay: Math.round(regularPay),
      paidLeavePay: Math.round(paidLeavePay),
      otPay: Math.round(otPay),
      deduction: Math.round(deduction),
      leavesCount: Math.round(leavesCount * 10) / 10,
      paidLeaveAllowance: payType === 'Monthly' ? globalPaidDays : globalPaidHours,
      paidLeaveApplied: Math.round(paidLeaveApplied * 10) / 10,
      unpaidLeaveUnits: Math.round(unpaidLeaveUnits * 10) / 10,
      leaveUnit: payType === 'Monthly' ? 'Days' : 'Hours',
      totalPay,
      finalPay: totalPay,
      totalHours: Math.round(totalHours * 10) / 10,
      otHours: Math.round((otMin / 60) * 10) / 10,
      regularHours: Math.round((totalHours - (otMin / 60)) * 10) / 10,
      daysWorked: empAtt.length,
      presentCount,
      halfDayCount,
      absentCount,
      onLeaveCount,
      completedCheckouts,
      payType,
      payoutStatus: 'Included',
      manualAddition: 0,
      manualDeduction: 0,
      notes: '',
      joiningDate: emp.joiningDate
    };
  });
};

const paginateRows = (req, rows) => {
  const { paginate, page, limit, skip } = getPaginationOptions(req);
  if (!paginate) return { rows, pagination: null };
  return {
    rows: rows.slice(skip, skip + limit),
    pagination: buildPaginationMeta(rows.length, page, limit)
  };
};

const findScopedRun = async (req, id) => {
  const run = await PayrollRun.findById(id);
  if (!run) return null;
  if (req.user.role !== 'Admin') {
    const userBranchId = getBranchId(req.user.branch);
    if (!userBranchId || !sameBranch(run.branch, userBranchId)) {
      const error = new Error('Access Denied: Cannot manage payroll for another branch.');
      error.statusCode = 403;
      throw error;
    }
  }
  return run;
};

// @desc    Generate live payroll preview or return saved run for a month
// @route   GET /api/payroll
exports.generatePayroll = async (req, res) => {
  try {
    const { month, search } = req.query;
    if (!month) return res.status(400).json({ message: 'Month (YYYY-MM) is required' });

    const { runBranch } = getScope(req);
    const savedRun = await PayrollRun.findOne({
      month,
      branch: runBranch ? toObjectIdIfValid(runBranch) : null,
      status: { $ne: 'Voided' }
    }).lean();

    const sourceRows = savedRun ? savedRun.rows : await buildPayrollRows(req, month);
    const filteredRows = sourceRows.filter(row => recordMatchesSearch(row, search));
    const { rows, pagination } = paginateRows(req, filteredRows);
    const stats = savedRun ? savedRun.stats : computeStats(sourceRows);

    return res.json({
      data: rows,
      stats,
      run: savedRun ? {
        _id: savedRun._id,
        runNumber: savedRun.runNumber,
        month: savedRun.month,
        monthLabel: savedRun.monthLabel,
        branch: savedRun.branch,
        branchName: savedRun.branchName,
        status: savedRun.status,
        approvedAt: savedRun.approvedAt,
        createdAt: savedRun.createdAt,
        updatedAt: savedRun.updatedAt
      } : null,
      mode: savedRun ? 'saved' : 'preview',
      pagination
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.createPayrollRun = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ message: 'Month (YYYY-MM) is required' });

    const { runBranch } = getScope(req);
    const branchId = runBranch ? toObjectIdIfValid(runBranch) : null;
    const existing = await PayrollRun.findOne({ month, branch: branchId, status: { $ne: 'Voided' } });
    if (existing) return res.status(409).json({ message: 'A payroll run already exists for this month and branch.' });

    const rows = await buildPayrollRows(req, month);
    const monthLabel = new Date(`${month}-01T00:00:00.000Z`).toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const branchName = branchId ? (rows.find(row => String(row.branchId || '') === String(branchId))?.branch || 'Selected Branch') : 'All Branches';
    const run = await PayrollRun.create({
      runNumber: `PAY-${month}-${String(Date.now()).slice(-6)}`,
      month,
      monthLabel,
      branch: branchId,
      branchName,
      rows: rows.map(row => normalizeRow(row, req.user._id)),
      stats: computeStats(rows),
      generatedBy: req.user._id,
      auditTrail: [{ action: 'created', message: 'Payroll draft generated.', user: req.user._id }]
    });

    res.status(201).json({ data: run });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.updatePayrollRow = async (req, res) => {
  try {
    const run = await findScopedRun(req, req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'Draft') return res.status(400).json({ message: 'Only draft payroll runs can be edited.' });

    const row = run.rows.find(item => String(item.employeeId) === String(req.params.employeeId));
    if (!row) return res.status(404).json({ message: 'Payroll row not found' });

    ['manualAddition', 'manualDeduction', 'payoutStatus', 'notes'].forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) row[field] = req.body[field];
    });
    const normalized = normalizeRow(row.toObject(), req.user._id);
    Object.assign(row, normalized);
    run.stats = computeStats(run.rows);
    run.auditTrail.push({ action: 'row_updated', message: `${row.name} payroll row updated.`, user: req.user._id });
    await run.save();

    res.json({ data: run });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.approvePayrollRun = async (req, res) => {
  try {
    const run = await findScopedRun(req, req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'Draft') return res.status(400).json({ message: 'Only draft payroll runs can be approved.' });
    run.status = 'Approved';
    run.approvedBy = req.user._id;
    run.approvedAt = new Date();
    run.auditTrail.push({ action: 'approved', message: 'Payroll run approved and locked.', user: req.user._id });
    await run.save();
    res.json({ data: run });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

exports.deletePayrollRun = async (req, res) => {
  try {
    const run = await findScopedRun(req, req.params.id);
    if (!run) return res.status(404).json({ message: 'Payroll run not found' });
    if (run.status !== 'Draft') return res.status(400).json({ message: 'Only draft payroll runs can be deleted.' });
    await run.deleteOne();
    res.json({ message: 'Payroll draft deleted.' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};
