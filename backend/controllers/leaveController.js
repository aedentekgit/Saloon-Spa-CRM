const Leave = require('../models/Leave');
const { paginateModelQuery } = require('../utils/pagination');

// @desc    Get leave requests
// @route   GET /api/leaves
// @access  Private
const getLeaves = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      // Employee: own requests only
      query.user = req.user._id;
    } else if (req.user.role === 'Manager' && req.user.branch) {
      // Manager: only leaves from their branch
      query.branch = req.user.branch._id || req.user.branch;
    }
    // Admin: no filter
    const { data, pagination } = await paginateModelQuery(Leave, query, req, {
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
  const { employeeName, type, reason, date } = req.body;

  try {
    const leave = await Leave.create({
      user: req.user._id,
      employeeName,
      type,
      reason,
      date,
      status: 'Pending',
      branch: req.user.branch?._id || req.user.branch || undefined
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
    const isBranchManager = req.user.role === 'Manager' && leave.branch?.toString() === req.user.branch?.toString();
    const isAdmin = req.user.role === 'Admin';

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
    const isOwner = leave.user?.toString() === req.user._id.toString();
    const isBranchManager = req.user.role === 'Manager' && leave.branch?.toString() === req.user.branch?.toString();
    const isAdmin = req.user.role === 'Admin';

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
