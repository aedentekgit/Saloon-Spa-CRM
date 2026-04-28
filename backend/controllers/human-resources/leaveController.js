const Leave = require('../../models/human-resources/Leave');
const Employee = require('../../models/human-resources/Employee');
const Branch = require('../../models/operations/Branch');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyLeaveSearch = async (query, search) => {
  const searchTerm = String(search || '').trim();
  if (!searchTerm) return query;

  const searchRegex = new RegExp(escapeRegex(searchTerm), 'i');
  const matchingBranches = await Branch.find({ name: searchRegex }).select('_id').lean();
  const branchIds = matchingBranches.map(branch => branch._id);

  query.$or = [
    { employeeName: searchRegex },
    { type: searchRegex },
    { reason: searchRegex },
    { status: searchRegex },
    { startDate: searchRegex },
    { endDate: searchRegex }
  ];

  if (branchIds.length > 0) {
    query.$or.push({ branch: { $in: branchIds } });
  }

  const numericSearch = Number(searchTerm);
  if (Number.isFinite(numericSearch)) {
    query.$or.push({ daysCount: numericSearch });
  }

  const dateSearch = new Date(searchTerm);
  if (searchTerm.includes('-') && !Number.isNaN(dateSearch.getTime())) {
    const startOfDay = new Date(dateSearch);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateSearch);
    endOfDay.setHours(23, 59, 59, 999);
    query.$or.push(
      { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
    );
  }

  return query;
};

// @desc    Get leave requests
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = toObjectIdIfValid(requestedBranch);
      }
    } else if (req.user.role === 'Employee' || req.user.role === 'Client') {
      query.user = req.user._id;
      if (userBranchId) query.branch = toObjectIdIfValid(userBranchId);
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view leave requests for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    await applyLeaveSearch(query, req.query.search);

    const { data, pagination } = await paginateModelQuery(Leave, query, req, {
      populate: 'branch',
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit leave request
// @route   POST /api/leaves
// @access  Private
const createLeave = async (req, res) => {
  const { employeeName, employeeId, type, reason, startDate, endDate, daysCount } = req.body;

  try {
    let leaveOwnerId = req.user._id;
    let leaveBranch = getBranchId(req.user.branch) || undefined;
    let leaveEmployeeName = employeeName || req.user.name;

    const canCreateForStaff = req.user.role === 'Admin' || !['Employee', 'Client'].includes(req.user.role);
    if (canCreateForStaff) {
      if (!employeeName) {
        return res.status(400).json({ message: 'Employee selection is required' });
      }

      const lookup = employeeId ? { _id: employeeId } : { name: employeeName };
      const targetEmployee = await Employee.findOne(lookup).select('_id name branch status');

      if (!targetEmployee) {
        return res.status(404).json({ message: 'Selected employee not found' });
      }

      if (targetEmployee.status !== 'Active') {
        return res.status(400).json({ message: 'Selected employee is not active' });
      }

      if (req.user.role !== 'Admin' && !sameBranch(targetEmployee.branch, req.user.branch)) {
        return res.status(403).json({ message: 'Access Denied: You can only create leave requests for your own branch.' });
      }

      leaveOwnerId = targetEmployee._id;
      leaveEmployeeName = targetEmployee.name;
      leaveBranch = getBranchId(targetEmployee.branch) || leaveBranch;
    }

    // Conflict Check: Prevent leave application if already marked Present in Attendance
    const Attendance = require('../../models/human-resources/Attendance');
    const conflictAttendance = await Attendance.findOne({
      user: leaveOwnerId,
      date: { $gte: startDate, $lte: endDate },
      status: 'Present'
    });

    if (conflictAttendance) {
       return res.status(400).json({ message: `Conflict Detected: Specialist was marked Present on ${conflictAttendance.date}. Please rectify attendance record first.` });
    }

    const leave = await Leave.create({
      user: leaveOwnerId,
      employeeName: leaveEmployeeName,
      type,
      reason,
      startDate,
      endDate,
      daysCount: daysCount || 1,
      status: 'Pending',
      branch: leaveBranch
    });

    res.status(201).json(leave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update leave status
// @route   PUT /api/leaves/:id
// @access  Private (Admin/Manager)
const updateLeaveStatus = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchMatch = sameBranch(leave.branch, req.user.branch);
    if (!isAdmin && !isBranchMatch) {
      return res.status(403).json({ message: 'Access Denied: Leave request belongs to another branch.' });
    }
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && isBranchMatch;

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You cannot moderate leave requests from other branches.' });
    }

    leave.status = req.body.status || leave.status;
    const updatedLeave = await leave.save();
    res.json(updatedLeave);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete leave request
// @route   DELETE /api/leaves/:id
// @access  Private
const deleteLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    // IDOR Check: Only the owner (Employee) or their Manager/Admin can delete
    const isAdmin = req.user.role === 'Admin';
    const isBranchMatch = sameBranch(leave.branch, req.user.branch);
    if (!isAdmin && !isBranchMatch) {
      return res.status(403).json({ message: 'Access Denied: Leave request belongs to another branch.' });
    }
    const isOwner = leave.user?.toString() === req.user._id.toString();
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && isBranchMatch;

    if (!isAdmin && !isBranchManager && !isOwner) {
       return res.status(403).json({ message: 'Access Denied: You do not have permission to remove this leave request.' });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave request removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getLeaves,
  createLeave,
  updateLeaveStatus,
  deleteLeave
};
