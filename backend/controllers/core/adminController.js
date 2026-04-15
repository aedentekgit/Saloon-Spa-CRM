const User = require('../../models/core/User');
const { paginateModelQuery } = require('../../utils/pagination');

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
    
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const admin = await User.create({
      name,
      email,
      password,
      role: role || 'Admin',
      status: status || 'Active',
      isActive: status === 'Active',
      branch: branch || undefined
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

    if (admin && admin.role === 'Admin') {
      const { name, email, status, password, branch } = req.body;

      admin.name = name || admin.name;
      admin.email = email || admin.email;
      if (branch !== undefined) admin.branch = branch || undefined;
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
    if (admin && admin.role === 'Admin') {
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
