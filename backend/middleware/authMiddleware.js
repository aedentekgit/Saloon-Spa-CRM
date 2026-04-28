const jwt = require('jsonwebtoken');
const User = require('../models/core/User');
const Employee = require('../models/human-resources/Employee');
const Role = require('../models/human-resources/Role');
const { hasAssignedBranch } = require('../utils/branch');
const { DEFAULT_ROLE_PERMISSIONS } = require('../utils/permissions');

const resolveRoleAccess = async (roleName) => {
  const role = String(roleName || '').trim();
  const roleData = role ? await Role.findOne({ name: role }).lean() : null;

  if (!roleData) {
    return {
      isActive: true,
      permissions: DEFAULT_ROLE_PERMISSIONS[role] || []
    };
  }

  const isInactive = roleData.status === 'Inactive' || roleData.isActive === false;
  return {
    isActive: !isInactive,
    permissions: role === 'Admin' ? ['*'] : (Array.isArray(roleData.permissions) ? roleData.permissions : [])
  };
};

const hasServerPermission = (req, requiredPermissions = []) => {
  const required = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  if (!req.user || required.length === 0) return false;
  if (req.user.role === 'Admin') return true;

  const permissions = Array.isArray(req.userPermissions) ? req.userPermissions : [];
  if (permissions.includes('*')) return true;

  return required.some((permission) => permissions.includes(permission));
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token, populate branch for filtering
      req.user = await User.findById(decoded.id).select('-password').populate('branch');

      if (!req.user) {
        req.user = await Employee.findById(decoded.id).select('-password');
        if (req.user) req.user.role = 'Employee'; // Set role for middleware
      }

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (req.user.isActive === false || req.user.status === 'Inactive') {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      const roleAccess = await resolveRoleAccess(req.user.role);
      req.userPermissions = roleAccess.permissions;

      if (!roleAccess.isActive && req.user.role !== 'Admin') {
        return res.status(403).json({ message: 'Role is inactive' });
      }

      if (!hasAssignedBranch(req.user)) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required for this role.' });
      }

      // Check if email is verified (skip for Employees as they are often added by admin)
      if (req.user && req.user.role !== 'Employee' && req.user.role !== 'Admin' && !req.user.isEmailVerified) {
        // Uncomment the line below to strictly enforce email verification
        // return res.status(401).json({ message: 'Please verify your email to access this resource' });
      }

      return next();
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.message === 'jwt expired') {
        console.warn('Auth Warning: Session expired (JWT)');
      } else {
        console.error(`Auth Error: ${error.message}`);
      }
      return res.status(401).json({ message: 'Not authorized' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const admin = (req, res, next) => {
  if (req.user && req.user.role === 'Admin') {
    return next();
  } else {
    return res.status(403).json({ message: 'Access Denied: Admin privileges required' });
  }
};

const manager = (req, res, next) => {
  if (req.user && (req.user.role === 'Admin' || req.user.role === 'Manager')) {
    return next();
  } else {
    return res.status(403).json({ message: 'Access Denied: Manager or Admin access required' });
  }
};

const requirePermission = (...permissions) => (req, res, next) => {
  const required = permissions.flat().filter(Boolean);

  if (hasServerPermission(req, required)) {
    return next();
  }

  return res.status(403).json({
    message: 'Access Denied: Your role does not have permission for this resource.'
  });
};

module.exports = { protect, admin, manager, requirePermission, hasServerPermission };
