const Shift = require('../models/Shift');

// @desc    Get all shifts
// @route   GET /api/shifts
// @access  Private
const getShifts = async (req, res) => {
  try {
    const { branch } = req.query;
    let query = {};
    
    if (branch && branch !== 'all') {
      query.branch = branch;
    }

    const shifts = await Shift.find(query).populate('branch');
    res.json(shifts);
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
      branch: branch || req.user.branch
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
