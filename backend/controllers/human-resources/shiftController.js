const Shift = require('../../models/human-resources/Shift');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId } = require('../../utils/branch');

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res) => {
  try {
    const { branch } = req.query;
    let query = {};
    const userBranchId = getBranchId(req.user?.branch);
    
    if (!req.user) {
      query.status = 'Active';
      if (branch && branch !== 'all') {
        query.branch = getBranchId(branch);
      }
    } else if (req.user.role === 'Admin') {
      if (branch && branch !== 'all') {
        query.branch = getBranchId(branch);
      }
    } else if (userBranchId) {
      query.branch = userBranchId;
    } else {
      return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
    }

    const { data, pagination } = await paginateModelQuery(Shift, query, req, {
      populate: 'branch',
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a shift
// @route   POST /api/shifts
// @access  Private/Admin
const createShift = async (req, res) => {
  const { name, startTime, endTime, durationHours, branch } = req.body;

  try {
    const shift = await Shift.create({
      name,
      startTime,
      endTime,
      durationHours,
      branch: getBranchId(branch) || getBranchId(req.user.branch)
    });
    res.status(201).json(shift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a shift
// @route   PUT /api/shifts/:id
// @access  Private/Admin
const updateShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    Object.assign(shift, req.body);
    await shift.save();
    res.json(shift);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a shift
// @route   DELETE /api/shifts/:id
// @access  Private/Admin
const deleteShift = async (req, res) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) return res.status(404).json({ message: 'Shift not found' });

    await shift.deleteOne();
    res.json({ message: 'Shift removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getShifts,
  createShift,
  updateShift,
  deleteShift
};
