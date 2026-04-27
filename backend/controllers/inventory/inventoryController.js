const Inventory = require('../../models/inventory/Inventory');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// @desc    Get all inventory items
// @route   GET /api/inventory
// @access  Private
const getInventory = async (req, res) => {
  try {
    let query = {};
    const { search, branch } = req.query;
    const userBranchId = getBranchId(req.user.branch);

    // Admin can see everything or filter by branch
    // Managers/Staff can only see their own branch
    if (req.user.role === 'Admin') {
      if (branch && branch !== 'all') {
        query.branch = branch;
      }
    } else {
      if (userBranchId) {
        query.branch = userBranchId;
      } else {
        query.branch = null; 
      }
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { vendor: { $regex: search, $options: 'i' } }
      ];
    }

    const { data, pagination } = await paginateModelQuery(Inventory, query, req, {
      populate: { path: 'branch', select: 'name' },
      sort: { name: 1 }
    });

    // Fetch metrics for the filtered view
    const totalItems = await Inventory.countDocuments(query);
    const lowStockItems = await Inventory.countDocuments({ ...query, $expr: { $lte: ['$stock', '$lowStock'] } });
    const categories = await Inventory.distinct('category', query);

    res.json(pagination ? { 
      data, 
      pagination,
      metrics: {
        totalItems,
        lowStockCount: lowStockItems,
        categoryCount: categories.length
      }
    } : { data, metrics: { totalItems, lowStockCount: lowStockItems, categoryCount: categories.length } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new inventory item
// @route   POST /api/inventory
// @access  Private/Manager
const createInventoryItem = async (req, res) => {
  const { name, category, stock, lowStock, vendor, branch, unit } = req.body;
  const userBranchId = getBranchId(req.user.branch);
  
  // IDOR Check
  const assignedBranch = getBranchId(branch) || userBranchId;
  if (req.user.role !== 'Admin' && !sameBranch(assignedBranch, userBranchId)) {
    return res.status(403).json({ message: 'Access Denied: Cannot create inventory for another branch.' });
  }

  let image = '';
  if (req.file) {
    image = getStoredFilePath(req.file);
  }

  try {
    const item = await Inventory.create({
      user: req.user._id,
      name,
      category,
      stock,
      lowStock,
      vendor,
      unit,
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
    const isBranchStaff = sameBranch(item.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this inventory item.' });
    }

    item.name = req.body.name || item.name;
    item.category = req.body.category || item.category;
    item.stock = req.body.stock !== undefined ? req.body.stock : item.stock;
    item.lowStock = req.body.lowStock !== undefined ? req.body.lowStock : item.lowStock;
    item.vendor = req.body.vendor || item.vendor;
    item.unit = req.body.unit || item.unit;
    
    if (isAdmin && req.body.branch) {
      item.branch = req.body.branch;
    }

    if (req.file) {
      if (item.image) {
        await deleteFile(item.image);
      }
      item.image = getStoredFilePath(req.file);
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
    const isBranchStaff = sameBranch(item.branch, req.user.branch);
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
