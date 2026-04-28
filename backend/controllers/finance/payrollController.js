const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');
const Settings = require('../../models/core/Settings');
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
    record.totalPay,
    record.joiningDate
  ].some(value => toText(value).toLowerCase().includes(searchTerm));
};

// @desc    Generate payroll report for a specific month
// @route   GET /api/payroll
// @access  Private/Admin
exports.generatePayroll = async (req, res) => {
  try {
    const { month, search, branch } = req.query; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
    }

    // Fetch Global Settings
    const settings = await Settings.findOne();
    const globalPaidDays = settings?.payroll?.allowedPaidLeaves || 0;
    const globalPaidHours = settings?.payroll?.allowedPaidHours || 0;

    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = branch && branch !== 'all' ? getBranchId(branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = toObjectIdIfValid(requestedBranch);
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view payroll for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    const employees = await Employee.find(query).populate('branch');
    const attendance = await Attendance.find({
      date: { $regex: new RegExp(`^${month}`) }
    });

    const payrollRecords = employees.map(emp => {
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

        if (a.status === 'Present') {
            presentCount += 1;
        }

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

      return {
        employeeId: emp._id.toString(),
        name: emp.name,
        role: emp.role,
        email: emp.email,
        phone: emp.phone,
        status: emp.status,
        branchId: getBranchId(emp.branch)?.toString() || '',
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
        totalPay: Math.round(basePay + otPay),
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
        joiningDate: emp.joiningDate
      };
    }).filter(record => recordMatchesSearch(record, search));

    // Calculate aggregated stats for the whole query
    const stats = {
      total: payrollRecords.reduce((acc, curr) => acc + curr.totalPay, 0),
      ot: payrollRecords.reduce((acc, curr) => acc + curr.otPay, 0),
      deductions: payrollRecords.reduce((acc, curr) => acc + curr.deduction, 0),
      hours: payrollRecords.reduce((acc, curr) => acc + curr.totalHours, 0)
    };

    // Pagination
    const { paginate, page, limit, skip } = getPaginationOptions(req);

    if (paginate) {
      const paginatedData = payrollRecords.slice(skip, skip + limit);
      return res.json({
        data: paginatedData,
        stats,
        pagination: buildPaginationMeta(payrollRecords.length, page, limit)
      });
    }

    res.json({
      data: payrollRecords,
      stats
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
