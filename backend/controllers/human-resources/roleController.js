const Role = require('../../models/human-resources/Role');
const { paginateModelQuery } = require('../../utils/pagination');

// @desc    Get all roles
// @route   GET /api/roles
// @access  Private/Admin
exports.getRoles = async (req, res) => {
  try {
    const { data, pagination } = await paginateModelQuery(Role, {}, req);
    res.json(pagination ? { data, pagination } : data);
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
      // Prevent renaming system roles
      if (['Admin', 'Manager', 'Employee', 'Client'].includes(role.name) && name && name !== role.name) {
        return res.status(400).json({ message: 'Cannot rename core system roles' });
      }

      role.name = name || role.name;

      // Ensure Client role has core permissions as default
      let finalPermissions = permissions || role.permissions;
      if (role.name === 'Client') {
        const required = ['dashboard', 'book', 'profile', 'history'];
        required.forEach(p => {
          if (!finalPermissions.includes(p)) {
            finalPermissions.push(p);
          }
        });
      }
      
      role.permissions = finalPermissions;
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
      // Specifically protect Admin and Client as requested, plus other core roles
      if (['Admin', 'Client', 'Manager', 'Employee'].includes(role.name)) {
        return res.status(400).json({ message: `The ${role.name} role is a core system requirement and cannot be removed.` });
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
