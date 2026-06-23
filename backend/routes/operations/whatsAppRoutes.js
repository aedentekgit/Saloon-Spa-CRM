const express = require('express');
const router = express.Router();
const {
  getCampaigns,
  createCampaign
} = require('../../controllers/operations/whatsAppController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.route('/')
  .get(protect, requirePermission('whatsapp'), getCampaigns)
  .post(protect, requirePermission('whatsapp'), createCampaign);

module.exports = router;
