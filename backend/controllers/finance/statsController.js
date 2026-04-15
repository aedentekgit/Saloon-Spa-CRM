const Invoice = require('../../models/finance/Invoice');
const Expense = require('../../models/finance/Expense');
const Client = require('../../models/operations/Client');
const Attendance = require('../../models/human-resources/Attendance');
const Appointment = require('../../models/operations/Appointment');
const Inventory = require('../../models/inventory/Inventory');

// @desc    Get dashboard summary stats
// @route   GET /api/stats/dashboard
// @access  Private
exports.getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let matchQuery = {};
    if (req.user.role !== 'Admin' && req.user.branch) {
      matchQuery.branch = req.user.branch;
    }

    // 1. Revenue Stats
    const totalRevenueResult = await Invoice.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const totalRevenue = totalRevenueResult[0]?.total || 0;

    const todayRevenueResult = await Invoice.aggregate([
      { $match: { ...matchQuery, createdAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);
    const todayRevenue = todayRevenueResult[0]?.total || 0;

    // 2. Client Stats
    const totalClients = await Client.countDocuments(matchQuery);
    const newClientsToday = await Client.countDocuments({ ...matchQuery, createdAt: { $gte: today } });

    // 3. Attendance Stats
    const attendanceToday = await Attendance.countDocuments({ ...matchQuery, date: today.toISOString().split('T')[0], status: 'Present' });
    const totalEmployees = await Attendance.distinct('user', { ...matchQuery, date: today.toISOString().split('T')[0] });
    const attendanceRate = totalEmployees.length > 0 ? (attendanceToday / totalEmployees.length) * 100 : 0;

    // 4. Appointment Stats
    const activeAppointments = await Appointment.countDocuments({ ...matchQuery, status: 'Confirmed', date: { $gte: today.toISOString().split('T')[0] } });

    // 5. Inventory Stats
    const lowStockItems = await Inventory.countDocuments({ ...matchQuery, $expr: { $lte: ['$stock', '$lowStock'] } });

    // 6. 7-Day Trend Optimized: Single aggregation for revenue and expenses
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);

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

    // Format trend data for frontend
    const trendData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      
      const dayRevenue = revenueTrend.find(r => r._id === dateStr)?.total || 0;
      const dayExpense = expenseTrend.find(e => e._id === dateStr)?.total || 0;

      trendData.push({
        name: dayName,
        revenue: dayRevenue,
        expenses: dayExpense
      });
    }

    res.json({
      revenue: {
        total: totalRevenue,
        today: todayRevenue,
        trend: trendData
      },
      clients: {
        total: totalClients,
        newToday: newClientsToday
      },
      attendance: {
        presentToday: attendanceToday,
        rate: Math.round(attendanceRate)
      },
      appointments: {
        activeCount: activeAppointments
      },
      inventory: {
        lowStockCount: lowStockItems
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
