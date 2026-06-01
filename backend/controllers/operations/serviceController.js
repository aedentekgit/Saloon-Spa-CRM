const Service = require('../../models/operations/Service');
const Inventory = require('../../models/inventory/Inventory');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { getPaginationOptions, buildPaginationMeta, applyQueryOptions } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');
const { applyServiceBranchView, findServiceBranchEntry, serviceBranchFilter } = require('../../utils/serviceBranches');

const parseArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

const getSelectedBranches = (req, branch, branches) => {
  const userBranchId = getBranchId(req.user.branch);
  let selectedBranches = parseArray(branches).map(getBranchId).filter(Boolean);

  if (req.user.role !== 'Admin') {
    return userBranchId ? [userBranchId.toString()] : [];
  }

  if (selectedBranches.length === 0) {
    const singleBranch = getBranchId(branch) || userBranchId;
    if (singleBranch) selectedBranches = [singleBranch.toString()];
  }

  return [...new Set(selectedBranches.map(String))];
};

const mapInventoryUsageForBranch = async (inventoryUsage, targetBranch) => {
  const parsedInventoryUsage = parseArray(inventoryUsage);
  const branchInventoryUsage = [];

  for (const usage of parsedInventoryUsage) {
    const originalItemId = getBranchId(usage.inventoryItem);
    if (!originalItemId) continue;

    const originalItem = await Inventory.findById(originalItemId);
    if (!originalItem) continue;

    if (originalItem.branch && originalItem.branch.toString() === targetBranch) {
      branchInventoryUsage.push({
        inventoryItem: originalItem._id,
        quantity: usage.quantity,
        unit: usage.unit || originalItem.unit
      });
      continue;
    }

    const targetItem = await Inventory.findOne({
      name: originalItem.name,
      unit: originalItem.unit,
      branch: toObjectIdIfValid(targetBranch)
    });

    if (targetItem) {
      branchInventoryUsage.push({
        inventoryItem: targetItem._id,
        quantity: usage.quantity,
        unit: usage.unit || targetItem.unit
      });
    } else {
      // Keep the selected usage on every assigned branch. If a branch-specific
      // inventory twin exists we use it above; otherwise preserve the selected
      // item so the service definition remains consistent across branches.
      branchInventoryUsage.push({
        inventoryItem: originalItem._id,
        quantity: usage.quantity,
        unit: usage.unit || originalItem.unit
      });
    }
  }

  return branchInventoryUsage;
};

const buildBranchEntry = async (req, targetBranch) => ({
  branch: toObjectIdIfValid(targetBranch),
  status: req.body.status || 'Active',
  commissionType: req.body.commissionType || 'Percentage',
  commissionValue: req.body.commissionValue !== undefined ? Number(req.body.commissionValue) : 10,
  inventoryUsage: await mapInventoryUsageForBranch(req.body.inventoryUsage, targetBranch)
});

const populateOptions = [
  { path: 'branch', select: 'name' },
  { path: 'branches.branch', select: 'name' },
  { path: 'branches.inventoryUsage.inventoryItem' },
  { path: 'inventoryUsage.inventoryItem' }
];

const listServices = async (query, req, branchViewId = null, extraFilter = null) => {
  const { paginate, page, limit, skip } = getPaginationOptions(req, 10);
  let mongoQuery = Service.find(query);
  mongoQuery = applyQueryOptions(mongoQuery, { populate: populateOptions, sort: { name: 1 } });
  if (paginate) mongoQuery.skip(skip).limit(limit);

  let data = await mongoQuery;
  if (extraFilter) data = data.filter(extraFilter);
  data = data.map(service => applyServiceBranchView(service, branchViewId));

  if (!paginate) return { data, pagination: null };

  const total = extraFilter
    ? (await Service.find(query).populate(populateOptions)).filter(extraFilter).length
    : await Service.countDocuments(query);
  return { data, pagination: buildPaginationMeta(total, page, limit) };
};

const getPublicServices = async (req, res) => {
  try {
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    const query = requestedBranch ? serviceBranchFilter(requestedBranch) : {};
    const { data, pagination } = await listServices(
      query,
      req,
      requestedBranch,
      service => requestedBranch
        ? applyServiceBranchView(service, requestedBranch)?.status === 'Active'
        : service.branches?.some(entry => entry.status === 'Active') || service.status === 'Active'
    );
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getServices = async (req, res) => {
  try {
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    let branchViewId = requestedBranch;
    let query = {};

    if (req.user.role === 'Admin') {
      if (requestedBranch) query = serviceBranchFilter(requestedBranch);
    } else {
      if (!userBranchId) return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      branchViewId = userBranchId;
      query = serviceBranchFilter(userBranchId);
    }

    const { data, pagination } = await listServices(query, req, branchViewId);
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createService = async (req, res) => {
  try {
    const { name, duration, price, branch, category, description, branches } = req.body;
    const selectedBranches = getSelectedBranches(req, branch, branches);

    if (selectedBranches.length === 0) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    const duplicate = await Service.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      $or: [
        { 'branches.branch': { $in: selectedBranches.map(toObjectIdIfValid) } },
        { branch: { $in: selectedBranches.map(toObjectIdIfValid) } }
      ]
    }).populate('branches.branch branch');

    if (duplicate) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(400).json({ message: 'Already this service was added for that branch.' });
    }

    const image = req.file ? getStoredFilePath(req.file) : req.body.image;
    const branchEntries = [];
    for (const targetBranch of selectedBranches) {
      branchEntries.push(await buildBranchEntry(req, targetBranch));
    }

    const service = await Service.create({
      name,
      duration,
      price,
      category,
      description,
      image,
      branches: branchEntries
    });

    await service.populate(populateOptions);
    res.status(201).json(service);
  } catch (error) {
    if (req.file) await deleteFile(getStoredFilePath(req.file));
    res.status(400).json({ message: error.message });
  }
};

const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(404).json({ message: 'Service not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const targetBranch = getBranchId(req.body.branch);
    const userBranchId = getBranchId(req.user.branch);
    const selectedBranches = parseArray(req.body.branches).map(getBranchId).filter(Boolean);
    const branchTargets = isAdmin
      ? (
          selectedBranches.length > 0
            ? selectedBranches
            : targetBranch
              ? [targetBranch]
              : (service.branches || []).map(entry => getBranchId(entry.branch)).filter(Boolean)
        )
      : [userBranchId].filter(Boolean);

    if (branchTargets.length === 0) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    if (!isAdmin && (!userBranchId || !branchTargets.every(branchId => sameBranch(branchId, userBranchId)))) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(403).json({ message: 'Access Denied: You cannot update services of other branches.' });
    }

    const newName = req.body.name || service.name;
    const duplicate = await Service.findOne({
      _id: { $ne: service._id },
      name: { $regex: new RegExp(`^${newName}$`, 'i') },
      $or: [
        { 'branches.branch': { $in: branchTargets.map(toObjectIdIfValid) } },
        { branch: { $in: branchTargets.map(toObjectIdIfValid) } }
      ]
    });

    if (duplicate) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(400).json({ message: 'Already this service was added for that branch.' });
    }

    service.name = newName;
    service.duration = req.body.duration || service.duration;
    service.price = req.body.price || service.price;
    service.category = req.body.category || service.category;
    service.description = req.body.description !== undefined ? req.body.description : service.description;

    if (req.file) {
      if (service.image) await deleteFile(service.image);
      service.image = getStoredFilePath(req.file);
    } else if (req.body.image) {
      service.image = req.body.image;
    }

    if (isAdmin && selectedBranches.length > 0) {
      service.branches = service.branches.filter(entry => {
        const entryBranchId = getBranchId(entry.branch);
        return selectedBranches.map(String).includes(entryBranchId ? entryBranchId.toString() : '');
      });
    }

    for (const branchId of branchTargets) {
      let entry = findServiceBranchEntry(service, branchId);
      if (!entry) {
        service.branches.push({ branch: toObjectIdIfValid(branchId) });
        entry = service.branches[service.branches.length - 1];
      }
      entry.status = req.body.status || entry.status || 'Active';
      entry.commissionType = req.body.commissionType || entry.commissionType || 'Percentage';
      entry.commissionValue = req.body.commissionValue !== undefined ? Number(req.body.commissionValue) : (entry.commissionValue || 0);
      if (req.body.inventoryUsage !== undefined) {
        entry.inventoryUsage = await mapInventoryUsageForBranch(req.body.inventoryUsage, branchId);
      }
    }

    service.branch = undefined;
    service.status = undefined;
    service.commissionType = undefined;
    service.commissionValue = undefined;
    service.inventoryUsage = undefined;

    const updatedService = await service.save();
    await updatedService.populate(populateOptions);
    res.json(targetBranch ? applyServiceBranchView(updatedService, targetBranch) : updatedService);
  } catch (error) {
    if (req.file) await deleteFile(getStoredFilePath(req.file));
    res.status(400).json({ message: error.message });
  }
};

const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) return res.status(404).json({ message: 'Service not found' });

    const isAdmin = req.user.role === 'Admin';
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    const isBranchManager = req.user.role !== 'Client' && (
      (service.branches || []).some(entry => sameBranch(entry.branch, req.user.branch)) ||
      sameBranch(service.branch, req.user.branch)
    );

    if (!isAdmin && !isBranchManager) return res.status(403).json({ message: 'Access Denied' });

    const branchToRemove = isAdmin ? requestedBranch : getBranchId(req.user.branch);
    if (branchToRemove && Array.isArray(service.branches) && service.branches.length > 1) {
      const beforeCount = service.branches.length;
      service.branches = service.branches.filter(entry => !sameBranch(entry.branch, branchToRemove));

      if (service.branches.length === beforeCount) {
        return res.status(404).json({ message: 'Service branch entry not found' });
      }

      if (service.branches.length > 0) {
        service.branch = undefined;
        service.status = undefined;
        service.commissionType = undefined;
        service.commissionValue = undefined;
        service.inventoryUsage = undefined;
        await service.save();
        return res.json({ message: 'Service removed from selected branch' });
      }
    }

    if (service.image) await deleteFile(service.image);
    await Service.deleteOne({ _id: req.params.id });
    res.json({ message: 'Service removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicServices,
  getServices,
  createService,
  updateService,
  deleteService
};
