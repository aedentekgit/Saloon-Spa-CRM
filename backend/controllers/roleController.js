const Role = require('../models/Role');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
exports.getRoles = async (req, res) => {
  try {
    const roles = await Role.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a role
// @route   POST /api/roles
// @access  Private/Admin
exports.createRole = async (req, res) => {
  try {
    const { name, permissions, status } = req.body;
    
    const roleExists = await Role.findOne({ name });
    if (roleExists) {
      return res.status(400).json({ message: 'Role already exists' });
    }

    const role = await Role.create({
      name,
      permissions,
      status: status || 'Active'
    });

    res.status(201).json(role);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a role
// @route   PUT /api/roles/:id
// @access  Private/Admin
exports.updateRole = async (req, res) => {
  try {
    const { name, permissions, status } = req.body;
    const role = await Role.findById(req.params.id);

    if (role) {
      role.name = name || role.name;
      role.permissions = permissions || role.permissions;
      role.status = status || role.status;
      role.isActive = status === 'Active' ? true : status === 'Inactive' ? false : role.isActive;

      const updatedRole = await role.save();
      res.json(updatedRole);
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a role
// @route   DELETE /api/roles/:id
// @access  Private/Admin
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (role) {
      if (['Admin', 'Manager', 'Employee', 'Client'].includes(role.name)) {
        return res.status(400).json({ message: 'Cannot delete system roles' });
      }
      await role.deleteOne();
      res.json({ message: 'Role removed' });
    } else {
      res.status(404).json({ message: 'Role not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
