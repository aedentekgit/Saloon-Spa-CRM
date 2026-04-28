const Attendance = require('../../models/human-resources/Attendance');
const Employee = require('../../models/human-resources/Employee');
const Leave = require('../../models/human-resources/Leave');
const Shift = require('../../models/human-resources/Shift');
const User = require('../../models/core/User');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');
const { autoMarkAbsent } = require('../../jobs/autoAbsent');

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

    const { branch, startDate, endDate, user: userId, employeeName } = req.query;
    let query = {};

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    if (userId) {
      query.user = userId;
    }

    if (employeeName) {
      query.employeeName = { $regex: new RegExp(`^${employeeName}$`, 'i') };
    }
    const userBranchId = getBranchId(req.user.branch);

    if (req.user.role === 'Employee' || req.user.role === 'Client') {
      query.user = req.user._id;
    } else {
      let branchToFilter = branch;

      if (req.user.role !== 'Admin') {
        if (!userBranchId) {
          return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
        }
        if (branch && branch !== 'all' && !sameBranch(branch, userBranchId)) {
          return res.status(403).json({ message: 'Access Denied: Cannot view attendance for another branch.' });
        }
        branchToFilter = userBranchId;
      }

      if (branchToFilter && branchToFilter !== 'all') {
        const [branchEmployees, branchUsers] = await Promise.all([
          Employee.find({ branch: branchToFilter }).select('_id'),
          User.find({ branch: branchToFilter }).select('_id')
        ]);
        const userIds = [
          ...branchEmployees.map(emp => emp._id),
          ...branchUsers.map(user => user._id)
        ];
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

// @desc    Check-in (Staff Portal)
// @route   POST /api/attendance/check-in
// @access  Private
const checkIn = async (req, res) => {
  const { date, time, latitude, longitude } = req.body;

  try {
    const employee = await Employee.findOne({ email: req.user.email }).populate('branch');
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    // 1. Shift Rule: Cannot check in before [Shift Start - 5 mins]
    if (employee.shift) {
      const shiftDoc = await Shift.findOne({ name: employee.shift });
      if (shiftDoc) {
        const shiftStartMins = timeToMinutes(shiftDoc.startTime);
        const currentMins = timeToMinutes(time);

        if (currentMins < (shiftStartMins - 5)) {
          return res.status(400).json({
            message: `Too Early: Check-in for ${employee.shift} (${shiftDoc.startTime}) only starts at ${minutesToTime(shiftStartMins - 5)}.`
          });
        }
      }
    }

    // 2. Duplicate Check: No multiple check-ins
    let record = await Attendance.findOne({ user: req.user._id, date: date });
    if (record && record.checkIn !== '--') {
      return res.status(400).json({ message: 'Already checked in for today' });
    }

    // 3. Geofence/IP Restriction
    if (employee.branch) {
      const { lat, lng, radius, allowedIPs } = employee.branch;
      const hasGeofence = !!(lat && lng && radius > 0);
      const hasIPRestriction = !!(allowedIPs && allowedIPs.length > 0);

      let geofenceMatch = true;
      let ipMatch = true;

      if (hasGeofence) {
        if (!latitude || !longitude) {
          geofenceMatch = false;
        } else {
          const distance = calculateDistance(lat, lng, latitude, longitude);
          geofenceMatch = (distance <= radius);
        }
      }

      if (hasIPRestriction) {
        const staffIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const cleanIP = staffIP.includes('::ffff:') ? staffIP.split('::ffff:')[1] : staffIP;

        console.log('--- CHECK-IN IP DEBUG ---');
        console.log('Detected IP:', cleanIP);
        console.log('Allowed IPs:', allowedIPs);

        ipMatch = allowedIPs.some(ip => ip === cleanIP || cleanIP.includes(ip));
      }

      if (hasGeofence && hasIPRestriction) {
        if (!geofenceMatch && !ipMatch) return res.status(403).json({ message: 'Presence Denied: Outside boundaries and unauthorized network.' });
      } else if (hasGeofence && !geofenceMatch) {
        return res.status(403).json({ message: 'Presence Out of Bounds: Please ensure you are at the sanctuary.' });
      } else if (hasIPRestriction && !ipMatch) {
        return res.status(403).json({ message: 'Network Restriction: Please connect to the sanctuary Wi-Fi.' });
      }
    }

    // 4. Create/Update Record
    if (!record) {
      record = await Attendance.create({
        user: req.user._id,
        employeeName: employee.name,
        date,
        checkIn: time,
        shift: employee.shift || 'None',
        status: 'Present'
      });
    } else {
      record.checkIn = time;
      record.status = 'Present';
      await record.save();
    }

    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Check-out (Staff Portal)
// @route   POST /api/attendance/check-out
// @access  Private
const checkOut = async (req, res) => {
  const { date, time } = req.body;

  try {
    const employee = await Employee.findOne({ email: req.user.email }).populate('branch');
    let record = await Attendance.findOne({ user: req.user._id, date: date });

    if (!record || record.checkIn === '--') {
      return res.status(400).json({ message: 'No check-in record found for today' });
    }

    if (record.checkOut !== '--') {
      return res.status(400).json({ message: 'Already checked out for today' });
    }

    record.checkOut = time;

    // Calculate duration and earnings
    const start = timeToMinutes(record.checkIn);
    const end = timeToMinutes(time);

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

    await record.save();
    res.json(record);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Helper to convert minutes back to time string
const minutesToTime = (totalMinutes) => {
  let hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const modifier = hours >= 12 ? 'PM' : 'AM';
  if (hours > 12) hours -= 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes.toString().padStart(2, '0')} ${modifier}`;
};

// @desc    Mark attendance (Admin Manual Entry)
const markAttendance = async (req, res) => {
  const { date, checkIn, checkOut, status, employeeName, shift, targetUserId } = req.body;

  try {
    const userBranchId = getBranchId(req.user.branch);

    // If targetUserId is provided and requester is Admin/Manager, use that ID
    const canManageBranchStaff = req.user.role === 'Admin' || !['Employee', 'Client'].includes(req.user.role);
    const userId = (targetUserId && canManageBranchStaff)
      ? targetUserId
      : req.user._id;

    let employee;
    if (targetUserId && canManageBranchStaff) {
      employee = await Employee.findById(targetUserId).populate('branch');
      if (!employee) return res.status(404).json({ message: 'Employee profile not found' });
      // IDOR Check: Branch-scoped roles can only mark attendance for their own branch.
      if (req.user.role !== 'Admin' && !sameBranch(employee?.branch, userBranchId)) {
         return res.status(403).json({ message: 'Access Denied: You cannot manage attendance for other branches.' });
      }
    } else {
      employee = await Employee.findOne({ email: req.user.email }).populate('branch');
    }

    const isManualAdminEntry = canManageBranchStaff && targetUserId;

    if (!isManualAdminEntry && employee && employee.branch) {
       const branch = employee.branch;
       const { lat, lng, radius, allowedIPs } = branch;

       const hasGeofence = !!(lat && lng && radius > 0);
       const hasIPRestriction = !!(allowedIPs && allowedIPs.length > 0);

       let geofenceMatch = true;
       let ipMatch = true;

       if (hasGeofence) {
          const staffLat = req.body.latitude;
          const staffLng = req.body.longitude;
          if (!staffLat || !staffLng) {
             geofenceMatch = false;
          } else {
             const distance = calculateDistance(lat, lng, staffLat, staffLng);
             geofenceMatch = (distance <= radius);
          }
       }

       if (hasIPRestriction) {
          const staffIP = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
          const cleanIP = staffIP.includes('::ffff:') ? staffIP.split('::ffff:')[1] : staffIP;

          // Debug Log: Check your terminal/console to see this!
          console.log('--- ATTENDANCE IP DEBUG ---');
          console.log('Detected IP:', cleanIP);
          console.log('Allowed IPs:', allowedIPs);

          ipMatch = allowedIPs.some(ip => ip === cleanIP || cleanIP.includes(ip));
       }

       // OR Logic: If both are set, pass if either matches. If only one is set, it must match.
       if (hasGeofence && hasIPRestriction) {
          if (!geofenceMatch && !ipMatch) {
             return res.status(403).json({ message: 'Presence Denied: Outside sanctuary boundaries and unauthorized network.' });
          }
       } else if (hasGeofence && !geofenceMatch) {
          return res.status(403).json({ message: 'Presence Out of Bounds: Please ensure you are at the sanctuary or enable GPS.' });
       } else if (hasIPRestriction && !ipMatch) {
          return res.status(403).json({ message: 'Network Restriction: Please connect to the sanctuary Wi-Fi.' });
       }
    }

    // Conflict Check: Prevent marking Present/Absent if on Approved Leave
    const conflictLeave = await Leave.findOne({
      user: userId,
      status: 'Approved',
      startDate: { $lte: date },
      endDate: { $gte: date }
    });

    if (conflictLeave && (status === 'Present' || status === 'Absent')) {
       return res.status(400).json({ message: `Override Blocked: Staff is on approved ${conflictLeave.type} for this date.` });
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
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && sameBranch(employee?.branch, req.user.branch);
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
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && sameBranch(employee?.branch, req.user.branch);
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

// @desc    Admin: backfill absent records for all past dates
// @route   POST /api/attendance/backfill
// @access  Admin only
const backfillAbsent = async (req, res) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  try {
    const lookbackDays = parseInt(req.query.days) || 365;
    const totalMarked = await /** @type {Promise<number>} */ (autoMarkAbsent(lookbackDays));
    res.json({ message: `Backfill complete. ${totalMarked} absent records created.`, totalMarked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getAttendance,
  markAttendance,
  deleteAttendance,
  updateAttendance,
  checkIn,
  checkOut,
  backfillAbsent
};
