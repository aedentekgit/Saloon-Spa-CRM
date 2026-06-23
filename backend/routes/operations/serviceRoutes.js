const express = require('express');
const router = express.Router();
const {
  getPublicServices,
  getServices,
  createService,
  updateService,
  deleteService
} = require('../../controllers/operations/serviceController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

const { upload } = require('../../middleware/uploadMiddleware');

router.route('/public')
  .get(getPublicServices);

router.route('/')
  .get(protect, requirePermission('services', 'appointments', 'billing', 'book'), getServices)
  .post(protect, requirePermission('services'), upload.single('serviceImage'), createService);

router.route('/:id')
  .put(protect, requirePermission('services'), upload.single('serviceImage'), updateService)
  .delete(protect, requirePermission('services'), deleteService);

module.exports = router;
