const Inventory = require('../models/Inventory');
const { deleteFile } = require('../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../utils/pagination');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res) => {
  try {
    let query = {};
    if (req.user.role !== 'Admin') {
      if (req.user.branch) {
        query.branch = req.user.branch;
      } else {
        // If not admin and no branch, they shouldn't see anything or only non-branch items
        query.branch = null; 
      }
    }
    const { data, pagination } = await paginateModelQuery(Inventory, query, req, {
      populate: { path: 'branch', select: 'name' },
      sort: { name: 1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private/Manager
const createInventoryItem = async (req, res) => {
  const { name, category, stock, lowStock, vendor, branch } = req.body;
  
  // IDOR Check
  const assignedBranch = branch || req.user.branch;
  if (req.user.role !== 'Admin' && assignedBranch?.toString() !== req.user.branch?.toString()) {
    return res.status(403).json({ message: 'Access Denied: Cannot create inventory for another branch.' });
  }

  let image = '';
  if (req.file) {
    image = req.file.path || req.file.url || `/uploads/${req.file.filename}`;
  }

  try {
    const item = await Inventory.create({
      user: req.user._id,
      name,
      category,
      stock,
      lowStock,
      vendor,
      branch: assignedBranch || null,
      image
    });

    res.status(201).json(item);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update inventory item
// @route   PUT /api/inventory/:id
// @access  Private/Manager
const updateInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // IDOR Check
    const isBranchStaff = req.user.branch && item.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this inventory item.' });
    }

    item.name = req.body.name || item.name;
    item.category = req.body.category || item.category;
    item.stock = req.body.stock !== undefined ? req.body.stock : item.stock;
    item.lowStock = req.body.lowStock !== undefined ? req.body.lowStock : item.lowStock;
    item.vendor = req.body.vendor || item.vendor;
    
    if (isAdmin && req.body.branch) {
      item.branch = req.body.branch;
    }

    if (req.file) {
      if (item.image) {
        await deleteFile(item.image);
      }
      item.image = req.file.path || req.file.url || `/uploads/${req.file.filename}`;
    }

    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete inventory item
// @route   DELETE /api/inventory/:id
// @access  Private/Manager
const deleteInventoryItem = async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);

    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // IDOR Check
    const isBranchStaff = req.user.branch && item.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    if (item.image) {
      await deleteFile(item.image);
    }
    await item.deleteOne();
    res.json({ message: 'Item removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  deleteInventoryItem
};
