const getBranchId = (branch) => {
  if (!branch) return null;
  if (typeof branch === 'object' && branch._id) {
    return branch._id;
  }
  return branch;
};

const sameBranch = (left, right) => {
  const leftId = getBranchId(left);
  const rightId = getBranchId(right);

  if (!leftId || !rightId) return false;
  return leftId.toString() === rightId.toString();
};

module.exports = {
  getBranchId,
  sameBranch
};
