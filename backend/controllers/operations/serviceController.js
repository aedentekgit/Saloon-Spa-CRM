const Service = require('../../models/operations/Service');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

// @desc    Get public services
// @route   GET /api/services/public
// @access  Public
const getPublicServices = async (req, res) => {
  try {
    const query = { status: 'Active' };
    if (req.query.branch && req.query.branch !== 'all') {
      query.branch = getBranchId(req.query.branch);
    }
    const { data, pagination } = await paginateModelQuery(
      Service,
      query,
      req,
      { populate: ['branch', 'category'] }
    );
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all services
// @route   GET /api/services
// @access  Private/Public
const getServices = async (req, res) => {
  try {
    const query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = toObjectIdIfValid(requestedBranch);
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    const { data, pagination } = await paginateModelQuery(Service, query, req, {
      populate: ['branch', 'inventoryUsage.inventoryItem', 'category']
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Manager
const createService = async (req, res) => {
  try {
    const { name, duration, price, branch, status, category, description, commissionType, commissionValue, inventoryUsage, branches } = req.body;

    // Parse inventoryUsage if it's a string
    let parsedInventoryUsage = [];
    if (inventoryUsage) {
      try {
        parsedInventoryUsage = typeof inventoryUsage === 'string' ? JSON.parse(inventoryUsage) : inventoryUsage;
      } catch (e) {
        console.error('Failed to parse inventoryUsage:', e);
      }
    }

    // Parse branches if it's a string
    let selectedBranches = [];
    if (branches) {
      try {
        selectedBranches = typeof branches === 'string' ? JSON.parse(branches) : branches;
      } catch (e) {
        console.error('Failed to parse branches:', e);
      }
    }

    // Access Control and Branch assignment
    const userBranchId = getBranchId(req.user.branch);
    
    if (req.user.role !== 'Admin') {
      // Non-admins can only create in their own branch
      if (!userBranchId) {
        if (req.file) await deleteFile(getStoredFilePath(req.file));
        return res.status(400).json({ message: 'Branch assignment required' });
      }
      selectedBranches = [userBranchId.toString()];
    } else {
      // Admin
      if (selectedBranches.length === 0) {
        // Fallback to single branch
        const singleBranch = getBranchId(branch) || userBranchId;
        if (!singleBranch) {
          if (req.file) await deleteFile(getStoredFilePath(req.file));
          return res.status(400).json({ message: 'Branch assignment required' });
        }
        selectedBranches = [singleBranch.toString()];
      }
    }

    // Avoid duplicates: Check if any of the target branches already has a service with the same name
    const duplicates = await Service.find({
      name,
      branch: { $in: selectedBranches.map(toObjectIdIfValid) }
    }).populate('branch');

    if (duplicates.length > 0) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      const branchNames = duplicates.map(d => d.branch?.name || 'Unknown Branch').join(', ');
      return res.status(400).json({
        message: `Service already exists in the following branch(es): ${branchNames}`
      });
    }

    let image = req.body.image;
    if (req.file) {
      image = getStoredFilePath(req.file);
    }

    const createdServices = [];
    const Inventory = require('../../models/inventory/Inventory');

    for (const targetBranch of selectedBranches) {
      // Map inventory for this specific branch
      let branchInventoryUsage = [];
      if (parsedInventoryUsage.length > 0) {
        for (const usage of parsedInventoryUsage) {
          const originalItemId = getBranchId(usage.inventoryItem);
          if (!originalItemId) continue;

          const originalItem = await Inventory.findById(originalItemId);
          if (!originalItem) continue;

          if (originalItem.branch && originalItem.branch.toString() === targetBranch) {
            branchInventoryUsage.push({
              inventoryItem: originalItem._id,
              quantity: usage.quantity,
              unit: usage.unit
            });
          } else {
            // Find inventory item with same name in target branch
            const targetItem = await Inventory.findOne({
              name: originalItem.name,
              branch: toObjectIdIfValid(targetBranch)
            });
            if (targetItem) {
              branchInventoryUsage.push({
                inventoryItem: targetItem._id,
                quantity: usage.quantity,
                unit: usage.unit
              });
            } else if (!originalItem.branch) {
              // It's a global inventory item, use it directly
              branchInventoryUsage.push({
                inventoryItem: originalItem._id,
                quantity: usage.quantity,
                unit: usage.unit
              });
            }
          }
        }
      }

      const service = await Service.create({
        name,
        duration,
        price,
        branch: toObjectIdIfValid(targetBranch),
        category,
        description,
        image,
        status: status || 'Active',
        commissionType: commissionType || 'Percentage',
        commissionValue: commissionValue || 0,
        inventoryUsage: branchInventoryUsage
      });
      createdServices.push(service);
    }

    // Return the created services (or the first one for backwards compatibility if only 1 was created)
    if (createdServices.length === 1) {
      res.status(201).json(createdServices[0]);
    } else {
      res.status(201).json({
        message: `Successfully created service across ${createdServices.length} branches.`,
        data: createdServices
      });
    }

  } catch (error) {
    if (req.file) await deleteFile(getStoredFilePath(req.file));
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a service
// @route   PUT /api/services/:id
// @access  Private/Manager
const updateService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(404).json({ message: 'Service not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = req.user.role !== 'Client' && sameBranch(service.branch, req.user.branch);

    if (!isAdmin && !isBranchManager) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(403).json({ message: 'Access Denied: You cannot update services of other branches.' });
    }

    service.name = req.body.name || service.name;
    service.duration = req.body.duration || service.duration;
    service.price = req.body.price || service.price;
    service.status = req.body.status || service.status;
    service.category = req.body.category || service.category;
    service.description = req.body.description || service.description;
    service.commissionType = req.body.commissionType || service.commissionType;
    service.commissionValue = req.body.commissionValue !== undefined ? req.body.commissionValue : service.commissionValue;

    if (!isAdmin && req.body.branch && !sameBranch(req.body.branch, service.branch)) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(403).json({ message: 'Access Denied: You cannot reassign services to another branch.' });
    }

    if (isAdmin && req.body.branch) {
       service.branch = toObjectIdIfValid(req.body.branch);
    }

    if (req.body.inventoryUsage) {
      try {
        const parsedUsage = typeof req.body.inventoryUsage === 'string'
          ? JSON.parse(req.body.inventoryUsage)
          : req.body.inventoryUsage;
        const inventoryIds = (Array.isArray(parsedUsage) ? parsedUsage : [])
          .map(item => getBranchId(item.inventoryItem))
          .filter(Boolean);
        if (inventoryIds.length > 0) {
          const uniqueInventoryIds = [...new Set(inventoryIds)];
          const Inventory = require('../../models/inventory/Inventory');
          const allowedCount = await Inventory.countDocuments({
            _id: { $in: uniqueInventoryIds },
            $or: [
              { branch: toObjectIdIfValid(service.branch) },
              { branch: null },
              { branch: { $exists: false } }
            ]
          });
          if (allowedCount !== uniqueInventoryIds.length) {
            if (req.file) await deleteFile(getStoredFilePath(req.file));
            return res.status(403).json({ message: 'Access Denied: Inventory usage must belong to the service branch or be global.' });
          }
        }
        service.inventoryUsage = parsedUsage;
      } catch (e) {
        console.error('Failed to parse inventoryUsage during update:', e);
      }
    }

    if (req.file) {
      if (service.image) await deleteFile(service.image);
      service.image = getStoredFilePath(req.file);
    } else if (req.body.image) {
      service.image = req.body.image;
    }

    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    if (req.file) await deleteFile(getStoredFilePath(req.file));
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a service
// @route   DELETE /api/services/:id
// @access  Private/Manager
const deleteService = async (req, res) => {
  try {
    const service = await Service.findById(req.params.id);

    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = req.user.role !== 'Client' && sameBranch(service.branch, req.user.branch);

    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied' });
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
