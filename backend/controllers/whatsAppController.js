const WhatsAppCampaign = require('../models/WhatsAppCampaign');

// @desc    Get all campaigns
// @route   GET /api/whatsapp
// @access  Private
const getCampaigns = async (req, res) => {
  try {
    const campaigns = await WhatsAppCampaign.find({}).sort({ createdAt: -1 });
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Log new campaign
// @route   POST /api/whatsapp
// @access  Private
const createCampaign = async (req, res) => {
  const { templateName, audience, message, sentCount, date } = req.body;

  try {
    const campaign = await WhatsAppCampaign.create({
      user: req.user._id,
      templateName,
      audience,
      message,
      sentCount,
      date
    });

    res.status(201).json(campaign);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getCampaigns,
  createCampaign
};
