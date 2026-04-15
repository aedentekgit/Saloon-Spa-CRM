const GST = require('../models/GST');
const { paginateModelQuery } = require('../utils/pagination');

// @desc    Get all GST rates
// @route   GET /api/gst
const getGSTRates = async (req, res) => {
  try {
    const { data, pagination } = await paginateModelQuery(GST, {}, req, {
      sort: { percentage: 1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create GST rate
// @route   POST /api/gst
const createGSTRate = async (req, res) => {
  const { name, percentage, isActive } = req.body;
  try {
    if (isActive) {
      await GST.updateMany({}, { isActive: false });
    }
    const rate = await GST.create({ name, percentage, isActive });
    res.status(201).json(rate);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update GST rate
// @route   PUT /api/gst/:id
const updateGSTRate = async (req, res) => {
  try {
    const rate = await GST.findById(req.params.id);
    if (rate) {
      if (req.body.isActive === true) {
        await GST.updateMany({}, { isActive: false });
      }
      rate.name = req.body.name || rate.name;
      rate.percentage = req.body.percentage !== undefined ? req.body.percentage : rate.percentage;
      rate.isActive = req.body.isActive !== undefined ? req.body.isActive : rate.isActive;
      
      const updatedRate = await rate.save();
      res.json(updatedRate);
    } else {
      res.status(404).json({ message: 'GST rate not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete GST rate
// @route   DELETE /api/gst/:id
const deleteGSTRate = async (req, res) => {
  try {
    const rate = await GST.findById(req.params.id);
    if (rate) {
      await rate.deleteOne();
      res.json({ message: 'GST rate removed' });
    } else {
      res.status(404).json({ message: 'GST rate not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getGSTRates,
  createGSTRate,
  updateGSTRate,
  deleteGSTRate
};
