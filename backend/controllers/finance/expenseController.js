const Expense = require('../../models/finance/Expense');
const Branch = require('../../models/operations/Branch');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    
    // IDOR Prevention
    if (req.user.role === 'Admin') {
      // Global admin sees all, optional branch filtering
      if (requestedBranch) {
        query.branch = requestedBranch;
      }
    } else if (req.user.role === 'Manager') {
      // Manager sees their branch
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else {
      // Employees only see their own recorded expenses
      query.user = req.user._id;
    }

    const { search, category, startDate, endDate } = req.query;
    if (category) {
      query.category = category;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = String(startDate);
      if (endDate) query.date.$lte = String(endDate);
    }

    if (search) {
      const rx = new RegExp(escapeRegex(String(search)), 'i');
      const matchingBranches = await Branch.find({ name: rx }).select('_id').lean();
      const branchIds = matchingBranches.map(branch => branch._id);

      query.$or = [{ title: rx }, { category: rx }, { date: rx }];
      if (branchIds.length > 0) {
        query.$or.push({ branch: { $in: branchIds } });
      }

      const numericSearch = Number(search);
      if (Number.isFinite(numericSearch)) {
        query.$or.push({ amount: numericSearch });
      }
    }

    const { data, pagination } = await paginateModelQuery(Expense, query, req, {
      populate: 'branch',
      sort: { date: -1, createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = async (req, res) => {
  const { title, category, amount, date, branch } = req.body;

  try {
    const userBranchId = getBranchId(req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    const isClient = req.user.role === 'Client';
    const requestedBranch = getBranchId(branch) || userBranchId;

    if (isClient) {
      return res.status(403).json({ message: 'Access Denied: Clients cannot create expenses.' });
    }

    if (!requestedBranch) {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    if (!isAdmin && !sameBranch(requestedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create expenses for another branch.' });
    }

    const expense = await Expense.create({
      user: req.user._id,
      title,
      category,
      amount,
      date,
      branch: requestedBranch
    });

    res.status(201).json(expense);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // IDOR Check
    const isOwner = expense.user?.toString() === req.user._id.toString();
    const isBranchManager = req.user.role === 'Manager' && sameBranch(expense.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isOwner) {
       return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this expense record.' });
    }

    await expense.deleteOne();
    res.json({ message: 'Expense removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update expense (partial)
// @route   PATCH /api/expenses/:id
// @access  Private
const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    // IDOR Check
    const isOwner = expense.user?.toString() === req.user._id.toString();
    const isBranchManager = req.user.role === 'Manager' && sameBranch(expense.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchManager && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this expense record.' });
    }

    const { title, category, amount, date } = req.body || {};

    if (title !== undefined) expense.title = title;
    if (category !== undefined) expense.category = category;
    if (amount !== undefined) expense.amount = amount;
    if (date !== undefined) expense.date = date;

    const updated = await expense.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense,
  updateExpense
};
