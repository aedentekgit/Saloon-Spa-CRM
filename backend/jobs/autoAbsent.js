const Attendance = require('../models/human-resources/Attendance');
const Employee = require('../models/human-resources/Employee');
const Leave = require('../models/human-resources/Leave');
const User = require('../models/core/User');

const getDatesInRange = (startStr, endStr) => {
  const dates = [];
  const current = new Date(startStr + 'T00:00:00Z');
  const end = new Date(endStr + 'T00:00:00Z');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

const toDateStr = (d) => d.toISOString().split('T')[0];

/**
 * Mark absent (or on-leave) for all employees on every past date
 * where no attendance record exists.
 * @param {number} lookbackDays - How far back to scan (default 365)
 * @returns {number} Total records created
 */
const autoMarkAbsent = async (lookbackDays = 365) => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = toDateStr(yesterday);

  const maxLookback = new Date(today);
  maxLookback.setUTCDate(maxLookback.getUTCDate() - lookbackDays);
  const maxLookbackStr = toDateStr(maxLookback);

  const employees = await Employee.find({}).select('_id name email createdAt').lean();

  // Build email → User._id map in one query so attendance user matches check-in records
  const emails = employees.map(e => e.email).filter(Boolean);
  const userDocs = await User.find({ email: { $in: emails } }).select('_id email').lean();
  const emailToUserId = new Map(userDocs.map(u => [u.email, u._id]));

  let totalMarked = 0;

  for (const employee of employees) {
    // Use User._id so absent records are consistent with check-in records
    const userId = emailToUserId.get(employee.email) || employee._id;

    // Start from whichever is later: employee join date or max lookback
    const joinDate = new Date(employee.createdAt);
    joinDate.setUTCHours(0, 0, 0, 0);
    const startDate = joinDate > maxLookback ? joinDate : maxLookback;
    const startStr = toDateStr(startDate);

    if (startStr > yesterdayStr) continue; // employee joined today or future

    const allDates = getDatesInRange(startStr, yesterdayStr);
    if (allDates.length === 0) continue;

    // Find which dates already have a record (query by both userId and employee._id for legacy records)
    const existingRecords = await Attendance.find({
      user: { $in: [userId, employee._id] },
      date: { $gte: startStr, $lte: yesterdayStr }
    }).select('date').lean();

    const existingDates = new Set(existingRecords.map(r => r.date));
    const missingDates = allDates.filter(d => !existingDates.has(d));
    if (missingDates.length === 0) continue;

    // Find approved leaves covering missing dates (check both IDs for legacy data)
    const leaves = await Leave.find({
      user: { $in: [userId, employee._id] },
      status: 'Approved',
      startDate: { $lte: yesterdayStr },
      endDate: { $gte: startStr }
    }).select('startDate endDate').lean();

    const leaveDates = new Set();
    for (const leave of leaves) {
      getDatesInRange(leave.startDate, leave.endDate).forEach(d => leaveDates.add(d));
    }

    const records = missingDates.map(date => ({
      user: userId,  // Always use User._id so it matches check-in records
      employeeName: employee.name,
      date,
      checkIn: '--',
      checkOut: '--',
      status: leaveDates.has(date) ? 'On Leave' : 'Absent',
      shift: 'None',
      duration: 0,
      overtimeMinutes: 0,
      dailyEarnings: 0
    }));

    if (records.length > 0) {
      await Attendance.insertMany(records, { ordered: false });
      totalMarked += records.length;
    }
  }

  console.log(`[AutoAbsent] Completed — ${totalMarked} records created.`);
  return totalMarked;
};

// Schedules daily run at 00:01 AM server time
const scheduleAutoAbsent = () => {
  const scheduleNext = () => {
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setDate(nextRun.getDate() + 1);
    nextRun.setHours(0, 1, 0, 0);
    const delay = nextRun - now;

    setTimeout(async () => {
      try {
        await autoMarkAbsent();
      } catch (err) {
        console.error('[AutoAbsent] Daily run error:', err.message);
      }
      scheduleNext();
    }, delay);

    console.log(`[AutoAbsent] Next run scheduled at ${nextRun.toLocaleString()}`);
  };

  // Run on startup to backfill any historical gaps
  autoMarkAbsent()
    .then(() => scheduleNext())
    .catch(err => {
      console.error('[AutoAbsent] Startup run error:', err.message);
      scheduleNext();
    });
};

module.exports = { autoMarkAbsent, scheduleAutoAbsent };
