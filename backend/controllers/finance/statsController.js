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
    const todayStr = today.toISOString().split('T')[0];

    // Branching logic for Role-specific dynamism
    if (req.user.role === 'Client') {
      const myAppointments = await Appointment.find({ client: req.user.name }).sort({ date: -1 }).lean();
      const totalVisits = myAppointments.filter(a => a.status === 'Completed').length;
      const upcomingApt = myAppointments.find(a => (a.status === 'Booked' || a.status === 'Confirmed') && a.date >= todayStr);
      
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
      const myAppointments = await Appointment.find({ employee: req.user.name }).sort({ date: -1 }).lean();
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
        recentRituals: myAppointments.slice(0, 5)
      });
    }

    // Default Admin/Manager Logic
    let matchQuery = {};
    if (req.user.role !== 'Admin' && req.user.branch) {
      matchQuery.branch = req.user.branch;
    }

    // ... (rest of the Admin/Manager logic remains same but ensuring it's robust)
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

    const totalClients = await Client.countDocuments(matchQuery);
    const newClientsToday = await Client.countDocuments({ ...matchQuery, createdAt: { $gte: today } });

    const attendanceToday = await Attendance.countDocuments({ ...matchQuery, date: todayStr, status: 'Present' });
    
    const activeAppointments = await Appointment.countDocuments({ 
      ...matchQuery, 
      status: { $in: ['Booked', 'Confirmed'] }, 
      date: { $gte: todayStr } 
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
          client: apt.clientName || apt.client,
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


