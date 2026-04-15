const Branch = require('../../models/operations/Branch');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');


// @desc    Get all branches
// @route   GET /api/branches
// @access  Private
const getBranches = async (req, res) => {
  try {
    const { data, pagination } = await paginateModelQuery(Branch, {}, req);
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
      // Standardize path: if it's local, it might be an absolute path or just a filename. 
      // We want 'uploads/filename' for consistency with our static serving.
      if (file.path && !file.path.startsWith('http')) {
        const filename = file.filename || file.path.split(/[/\\]/).pop();
        logo = `uploads/${filename}`;
      } else {
        logo = file.path || file.url;
      }
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
      if (req.body.allowedIPs) {
         branch.allowedIPs = typeof req.body.allowedIPs === 'string' ? JSON.parse(req.body.allowedIPs) : req.body.allowedIPs;
      }

      if (req.files && req.files.logo) {
         // Delete old logo if exists
         if (branch.logo) {
            await deleteFile(branch.logo);
         }
         const file = req.files.logo[0];
         if (file.path && !file.path.startsWith('http')) {
            const filename = file.filename || file.path.split(/[/\\]/).pop();
            branch.logo = `uploads/${filename}`;
         } else {
            branch.logo = file.path || file.url;
         }
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
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch
};
