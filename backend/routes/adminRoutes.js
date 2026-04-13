const express = require('express');
const router = express.Router();
const { getAdmins, createAdmin, updateAdmin, deleteAdmin } = require('../controllers/adminController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getAdmins)
  .post(protect, admin, createAdmin);

router.route('/:id')
  .put(protect, admin, updateAdmin)
  .delete(protect, admin, deleteAdmin);

module.exports = router;
