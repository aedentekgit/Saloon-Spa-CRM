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
  updateMembership
} = require('../../controllers/operations/membershipController');
const { protect, admin } = require('../../middleware/authMiddleware');

router.route('/plans')
  .post(protect, admin, createMembershipPlan)
  .get(protect, getMembershipPlans);

router.route('/plans/:id')
  .put(protect, admin, updateMembershipPlan)
  .delete(protect, admin, deleteMembershipPlan);

router.post('/enroll', protect, enrollClient);
router.get('/client/all', protect, getAllMemberships);
router.get('/client/:clientId', protect, getClientMemberships);
router.post('/:id/redeem', protect, redeemMembershipSession);
router.get('/stats', protect, admin, getMembershipStats);
router.delete('/:id', protect, admin, deleteMembership);
router.put('/:id', protect, admin, updateMembership);

module.exports = router;
