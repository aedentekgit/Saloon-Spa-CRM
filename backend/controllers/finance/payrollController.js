const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');
const Settings = require('../../models/core/Settings');
const { getBranchId } = require('../../utils/branch');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');

// @desc    Generate payroll report for a specific month
// @route   GET /api/payroll
// @access  Private/Admin
exports.generatePayroll = async (req, res) => {
  try {
    const { month, search } = req.query; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
    }

    // Fetch Global Settings
    const settings = await Settings.findOne();
    const globalPaidDays = settings?.payroll?.allowedPaidLeaves || 0;
    const globalPaidHours = settings?.payroll?.allowedPaidHours || 0;

    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    if (req.user.role !== 'Admin' && userBranchId) {
      query.branch = userBranchId;
    }

    // Support search in query
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    const employees = await Employee.find(query);
    const attendance = await Attendance.find({
      date: { $regex: new RegExp(`^${month}`) }
    });

    const payrollRecords = employees.map(emp => {
      const empAtt = attendance.filter(a => a.user.toString() === emp._id.toString());
      
      let otPay = 0;
      let basePay = 0;
      let totalHours = 0;
      let otMin = 0;
      let leavesCount = 0; 
      
      empAtt.forEach(a => {
        totalHours += (a.duration || 0) / 60;
        otMin += (a.overtimeMinutes || 0);

        if (a.status === 'Half Day') {
            leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) / 2 : 0.5);
        } else if (a.status === 'Absent' || a.status === 'On Leave') {
            leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) : 1);
        }
        
        if (emp.payroll?.type === 'Monthly') {
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        } else {
            const regMin = (a.duration || 0) - (a.overtimeMinutes || 0);
            basePay += (regMin / 60) * (emp.payroll?.baseAmount || 0);
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        }
      });

      let deduction = 0;
      if (emp.payroll?.type === 'Monthly') {
          const rawSalary = emp.payroll?.baseAmount || emp.salary || 0;
          const dailyRate = rawSalary / 30;
          const unpaidDays = Math.max(0, leavesCount - globalPaidDays);
          deduction = unpaidDays * dailyRate;
          basePay = rawSalary - deduction;
      } else {
          const paidMissedHours = Math.min(leavesCount, globalPaidHours);
          const hourlyRate = emp.payroll?.baseAmount || 0;
          basePay += paidMissedHours * hourlyRate;
          deduction = Math.max(0, leavesCount - globalPaidHours) * hourlyRate;
      }

      return {
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        basePay: Math.round(basePay),
        otPay: Math.round(otPay),
        deduction: Math.round(deduction),
        leavesCount: Math.round(leavesCount * 10) / 10,
        totalPay: Math.round(basePay + otPay),
        totalHours: Math.round(totalHours * 10) / 10,
        otHours: Math.round((otMin / 60) * 10) / 10,
        daysWorked: empAtt.length,
        payType: emp.payroll?.type || 'Monthly'
      };
    });

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
