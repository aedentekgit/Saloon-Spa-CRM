const Branch = require('../../models/operations/Branch');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');


// @desc    Get public branches
// @route   GET /api/branches/public
// @access  Public
const getPublicBranches = async (req, res) => {
  try {
    const { data, pagination } = await paginateModelQuery(
      Branch,
      { isActive: true },
      req,
      {
        // Deliberately exclude security-sensitive fields (e.g., allowedIPs).
        select: 'name logo isActive contactNumber address lat lng radius restrictionMode'
      }
    );
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all branches
// @route   GET /api/branches
// @access  Private
const getBranches = async (req, res) => {
  try {
    const isAdmin = req.user?.role === 'Admin';
    const filter = isAdmin ? {} : { isActive: true };
    const select = isAdmin ? undefined : 'name logo isActive contactNumber address lat lng radius restrictionMode';

    const { data, pagination } = await paginateModelQuery(Branch, filter, req, { select });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a branch
// @route   POST /api/branches
// @access  Private/Admin
const createBranch = async (req, res) => {
  try {
    const { name, contactNumber, email, address } = req.body;

    const branchExists = await Branch.findOne({ name });
    if (branchExists) {
      return res.status(400).json({ message: 'Branch already exists' });
    }

    let logo = '';
    if (req.files && req.files.logo) {
      const file = req.files.logo[0];
      logo = getStoredFilePath(file);
    }

    const branch = await Branch.create({
      name,
      contactNumber,
      email,
      address,
      logo,
      lat: req.body.lat,
      lng: req.body.lng,
      radius: req.body.radius,
      restrictionMode: req.body.restrictionMode || 'geofence',
      allowedIPs: req.body.allowedIPs ? (typeof req.body.allowedIPs === 'string' ? JSON.parse(req.body.allowedIPs) : req.body.allowedIPs) : []
    });

    res.status(201).json(branch);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a branch
// @route   PUT /api/branches/:id
// @access  Private/Admin
const updateBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (branch) {
      branch.name = req.body.name || branch.name;
      branch.contactNumber = req.body.contactNumber || branch.contactNumber;
      branch.email = req.body.email || branch.email;
      branch.address = req.body.address || branch.address;
      branch.isActive = req.body.isActive !== undefined ? req.body.isActive : branch.isActive;
      branch.lat = req.body.lat !== undefined ? req.body.lat : branch.lat;
      branch.lng = req.body.lng !== undefined ? req.body.lng : branch.lng;
      branch.radius = req.body.radius !== undefined ? req.body.radius : branch.radius;
      branch.restrictionMode = req.body.restrictionMode || branch.restrictionMode;
      if (req.body.allowedIPs) {
         branch.allowedIPs = typeof req.body.allowedIPs === 'string' ? JSON.parse(req.body.allowedIPs) : req.body.allowedIPs;
      }

      if (req.files && req.files.logo) {
         // Delete old logo if exists
         if (branch.logo) {
            await deleteFile(branch.logo);
         }
         const file = req.files.logo[0];
         branch.logo = getStoredFilePath(file);
      }

      const updatedBranch = await branch.save();
      res.json(updatedBranch);
    } else {
      res.status(404).json({ message: 'Branch not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a branch
// @route   DELETE /api/branches/:id
// @access  Private/Admin
const deleteBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.id);

    if (branch) {
      if (branch.logo) {
        await deleteFile(branch.logo);
      }
      await Branch.deleteOne({ _id: req.params.id });
      res.json({ message: 'Branch removed' });
    } else {
      res.status(404).json({ message: 'Branch not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicBranches,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch
};
