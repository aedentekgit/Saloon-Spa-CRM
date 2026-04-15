const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');

// @desc    Generate payroll report for a specific month
// @route   GET /api/payroll
// @access  Private/Admin
exports.generatePayroll = async (req, res) => {
  try {
    const { month } = req.query; // Format: YYYY-MM
    if (!month) {
      return res.status(400).json({ message: 'Month (YYYY-MM) is required' });
    }

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
      
      empAtt.forEach(a => {
        totalHours += (a.duration || 0) / 60;
        otMin += (a.overtimeMinutes || 0);
        
        if (emp.payroll?.type === 'Monthly') {
            basePay = emp.payroll?.baseAmount || emp.salary || 0;
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        } else {
            const regMin = (a.duration || 0) - (a.overtimeMinutes || 0);
            basePay += (regMin / 60) * (emp.payroll?.baseAmount || 0);
            otPay += ((a.overtimeMinutes || 0) / 60) * (emp.payroll?.otRate || 0);
        }
      });

      return {
        employeeId: emp._id,
        name: emp.name,
        role: emp.role,
        basePay: Math.round(basePay),
        otPay: Math.round(otPay),
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
