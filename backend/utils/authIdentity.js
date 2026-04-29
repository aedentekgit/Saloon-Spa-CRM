const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const User = require('../models/core/User');
const Employee = require('../models/human-resources/Employee');
const Role = require('../models/human-resources/Role');
const { getBranchId } = require('./branch');
const { DEFAULT_ROLE_PERMISSIONS } = require('./permissions');

const ACCOUNT_SOURCES = {
  USER: 'User',
  EMPLOYEE: 'Employee',
  CLIENT: 'Client'
};

const CORE_ROLE_NAMES = ['Admin', 'Manager', 'Employee', 'Client'];
const CORE_ROLE_LOOKUP = CORE_ROLE_NAMES.reduce((acc, role) => {
  acc[role.toLowerCase()] = role;
  return acc;
}, {});
const SAFE_BRANCH_SELECT = 'name logo isActive contactNumber address lat lng radius restrictionMode';

const normalizeEmail = (email) => {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
};

const getSourceForUserAccount = (account) => (
  account?.role === 'Client' ? ACCOUNT_SOURCES.CLIENT : ACCOUNT_SOURCES.USER
);

const normalizeAuthRole = (roleName, accountSource) => {
  const role = String(roleName || '').trim();
  const coreRole = CORE_ROLE_LOOKUP[role.toLowerCase()];
  if (coreRole) return coreRole;

  if (accountSource === ACCOUNT_SOURCES.EMPLOYEE) return 'Employee';
  if (accountSource === ACCOUNT_SOURCES.CLIENT) return 'Client';

  return role || 'Client';
};

const applyAccountQueryOptions = (query, { withPassword = false, populateBranch = true } = {}) => {
  query.select(withPassword ? '+password' : '-password');
  if (populateBranch) {
    query.populate({ path: 'branch', select: SAFE_BRANCH_SELECT });
  }
  return query;
};

const findAuthAccountByEmail = async (email, options = {}) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return { account: null, source: null };

  const user = await applyAccountQueryOptions(
    User.findOne({ email: normalizedEmail }),
    options
  );

  if (user) {
    return {
      account: user,
      source: getSourceForUserAccount(user)
    };
  }

  const employee = await applyAccountQueryOptions(
    Employee.findOne({ email: normalizedEmail }),
    options
  );

  return {
    account: employee,
    source: employee ? ACCOUNT_SOURCES.EMPLOYEE : null
  };
};

const findAuthAccountById = async (id, preferredSource, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return { account: null, source: null };
  }

  const searchUsers = async () => {
    const account = await applyAccountQueryOptions(User.findById(id), options);
    return account
      ? { account, source: getSourceForUserAccount(account) }
      : { account: null, source: null };
  };

  const searchEmployees = async () => {
    const account = await applyAccountQueryOptions(Employee.findById(id), options);
    return account
      ? { account, source: ACCOUNT_SOURCES.EMPLOYEE }
      : { account: null, source: null };
  };

  const searchOrder = preferredSource === ACCOUNT_SOURCES.EMPLOYEE
    ? [searchEmployees, searchUsers]
    : [searchUsers, searchEmployees];

  for (const search of searchOrder) {
    const result = await search();
    if (result.account) return result;
  }

  return { account: null, source: null };
};

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
    permissions: role === 'Admin'
      ? ['*']
      : (Array.isArray(roleData.permissions) ? roleData.permissions : [])
  };
};

const getTokenPayload = (account, accountSource, role) => {
  const branchId = getBranchId(account.branch);
  const payload = {
    id: account._id.toString(),
    source: accountSource,
    role
  };

  if (branchId) payload.branch = branchId.toString();

  return payload;
};

const generateAuthToken = (account, accountSource, role) => jwt.sign(
  getTokenPayload(account, accountSource, role),
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

const buildAuthResponse = (account, accountSource, { permissions = [], token = false } = {}) => {
  const role = normalizeAuthRole(account.role, accountSource);
  const response = {
    _id: account._id,
    name: account.name,
    email: account.email,
    role,
    permissions,
    branch: account.branch || null,
    authSource: accountSource
  };

  if (token) {
    response.token = generateAuthToken(account, accountSource, role);
  }

  return response;
};

module.exports = {
  ACCOUNT_SOURCES,
  normalizeEmail,
  normalizeAuthRole,
  findAuthAccountByEmail,
  findAuthAccountById,
  resolveRoleAccess,
  generateAuthToken,
  buildAuthResponse
};
