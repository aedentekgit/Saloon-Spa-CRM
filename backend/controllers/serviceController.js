const Service = require('../models/Service');
const { deleteFile } = require('../middleware/uploadMiddleware');

// @desc    Get all services
// @route   GET /api/services
// @access  Private/Public
const getServices = async (req, res) => {
  try {
    const services = await Service.find({}).populate('branch', 'name');
    res.json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a service
// @route   POST /api/services
// @access  Private/Manager
const createService = async (req, res) => {
  try {
    const { name, duration, price, branch, status, category, description, commissionType, commissionValue } = req.body;
    
    // IDOR Check
    const selectedBranch = branch || req.user.branch;
    if (req.user.role !== 'Admin' && selectedBranch?.toString() !== req.user.branch?.toString()) {
      if (req.file) await deleteFile(req.file.path);
      return res.status(403).json({ message: 'Access Denied: Cannot create services for other branches.' });
    }

    let image = req.body.image;
    if (req.file) {
      image = req.file.path.startsWith('http') ? req.file.path : `uploads/${req.file.filename}`;
    }

    const serviceExists = await Service.findOne({ name, branch: selectedBranch });
    if (serviceExists) {
      if (req.file) await deleteFile(req.file.path);
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
      commissionValue: commissionValue || 0
    });

    res.status(201).json(service);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
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
      if (req.file) await deleteFile(req.file.path);
      return res.status(404).json({ message: 'Service not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = req.user.role === 'Manager' && service.branch?.toString() === req.user.branch?.toString();
    
    if (!isAdmin && !isBranchManager) {
      if (req.file) await deleteFile(req.file.path);
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

    if (req.file) {
      if (service.image) await deleteFile(service.image);
      service.image = req.file.path.startsWith('http') ? req.file.path : `uploads/${req.file.filename}`;
    } else if (req.body.image) {
      service.image = req.body.image;
    }

    const updatedService = await service.save();
    res.json(updatedService);
  } catch (error) {
    if (req.file) await deleteFile(req.file.path);
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
    const isBranchManager = req.user.role === 'Manager' && service.branch?.toString() === req.user.branch?.toString();

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
  getServices,
  createService,
  updateService,
  deleteService
};
