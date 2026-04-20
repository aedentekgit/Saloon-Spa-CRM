const Attendance = require('../../models/human-resources/Attendance');
const Employee = require('../../models/human-resources/Employee');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// Haversine formula to calculate distance between two coordinates in meters
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Helper to calculate total minutes from time string (e.g., "10:30 AM")
const timeToMinutes = (timeStr) => {
  if (!timeStr || timeStr === '--') return 0;
  try {
    const parts = timeStr.trim().split(/\s+/);
    const timePart = parts[0];
    const modifier = parts[1] ? parts[1].toUpperCase() : '';
    
    let [hours, minutes] = timePart.split(':');
    hours = parseInt(hours);
    minutes = parseInt(minutes);
    
    if (hours === 12) {
      hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
      hours += 12;
    }
    return (hours * 60) + minutes;
  } catch (e) {
    return 0;
  }
};

// @desc    Get attendance history
// @route   GET /api/attendance
// @access  Private
const getAttendance = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const { branch } = req.query;
    let query = {};
    const userBranchId = getBranchId(req.user.branch);

    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      // Employee: only own records
      query.user = req.user._id;
    } else {
      // Admin/Manager: filter by branch if provided, or default for Manager
      let branchToFilter = branch;
      
      if (req.user.role === 'Manager' && userBranchId) {
        branchToFilter = userBranchId;
      }

      if (branchToFilter && branchToFilter !== 'all') {
        const branchEmployees = await Employee.find({ branch: branchToFilter }).select('_id');
        const userIds = branchEmployees.map(emp => emp._id);
        query.user = { $in: userIds };
      }
    }

    const { data, pagination } = await paginateModelQuery(Attendance, query, req, {
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Mark attendance (Check-in/Check-out with Payroll Logic)
// @route   POST /api/attendance
// @access  Private
const markAttendance = async (req, res) => {
  const { date, checkIn, checkOut, status, employeeName, shift, targetUserId } = req.body;

  try {
    const userBranchId = getBranchId(req.user.branch);

    // If targetUserId is provided and requester is Admin/Manager, use that ID
    const userId = (targetUserId && (req.user.role === 'Admin' || req.user.role === 'Manager')) 
      ? targetUserId 
      : req.user._id;

    let employee;
    if (targetUserId && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
      employee = await Employee.findById(targetUserId).populate('branch');
      // IDOR Check: Manager can only mark attendance for their eigene employees
      if (req.user.role === 'Manager' && !sameBranch(employee?.branch, userBranchId)) {
         return res.status(403).json({ message: 'Access Denied: You cannot manage attendance for other branches.' });
      }
    } else {
      employee = await Employee.findOne({ email: req.user.email }).populate('branch');
    }
    
    const isManualAdminEntry = (req.user.role === 'Admin' || req.user.role === 'Manager') && targetUserId;
    
    if (!isManualAdminEntry && employee && employee.branch) {
       const branch = employee.branch;
       const { lat, lng, radius, allowedIPs } = branch;
       
       if (lat && lng && radius > 0) {
          const staffLat = req.body.latitude;
          const staffLng = req.body.longitude;
          if (!staffLat || !staffLng) {
             return res.status(403).json({ message: 'Spatial Access Required' });
          }
          const distance = calculateDistance(lat, lng, staffLat, staffLng);
          if (distance > radius) {
             return res.status(403).json({ message: 'Presence Out of Bounds' });
          }
       }
       
       if (allowedIPs && allowedIPs.length > 0) {
          const staffIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
          const cleanIP = staffIP.includes('::ffff:') ? staffIP.split('::ffff:')[1] : staffIP;
          const isWhitelisted = allowedIPs.some(ip => ip === cleanIP || cleanIP.includes(ip));
          if (!isWhitelisted) {
             return res.status(403).json({ message: `Network Restriction` });
          }
       }
    }
    
    let record = await Attendance.findOne({ user: userId, date: date });

    if (!record) {
      record = await Attendance.create({
        user: userId,
        employeeName: employee ? employee.name : employeeName,
        date,
        checkIn,
        checkOut: checkOut || '--',
        shift: shift || 'None',
        status: status || 'Present'
      });
    } else {
      if (checkIn) record.checkIn = checkIn;
      if (checkOut) record.checkOut = checkOut;
      if (status) record.status = status;
    }

    if (record.checkIn && record.checkOut && record.checkOut !== '--') {
      const start = timeToMinutes(record.checkIn);
      const end = timeToMinutes(record.checkOut);
      if (end > start) {
        const duration = end - start;
        record.duration = duration;
        if (employee && employee.payroll) {
          const shiftMinutes = (employee.payroll.shiftHours || 8) * 60;
          const otMinutes = Math.max(0, duration - shiftMinutes);
          record.overtimeMinutes = otMinutes;
          let dailyEarnings = 0;
          const { type, baseAmount, otRate } = employee.payroll;
          if (type === 'Monthly') {
            const dailyBase = (employee.salary || 0) / 30;
            const otPay = (otMinutes / 60) * (otRate || 0);
            dailyEarnings = dailyBase + otPay;
          } else {
            const regularMinutes = Math.min(duration, shiftMinutes);
            const regularPay = (regularMinutes / 60) * (baseAmount || 0);
            const otPay = (otMinutes / 60) * (otRate || 0);
            dailyEarnings = regularPay + otPay;
          }
          record.dailyEarnings = Math.round(dailyEarnings);
          employee.earnings = (employee.earnings || 0) + record.dailyEarnings;
          await employee.save();
        }
      }
    }
    
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // IDOR Check
    const employee = await Employee.findById(record.user).populate('branch');
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee?.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Not authorized: You cannot delete attendance for other branches.' });
    }

    if (record.dailyEarnings && employee) {
        employee.earnings = Math.max(0, (employee.earnings || 0) - record.dailyEarnings);
        await employee.save();
    }

    await record.deleteOne();
    res.json({ message: 'Record removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateAttendance = async (req, res) => {
  const { checkIn, checkOut, status } = req.body;

  try {
    const record = await Attendance.findById(req.params.id);
    if (!record) return res.status(404).json({ message: 'Record not found' });

    // IDOR Check
    const employee = await Employee.findById(record.user).populate('branch');
    const isBranchManager = req.user.role === 'Manager' && sameBranch(employee?.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const oldEarnings = record.dailyEarnings || 0;

    if (checkIn) record.checkIn = checkIn;
    if (checkOut) record.checkOut = checkOut;
    if (status) record.status = status;

    if (record.checkIn && record.checkOut && record.checkOut !== '--') {
      const start = timeToMinutes(record.checkIn);
      const end = timeToMinutes(record.checkOut);
      if (end > start) {
        const duration = end - start;
        record.duration = duration;
        if (employee && employee.payroll) {
          const shiftMinutes = (employee.payroll.shiftHours || 8) * 60;
          const otMinutes = Math.max(0, duration - shiftMinutes);
          record.overtimeMinutes = otMinutes;
          let dailyEarnings = 0;
          const { type, baseAmount, otRate } = employee.payroll;
          if (type === 'Monthly') {
            const dailyBase = (employee.salary || 0) / 30;
            const otPay = (otMinutes / 60) * (otRate || 0);
            dailyEarnings = dailyBase + otPay;
          } else {
            const regularMinutes = Math.min(duration, shiftMinutes);
            const regularPay = (regularMinutes / 60) * (baseAmount || 0);
            const otPay = (otMinutes / 60) * (otRate || 0);
            dailyEarnings = regularPay + otPay;
          }
          record.dailyEarnings = Math.round(dailyEarnings);
          employee.earnings = Math.max(0, (employee.earnings || 0) - oldEarnings + record.dailyEarnings);
          await employee.save();
        }
      }
    }

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  deleteAttendance,
  updateAttendance
};
