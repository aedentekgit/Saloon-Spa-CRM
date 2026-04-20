const Expense = require('../../models/finance/Expense');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// @desc    Get all expenses
// @route   GET /api/expenses
// @access  Private
const getExpenses = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    
    // IDOR Prevention
    if (req.user.role === 'Admin') {
      // Global admin sees all
    } else if (req.user.role === 'Manager') {
      // Manager sees their branch
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else {
      // Employees only see their own recorded expenses
      query.user = req.user._id;
    }

    const { data, pagination } = await paginateModelQuery(Expense, query, req, {
      sort: { createdAt: -1 }
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
    const expense = await Expense.create({
      user: req.user._id,
      title,
      category,
      amount,
      date,
      branch: getBranchId(branch) || userBranchId || undefined
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

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense
};
