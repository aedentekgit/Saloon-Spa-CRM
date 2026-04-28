const User = require('../../models/core/User');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, toObjectIdIfValid } = require('../../utils/branch');

// @desc    Get all admins
// @route   GET /api/admins
// @access  Private/Admin
exports.getAdmins = async (req, res) => {
  try {
    const { data, pagination } = await paginateModelQuery(
      User,
      { role: { $in: ['Admin', 'Manager'] } },
      req,
      { populate: 'branch', sort: { createdAt: -1 } }
    );
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an admin
// @route   POST /api/admins
// @access  Private/Admin
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, status, role, branch } = req.body;
    const assignedRole = role || 'Admin';
    const assignedBranch = getBranchId(branch);

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    if (assignedRole !== 'Admin' && !assignedBranch) {
      return res.status(400).json({ message: 'Branch assignment is required for non-admin users.' });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: assignedRole,
      status: status || 'Active',
      isActive: (status || 'Active') === 'Active',
      branch: assignedBranch ? toObjectIdIfValid(assignedBranch) : undefined
    });

    res.status(201).json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update an admin
// @route   PUT /api/admins/:id
// @access  Private/Admin
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);

    if (admin && (admin.role === 'Admin' || admin.role === 'Manager')) {
      const { name, email, status, password, role, branch } = req.body;

      admin.name = name || admin.name;
      admin.email = email || admin.email;
      if (role) admin.role = role;
      const nextRole = role || admin.role;
      const nextBranch = branch !== undefined ? getBranchId(branch) : getBranchId(admin.branch);
      if (nextRole !== 'Admin' && !nextBranch) {
        return res.status(400).json({ message: 'Branch assignment is required for non-admin users.' });
      }
      if (branch !== undefined) admin.branch = nextBranch ? toObjectIdIfValid(nextBranch) : undefined;
      if (status) {
        admin.status = status;
        admin.isActive = status === 'Active';
      }

      if (password) {
        admin.password = password;
      }

      const updatedAdmin = await admin.save();
      res.json(updatedAdmin);
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete an admin
// @route   DELETE /api/admins/:id
// @access  Private/Admin
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await User.findById(req.params.id);
    if (admin && (admin.role === 'Admin' || admin.role === 'Manager')) {
      // Prevent deleting self
      if (admin._id.toString() === req.user._id.toString()) {
        return res.status(400).json({ message: 'Cannot delete yourself' });
      }

      await admin.deleteOne();
      res.json({ message: 'Admin removed' });
    } else {
      res.status(404).json({ message: 'Admin not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
