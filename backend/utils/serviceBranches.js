const { getBranchId, sameBranch, toObjectIdIfValid } = require('./branch');

const getServiceBranchEntries = (service) => (
  Array.isArray(service?.branches) && service.branches.length > 0
    ? service.branches
    : []
);

const findServiceBranchEntry = (service, branchId) => {
  const requested = getBranchId(branchId);
  if (!service || !requested) return null;

  return getServiceBranchEntries(service).find(entry => sameBranch(entry.branch, requested)) || null;
};

const hasServiceBranch = (service, branchId) => {
  if (findServiceBranchEntry(service, branchId)) return true;
  return sameBranch(service?.branch, branchId);
};

const applyServiceBranchView = (service, branchId) => {
  if (!service) return service;
  const obj = typeof service.toObject === 'function' ? service.toObject() : { ...service };
  const entry = branchId
    ? findServiceBranchEntry(service, branchId)
    : getServiceBranchEntries(service)[0] || null;

  if (entry) {
    obj.branch = entry.branch;
    obj.status = entry.status;
    obj.commissionType = entry.commissionType;
    obj.commissionValue = entry.commissionValue;
    obj.referralCommissionType = entry.referralCommissionType;
    obj.referralCommissionValue = entry.referralCommissionValue;
    obj.inventoryUsage = entry.inventoryUsage || [];
  }

  return obj;
};

const serviceBranchFilter = (branchId) => {
  const id = toObjectIdIfValid(branchId);
  return {
    $or: [
      { 'branches.branch': id },
      { branch: id }
    ]
  };
};

const findServiceForBranch = async (Service, branchId, serviceId, serviceName, populate = '') => {
  const rawId = getBranchId(serviceId);
  const id = rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId)) ? rawId : null;
  const query = id ? Service.findById(id) : Service.findOne({ name: serviceName, ...serviceBranchFilter(branchId) });
  if (populate) query.populate(populate);
  const service = await query;

  if (!service) return null;
  if (!hasServiceBranch(service, branchId)) return null;
  return applyServiceBranchView(service, branchId);
};

module.exports = {
  applyServiceBranchView,
  findServiceBranchEntry,
  findServiceForBranch,
  hasServiceBranch,
  serviceBranchFilter
};
