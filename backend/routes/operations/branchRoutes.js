const express = require('express');
const router = express.Router();
const {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch
} = require('../../controllers/operations/branchController');
const { protect, admin } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.route('/')
  .get(getBranches)
  .post(protect, admin, upload.fields([{ name: 'logo', maxCount: 1 }]), createBranch);

router.route('/:id')
  .put(protect, admin, upload.fields([{ name: 'logo', maxCount: 1 }]), updateBranch)
  .delete(protect, admin, deleteBranch);

module.exports = router;
