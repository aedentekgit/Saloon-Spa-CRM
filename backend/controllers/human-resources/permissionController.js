const Permission = require('../../models/human-resources/Permission');
const Employee = require('../../models/human-resources/Employee');
const { paginateModelQuery } = require('../../utils/pagination');

// @desc    Get all permissions
// @route   GET /api/permissions
// @access  Private
const getPermissions = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
      query.user = req.user._id;
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
      branch: employee.branch
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
    if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
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
