const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  createCampaign
} = require('../controllers/whatsAppController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getCampaigns)
  .post(protect, createCampaign);

module.exports = router;
