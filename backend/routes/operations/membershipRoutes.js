const express = require('express');
const router = express.Router();
const {
  createMembershipPlan,
  getMembershipPlans,
  updateMembershipPlan,
  deleteMembershipPlan,
  enrollClient,
  getClientMemberships,
  redeemMembershipSession,
  getMembershipStats,
  getAllMemberships,
  deleteMembership,
  updateMembership,
  getActiveMembershipPlansPublic
} = require('../../controllers/operations/membershipController');
const { protect, admin, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

router.get('/active', getActiveMembershipPlansPublic);

router.route('/plans')
  .post(protect, admin, upload.fields([{ name: 'document', maxCount: 1 }]), createMembershipPlan)
  .get(protect, requirePermission('memberships', 'billing'), getMembershipPlans);

router.route('/plans/:id')
  .put(protect, admin, upload.fields([{ name: 'document', maxCount: 1 }]), updateMembershipPlan)
  .delete(protect, admin, deleteMembershipPlan);

router.post('/enroll', protect, requirePermission('memberships', 'billing'), upload.fields([{ name: 'image', maxCount: 1 }]), enrollClient);
router.get('/client/all', protect, requirePermission('memberships', 'billing', 'history'), getAllMemberships);
router.get('/client/:clientId', protect, requirePermission('memberships', 'billing', 'history'), getClientMemberships);
router.post('/:id/redeem', protect, requirePermission('memberships', 'billing'), redeemMembershipSession);
router.get('/stats', protect, requirePermission('memberships', 'billing'), getMembershipStats);
router.delete('/:id', protect, admin, deleteMembership);
router.put('/:id', protect, admin, upload.fields([{ name: 'image', maxCount: 1 }]), updateMembership);

module.exports = router;
