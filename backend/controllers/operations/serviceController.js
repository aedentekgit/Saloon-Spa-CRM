const Service = require('../../models/operations/Service');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

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
        query.branch = requestedBranch;
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      query.branch = userBranchId;
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
    const { name, duration, price, branch, status, category, description, commissionType, commissionValue, inventoryUsage } = req.body;
    
    // Parse inventoryUsage if it's a string
    let parsedInventoryUsage = [];
    if (inventoryUsage) {
      try {
        parsedInventoryUsage = typeof inventoryUsage === 'string' ? JSON.parse(inventoryUsage) : inventoryUsage;
      } catch (e) {
        console.error('Failed to parse inventoryUsage:', e);
      }
    }
    
    // IDOR Check
    const userBranchId = getBranchId(req.user.branch);
    const selectedBranch = getBranchId(branch) || userBranchId;
    if (req.user.role !== 'Admin' && !sameBranch(selectedBranch, userBranchId)) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(403).json({ message: 'Access Denied: Cannot create services for other branches.' });
    }

    let image = req.body.image;
    if (req.file) {
      image = getStoredFilePath(req.file);
    }

    const serviceExists = await Service.findOne({ name, branch: selectedBranch });
    if (serviceExists) {
      if (req.file) await deleteFile(getStoredFilePath(req.file));
      return res.status(400).json({ message: 'Service already exists in this branch' });
    }

    const service = await Service.create({
      name,
      duration,
      price,
      branch: selectedBranch || null,
      category,
      description,
      image,
      status: status || 'Active',
      commissionType: commissionType || 'Percentage',
      commissionValue: commissionValue || 0,
      inventoryUsage: parsedInventoryUsage
    });

    res.status(201).json(service);
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
    const isBranchManager = req.user.role === 'Manager' && sameBranch(service.branch, req.user.branch);
    
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

    if (isAdmin && req.body.branch) {
       service.branch = req.body.branch;
    }

    if (req.body.inventoryUsage) {
      try {
        service.inventoryUsage = typeof req.body.inventoryUsage === 'string' 
          ? JSON.parse(req.body.inventoryUsage) 
          : req.body.inventoryUsage;
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
    const isBranchManager = req.user.role === 'Manager' && sameBranch(service.branch, req.user.branch);

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
