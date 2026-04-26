const Invoice = require('../../models/finance/Invoice');
const Expense = require('../../models/finance/Expense');
const User = require('../../models/core/User');
const Employee = require('../../models/human-resources/Employee');
const Attendance = require('../../models/human-resources/Attendance');
const Appointment = require('../../models/operations/Appointment');
const Inventory = require('../../models/inventory/Inventory');
const { getBranchId } = require('../../utils/branch');

const parseTimeToMinutes = (time = '') => {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return 0;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
};

const compareAppointments = (a, b) => {
  const dateCompare = String(a.date || '').localeCompare(String(b.date || ''));
  if (dateCompare !== 0) return dateCompare;
  return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
};

// @desc    Get dashboard summary stats
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? req.query.branch : null;
    const userBranchId = getBranchId(req.user.branch);

    // Branching logic for Role-specific dynamism
    if (req.user.role === 'Client') {
      const myAppointments = await Appointment.find({
        clientId: req.user._id
      }).sort({ date: -1 }).lean();
      const totalVisits = myAppointments.filter(a => a.status === 'Completed').length;
      const upcomingApt = myAppointments
        .filter(a => ['Pending', 'Confirmed'].includes(a.status) && a.date >= todayStr)
        .sort(compareAppointments)[0];
      
      return res.json({
        role: 'Client',
        loyalty: {
          points: totalVisits * 100,
          tier: totalVisits > 20 ? 'Platinum' : totalVisits > 10 ? 'Gold' : 'Silver'
        },
        visits: {
          total: totalVisits,
          all: myAppointments.slice(0, 5)
        },
        nextAppointment: upcomingApt ? { date: upcomingApt.date, service: upcomingApt.service, time: upcomingApt.time } : null
      });
    }

    if (req.user.role === 'Employee') {
      const myAppointments = await Appointment.find({
        employeeId: req.user._id
      }).populate('clientId').sort({ date: -1 }).lean();
      const completed = myAppointments.filter(a => a.status === 'Completed').length;
      const todayApts = myAppointments.filter(a => a.date === todayStr).length;
      
      // Calculate earnings (simplified)
      const estimatedEarnings = completed * 50; // Mock unit rate per service

      return res.json({
        role: 'Employee',
        performance: {
          completed,
          today: todayApts,
          score: completed * 15,
          earnings: estimatedEarnings
        },
        recentRituals: myAppointments.slice(0, 5).map(apt => ({
          ...apt,
          client: apt.clientId?.name || apt.clientName || apt.client || 'Guest'
        }))
      });
    }

    // Default Admin/Manager Logic
    let matchQuery = {};
    if (req.user.role === 'Admin' && requestedBranch) {
      matchQuery.branch = requestedBranch;
    } else if (req.user.role !== 'Admin' && userBranchId) {
      matchQuery.branch = userBranchId;
    }

    // ... (rest of the Admin/Manager logic remains same but ensuring it's robust)
    const totalRevenueResult = await Invoice.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const totalExpensesResult = await Expense.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const totalExpenses = totalExpensesResult[0]?.total || 0;

    const todayRevenueResult = await Invoice.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    const todayExpensesResult = await Expense.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    const todayExpenses = todayExpensesResult[0]?.total || 0;

    const totalClients = await User.countDocuments({ ...matchQuery, role: 'Client' });
    const newClientsToday = await User.countDocuments({ ...matchQuery, role: 'Client', createdAt: { $gte: today } });

    let attendanceToday = 0;
    if (matchQuery.branch) {
      const branchEmployees = await Employee.find({ branch: matchQuery.branch }).select('_id');
      const branchEmployeeIds = branchEmployees.map(employee => employee._id);
      attendanceToday = await Attendance.countDocuments({
        user: { $in: branchEmployeeIds },
        date: todayStr,
        status: 'Present'
      });
    } else {
      attendanceToday = await Attendance.countDocuments({ date: todayStr, status: 'Present' });
    }
    
    const activeAppointments = await Appointment.countDocuments({ 
      ...matchQuery, 
      status: { $in: ['Pending', 'Confirmed'] }, 
      date: todayStr
    });

    const lowStockItems = await Inventory.countDocuments({ ...matchQuery, $expr: { $lte: ['$stock', '$lowStock'] } });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const revenueTrend = await Invoice.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          total: { $sum: '$total' } 
      }},
      { $sort: { _id: 1 } }
    ]);

    const expenseTrend = await Expense.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: sevenDaysAgo } } },
      { $group: { 
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, 
          total: { $sum: '$amount' } 
      }},
      { $sort: { _id: 1 } }
    ]);

    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayRevenue = revenueTrend.find(r => r._id === dateStr)?.total || 0;
      const dayExpense = expenseTrend.find(e => e._id === dateStr)?.total || 0;
      trendData.push({ name: dayName, revenue: dayRevenue, expenses: dayExpense });
    }

    const recentAppointments = await Appointment.find(matchQuery)
      .populate('clientId')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    const topServices = await Appointment.aggregate([
      { $match: matchQuery },
      { $group: { _id: '$service', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    res.json({
      role: req.user.role,
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        trend: trendData
      },
      expenses: {
        total: totalExpenses,
        today: todayExpenses,
        trend: trendData.map(day => ({ name: day.name, value: day.expenses }))
      },
      profit: {
        total: totalRevenue - totalExpenses
      },
      clients: {
        total: totalClients,
        newToday: newClientsToday
      },
      attendance: {
        presentToday: attendanceToday
      },
      appointments: {
        activeCount: activeAppointments,
        recent: recentAppointments.map(apt => ({
          _id: apt._id,
          client: apt.clientId?.name || apt.clientName || apt.client || 'Guest',
          service: apt.serviceName || apt.service,
          employee: apt.employeeName || apt.employee,
          status: apt.status,
          time: apt.time
        }))
      },
      inventory: {
        lowStockCount: lowStockItems
      },
      topServices: topServices.map(s => ({ name: s._id, value: s.count }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
