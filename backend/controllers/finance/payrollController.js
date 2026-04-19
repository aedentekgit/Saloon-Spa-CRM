const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');
const Settings = require('../../models/core/Settings');

// @desc    Generate payroll report for a specific month
// @route   GET /api/payroll
// @access  Private/Admin
exports.generatePayroll = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
    }

    // Fetch Global Settings
    const settings = await Settings.findOne();
    const globalPaidDays = settings?.payroll?.allowedPaidLeaves || 0;
    const globalPaidHours = settings?.payroll?.allowedPaidHours || 0;

    let query = {};
    if (req.user.role !== 'Admin' && req.user.branch) {
      query.branch = req.user.branch;
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
      let leavesCount = 0; // In days for Monthly, in Hours for Hourly
      
      // Calculate earnings from attendance
      empAtt.forEach(a => {
        totalHours += (a.duration || 0) / 60;
        otMin += (a.overtimeMinutes || 0);

        if (a.status === 'Half Day') {
            leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) / 2 : 0.5);
        } else if (a.status === 'Absent' || a.status === 'On Leave') {
            leavesCount += (emp.payroll?.type === 'Hourly' ? (emp.payroll?.shiftHours || 8) : 1);
        }
        
        if (emp.payroll?.type === 'Monthly') {
            // Fixed base, handled after loop
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        } else {
            const regMin = (a.duration || 0) - (a.overtimeMinutes || 0);
            basePay += (regMin / 60) * (emp.payroll?.baseAmount || 0);
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        }
      });

      // Special Logic for monthly base pay and deductions
      let deduction = 0;
      if (emp.payroll?.type === 'Monthly') {
          const rawSalary = emp.payroll?.baseAmount || emp.salary || 0;
          const dailyRate = rawSalary / 30;
          const unpaidDays = Math.max(0, leavesCount - globalPaidDays);
          
          deduction = unpaidDays * dailyRate;
          basePay = rawSalary - deduction;
      } else {
          // For Hourly, "Paid Leave" means we ADD pay for missed hours within threshold
          // If they missed 'leavesCount' hours, and 'globalPaidHours' are allowed.
          const paidMissedHours = Math.min(leavesCount, globalPaidHours);
          const hourlyRate = emp.payroll?.baseAmount || 0;
          
          const leaveBenefit = paidMissedHours * hourlyRate;
          basePay += leaveBenefit; // Adding benefit to what they already earned
          
          // Deduction for Hourly means they just don't get paid for unpaid missed hours
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

    res.json(payrollRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
