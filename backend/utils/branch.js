const mongoose = require('mongoose');

const getBranchId = (branch) => {
  if (!branch) return null;
  if (typeof branch === 'object' && branch._id) {
    return branch._id;
  }
  return branch;
};

const toObjectIdIfValid = (value) => {
  const id = getBranchId(value);
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return id;
};

const sameBranch = (left, right) => {
  const leftId = getBranchId(left);
  const rightId = getBranchId(right);

  if (!leftId || !rightId) return false;
  return leftId.toString() === rightId.toString();
};

const isAdminUser = (user) => user?.role === 'Admin';

const getUserBranchId = (userOrReq) => {
  const user = userOrReq?.user || userOrReq;
  return getBranchId(user?.branch);
};

const isBranchScopedUser = (user) => Boolean(user) && !isAdminUser(user);

const hasAssignedBranch = (user) => !isBranchScopedUser(user) || Boolean(getUserBranchId(user));

module.exports = {
  getBranchId,
  toObjectIdIfValid,
  sameBranch,
  isAdminUser,
  getUserBranchId,
  isBranchScopedUser,
  hasAssignedBranch
};
