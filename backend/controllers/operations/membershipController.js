const MembershipPlan = require('../../models/operations/MembershipPlan');
const Membership = require('../../models/operations/Membership');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// @desc    Create a new membership plan
// @route   POST /api/memberships/plans
// @access  Private/Admin
exports.createMembershipPlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.create(req.body);
    res.status(201).json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all membership plans
// @route   GET /api/memberships/plans
// @access  Private
exports.getMembershipPlans = async (req, res) => {
  try {
    const { paginate, page, limit, skip } = getPaginationOptions(req);
    const plansQuery = MembershipPlan.find({}).populate('applicableServices').sort({ createdAt: -1 });
    const total = paginate ? await MembershipPlan.countDocuments({}) : null;
    const plans = paginate ? await plansQuery.skip(skip).limit(limit) : await plansQuery;
    res.json(paginate ? { data: plans, pagination: buildPaginationMeta(total || 0, page, limit) } : plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a membership plan
// @route   PUT /api/memberships/plans/:id
// @access  Private/Admin
exports.updateMembershipPlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(plan);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete/Deactivate a membership plan
// @route   DELETE /api/memberships/plans/:id
// @access  Private/Admin
exports.deleteMembershipPlan = async (req, res) => {
  try {
    // Instead of deleting, just deactivate
    const plan = await MembershipPlan.findByIdAndUpdate(req.params.id, { isActive: false }, { returnDocument: 'after' });
    res.json({ message: 'Plan deactivated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Enroll a client into a membership plan
// @route   POST /api/memberships/enroll
// @access  Private
exports.enrollClient = async (req, res) => {
  try {
    const { clientId, planId, branchId, startDate } = req.body;
    
    // IDOR Check: Ensure Manager/Admin belongs to the branch
    const userBranchId = getBranchId(req.user.branch);
    const selectedBranch = getBranchId(branchId) || userBranchId;
    if (req.user.role !== 'Admin' && !sameBranch(selectedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot enroll client in another branch.' });
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    const membership = await Membership.create({
      client: clientId,
      plan: planId,
      branch: selectedBranch,
      startDate: start,
      endDate: end,
      totalSessions: plan.maxSessions,
      remainingSessions: plan.maxSessions,
      status: 'Active'
    });

    res.status(201).json(membership);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all active memberships for a client
// @route   GET /api/memberships/client/:clientId
// @access  Private
exports.getClientMemberships = async (req, res) => {
  try {
    // IDOR Check
    const isSelf = req.params.clientId === req.user._id.toString();
    const isAdminOrManager = req.user.role === 'Admin' || req.user.role === 'Manager';
    
    if (!isAdminOrManager && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You can only view your own memberships.' });
    }

    const { paginate, page, limit, skip } = getPaginationOptions(req);
    const membershipsQuery = Membership.find({ client: req.params.clientId })
      .populate('plan')
      .populate('branch')
      .sort({ createdAt: -1 });
    const total = paginate ? await Membership.countDocuments({ client: req.params.clientId }) : null;
    const memberships = paginate ? await membershipsQuery.skip(skip).limit(limit) : await membershipsQuery;
    res.json(paginate ? { data: memberships, pagination: buildPaginationMeta(total || 0, page, limit) } : memberships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Redeem a membership session
// @route   POST /api/memberships/:id/redeem
// @access  Private
exports.redeemMembershipSession = async (req, res) => {
  try {
    const { serviceId, appointmentId, branchId, notes } = req.body;
    const membership = await Membership.findById(req.params.id).populate('plan');

    if (!membership) return res.status(404).json({ message: 'Membership not found' });
    
    // IDOR Check
    const isBranchStaff = sameBranch(membership.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && !isBranchStaff) {
      return res.status(403).json({ message: 'Access Denied: You cannot redeem sessions for this branch.' });
    }

    if (membership.status !== 'Active') return res.status(400).json({ message: 'Membership is not active' });

    // Check if the service is allowed for this membership
    if (membership.plan.applicableServices && membership.plan.applicableServices.length > 0) {
      if (!membership.plan.applicableServices.find(as => as.toString() === serviceId)) {
        return res.status(400).json({ message: 'This service is not covered by your membership' });
      }
    }

    if (membership.plan.maxSessions > 0) {
      if (membership.remainingSessions <= 0) {
        return res.status(400).json({ message: 'No sessions remaining in your cycle' });
      }
      membership.remainingSessions -= 1;
    }

    membership.usageHistory.push({
      service: serviceId,
      appointment: appointmentId,
      branch: branchId || membership.branch,
      notes,
      usedAt: new Date()
    });

    await membership.save();
    res.json(membership);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.getAllMemberships = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    if (req.user.role === 'Client') {
      query.client = req.user._id;
    } else if (req.user.role !== 'Admin' && userBranchId) {
      query.branch = userBranchId;
    }

    const { paginate, page, limit, skip } = getPaginationOptions(req);
    const membershipsQuery = Membership.find(query)
      .populate('client')
      .populate({
        path: 'plan',
        populate: { path: 'applicableServices' }
      })
      .populate('branch')
      .populate('usageHistory.service')
      .populate('usageHistory.branch')
      .sort({ createdAt: -1 });
    const total = paginate ? await Membership.countDocuments(query) : null;
    const memberships = paginate ? await membershipsQuery.skip(skip).limit(limit) : await membershipsQuery;
    res.json(paginate ? { data: memberships, pagination: buildPaginationMeta(total || 0, page, limit) } : memberships);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get membership stats (Analytics)
// @route   GET /api/memberships/stats
// @access  Private/Admin
exports.getMembershipStats = async (req, res) => {
  try {
    let matchQuery = { status: 'Active' };
    const userBranchId = getBranchId(req.user.branch);

    if (req.user.role !== 'Admin' && userBranchId) {
      matchQuery.branch = userBranchId;
    }

    const totalActive = await Membership.countDocuments(matchQuery);
    const totalExpired = await Membership.countDocuments({ ...matchQuery, status: 'Expired' });
    
    // Sum of all remaining sessions
    const sessionStats = await Membership.aggregate([
      { $match: matchQuery },
      { $group: { _id: null, totalRemaining: { $sum: '$remainingSessions' } } }
    ]);

    // Distinct active plans count
    const activeTiers = await Membership.distinct('plan', matchQuery);

    const popularity = await Membership.aggregate([
      { $match: req.user.role === 'Admin' ? {} : { branch: userBranchId } },
      { $group: { _id: '$plan', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $lookup: { from: 'membershipplans', localField: '_id', foreignField: '_id', as: 'planDetails' } }
    ]);

    res.json({
      totalActive,
      totalExpired,
      totalSessionsRemaining: sessionStats[0]?.totalRemaining || 0,
      activeTiers: activeTiers.length,
      popularity
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a membership enrollment
// @route   DELETE /api/memberships/:id
// @access  Private/Admin
exports.deleteMembership = async (req, res) => {
  try {
    const membership = await Membership.findById(req.params.id);
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    // IDOR Check
    const isBranchManager = req.user.role === 'Manager' && sameBranch(membership.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this membership.' });
    }

    await membership.deleteOne();
    res.json({ message: 'Membership removed from sanctuary' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a membership enrollment
// @route   PUT /api/memberships/:id
// @access  Private/Admin
exports.updateMembership = async (req, res) => {
  try {
    const { planId, branchId, startDate, status } = req.body;
    const membership = await Membership.findById(req.params.id);
    if (!membership) return res.status(404).json({ message: 'Membership not found' });

    // IDOR Check
    const isBranchManager = req.user.role === 'Manager' && sameBranch(membership.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this membership.' });
    }

    if (planId) {
       const plan = await MembershipPlan.findById(planId);
       if (!plan) return res.status(404).json({ message: 'Plan not found' });
       membership.plan = planId;
       membership.totalSessions = plan.maxSessions;
    }

    if (branchId && isAdmin) membership.branch = branchId;
    if (startDate) {
       membership.startDate = new Date(startDate);
       const plan = await MembershipPlan.findById(membership.plan);
       if (plan) {
         const end = new Date(membership.startDate);
         end.setDate(end.getDate() + plan.durationDays);
         membership.endDate = end;
       }
    }
    if (status) membership.status = status;

    await membership.save();
    res.json(membership);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
