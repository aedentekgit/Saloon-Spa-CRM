const Permission = require('../../models/human-resources/Permission');
const Employee = require('../../models/human-resources/Employee');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

// @desc    Get all permissions
// @route   GET /api/permissions
// @access  Private
const getPermissions = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) query.branch = toObjectIdIfValid(requestedBranch);
    } else if (req.user.role === 'Employee' || req.user.role === 'Client') {
      query.user = req.user._id;
      if (userBranchId) query.branch = toObjectIdIfValid(userBranchId);
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view permissions for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    const { data, pagination } = await paginateModelQuery(Permission, query, req, {
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a permission request
// @route   POST /api/permissions
// @access  Private
const createPermission = async (req, res) => {
  const { type, reason, date, startTime, endTime } = req.body;

  try {
    const employee = await Employee.findOne({ email: req.user.email });
    if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

    const permission = await Permission.create({
      user: req.user._id,
      employeeName: employee.name,
      type,
      reason,
      date,
      startTime,
      endTime,
      branch: employee.branch || getBranchId(req.user.branch)
    });

    res.status(201).json(permission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update permission status (Approval Workflow)
// @route   PATCH /api/permissions/:id/status
// @access  Private (Admin/Manager)
const updatePermissionStatus = async (req, res) => {
  const { status } = req.body;

  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) return res.status(404).json({ message: 'Permission request not found' });

    // Authorization Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = !['Employee', 'Client'].includes(req.user.role) && sameBranch(permission.branch, req.user.branch);
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    permission.status = status;
    await permission.save();

    res.json(permission);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getPermissions,
  createPermission,
  updatePermissionStatus
};
