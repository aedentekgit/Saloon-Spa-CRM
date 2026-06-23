const Category = require('../../models/operations/Category');

// @desc    Get all expense categories
// @route   GET /api/expense-categories
// @access  Private
const getExpenseCategories = async (req, res) => {
  try {
    const categories = await Category.find({ type: 'expense' }).sort({ name: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create an expense category
// @route   POST /api/expense-categories
// @access  Private/Admin
const createExpenseCategory = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;

    const exists = await Category.findOne({ name, type: 'expense' });
    if (exists) {
      return res.status(400).json({ message: 'Category already exists' });
    }

    const category = await Category.create({
      name,
      description,
      isActive: isActive !== undefined ? isActive : true,
      type: 'expense'
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an expense category
// @route   PATCH /api/expense-categories/:id
// @access  Private/Admin
const updateExpenseCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.type !== 'expense') {
      return res.status(404).json({ message: 'Category not found' });
    }

    category.name = req.body.name || category.name;
    category.description = req.body.description !== undefined ? req.body.description : category.description;
    category.isActive = req.body.isActive !== undefined ? req.body.isActive : category.isActive;

    const updated = await category.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an expense category
// @route   DELETE /api/expense-categories/:id
// @access  Private/Admin
const deleteExpenseCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category || category.type !== 'expense') {
      return res.status(404).json({ message: 'Category not found' });
    }

    await category.deleteOne();
    res.json({ message: 'Category removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getExpenseCategories,
  createExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
};
