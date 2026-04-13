const express = require('express');
const router = express.Router();
const {
  getServices,
  createService,
  updateService,
  deleteService
} = require('../controllers/serviceController');
const { protect, manager } = require('../middleware/authMiddleware');

const { upload } = require('../middleware/uploadMiddleware');

router.route('/')
  .get(getServices) // Public-ish or protected by protect depending on FE requirements.
  .post(protect, manager, upload.single('serviceImage'), createService);

router.route('/:id')
  .put(protect, manager, upload.single('serviceImage'), updateService)
  .delete(protect, manager, deleteService);

module.exports = router;
