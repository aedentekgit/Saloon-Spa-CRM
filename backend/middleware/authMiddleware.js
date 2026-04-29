const jwt = require('jsonwebtoken');
const { hasAssignedBranch } = require('../utils/branch');
const {
  ACCOUNT_SOURCES,
  findAuthAccountById,
  normalizeAuthRole,
  resolveRoleAccess
} = require('../utils/authIdentity');

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

      const { account, source } = await findAuthAccountById(decoded.id, decoded.source);
      req.user = account;

      if (!req.user) {
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      const effectiveRole = normalizeAuthRole(req.user.role, source);
      req.user.role = effectiveRole;
      req.authSource = source;

      if (req.user.isActive === false || req.user.status === 'Inactive') {
        return res.status(403).json({ message: 'Account is inactive' });
      }

      const roleAccess = await resolveRoleAccess(effectiveRole);
      req.userPermissions = roleAccess.permissions;

      if (!roleAccess.isActive && effectiveRole !== 'Admin') {
        return res.status(403).json({ message: 'Role is inactive' });
      }

      if (!hasAssignedBranch(req.user)) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required for this role.' });
      }

      // Check if email is verified (skip staff records as they are often added by admin)
      if (
        req.user &&
        req.authSource !== ACCOUNT_SOURCES.EMPLOYEE &&
        req.user.role !== 'Admin' &&
        !req.user.isEmailVerified
      ) {
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
