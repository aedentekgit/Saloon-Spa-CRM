const MembershipPlan = require('../../models/operations/MembershipPlan');
const Membership = require('../../models/operations/Membership');
const User = require('../../models/core/User');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

const getUploadedDocumentPath = (req) => {
  const file = req.files?.document?.[0] || req.file;
  if (!file) return '';
  return getStoredFilePath(file);
};



// @desc    Create a new membership plan
// @route   POST /api/memberships/plans
// @access  Private/Admin
exports.createMembershipPlan = async (req, res) => {
  try {
    const document = getUploadedDocumentPath(req);
    const planData = { ...req.body, document };

    // Parse numeric fields and arrays if they come as strings (common with FormData)
    if (typeof planData.price === 'string') planData.price = Number(planData.price);
    if (typeof planData.durationDays === 'string') planData.durationDays = Number(planData.durationDays);
    if (typeof planData.maxSessions === 'string') planData.maxSessions = Number(planData.maxSessions);
    if (typeof planData.isActive === 'string') planData.isActive = planData.isActive === 'true';
    if (typeof planData.isPopular === 'string') planData.isPopular = planData.isPopular === 'true';
    if (typeof planData.applicableServices === 'string') {
       try { planData.applicableServices = JSON.parse(planData.applicableServices); } catch(e) { planData.applicableServices = []; }
    }
    if (typeof planData.benefits === 'string') {
       try { planData.benefits = JSON.parse(planData.benefits); } catch(e) { planData.benefits = planData.benefits.split('\n').filter(b => b.trim()); }
    }
    if (typeof planData.branches === 'string') {
       try { planData.branches = JSON.parse(planData.branches); } catch(e) { planData.branches = []; }
    }

    const plan = await MembershipPlan.create(planData);
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
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    const filter = {};

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        filter.branches = toObjectIdIfValid(requestedBranch);
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view plans for another branch.' });
      }
      filter.$or = [
        { branches: toObjectIdIfValid(userBranchId) },
        { branches: { $size: 0 } },
        { branches: { $exists: false } }
      ];
    }

    const { paginate, page, limit, skip } = getPaginationOptions(req);
    const plansQuery = MembershipPlan.find(filter).populate('applicableServices').sort({ createdAt: -1 });
    const total = paginate ? await MembershipPlan.countDocuments(filter) : null;
    const plans = paginate ? await plansQuery.skip(skip).limit(limit) : await plansQuery;
    res.json(paginate ? { data: plans, pagination: buildPaginationMeta(total || 0, page, limit) } : plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get active membership plans for public landing
// @route   GET /api/memberships/active
// @access  Public
exports.getActiveMembershipPlansPublic = async (req, res) => {
  try {
    const plans = await MembershipPlan.find({ isActive: true }).populate('applicableServices').sort({ price: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a membership plan
// @route   PUT /api/memberships/plans/:id
// @access  Private/Admin
exports.updateMembershipPlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findById(req.params.id);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });

    const updateData = { ...req.body };

    // Handle Numeric and Boolean fields from FormData
    if (updateData.price !== undefined) updateData.price = Number(updateData.price);
    if (updateData.durationDays !== undefined) updateData.durationDays = Number(updateData.durationDays);
    if (updateData.maxSessions !== undefined) updateData.maxSessions = Number(updateData.maxSessions);
    if (updateData.isActive !== undefined) updateData.isActive = updateData.isActive === 'true' || updateData.isActive === true;
    if (updateData.isPopular !== undefined) updateData.isPopular = updateData.isPopular === 'true' || updateData.isPopular === true;

    if (typeof updateData.applicableServices === 'string') {
       try { updateData.applicableServices = JSON.parse(updateData.applicableServices); } catch(e) {}
    }
    if (typeof updateData.benefits === 'string') {
       try { updateData.benefits = JSON.parse(updateData.benefits); } catch(e) { updateData.benefits = updateData.benefits.split('\n').filter(b => b.trim()); }
    }
    if (typeof updateData.branches === 'string') {
       try { updateData.branches = JSON.parse(updateData.branches); } catch(e) {}
    }

    const previousDocument = plan.document;
    const uploadedDocument = getUploadedDocumentPath(req);
    if (uploadedDocument) {
      updateData.document = uploadedDocument;
    } else if (req.body.removeDocument === 'true' || req.body.removeDocument === true) {
      updateData.document = '';
    }

    const updatedPlan = await MembershipPlan.findByIdAndUpdate(req.params.id, updateData, { returnDocument: 'after' });

    if ((uploadedDocument || req.body.removeDocument === 'true' || req.body.removeDocument === true) && previousDocument && previousDocument !== updatedPlan.document) {
      await deleteFile(previousDocument);
    }

    res.json(updatedPlan);
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

    if (!selectedBranch) {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const planBranches = Array.isArray(plan.branches) ? plan.branches : [];
    if (planBranches.length > 0 && !planBranches.some(branch => sameBranch(branch, selectedBranch))) {
      return res.status(403).json({ message: 'Access Denied: Selected plan is not available for this branch.' });
    }

    const targetClient = await User.findById(clientId).select('_id role branch');
    if (!targetClient || targetClient.role !== 'Client') {
      return res.status(404).json({ message: 'Client not found' });
    }
    if (!sameBranch(targetClient.branch, selectedBranch)) {
      return res.status(403).json({ message: 'Access Denied: Selected client belongs to another branch.' });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + plan.durationDays);

    const membership = await Membership.create({
      client: clientId,
      plan: planId,
      branch: toObjectIdIfValid(selectedBranch),
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
    const userBranchId = getBranchId(req.user.branch);
    // IDOR Check
    const isSelf = req.params.clientId === req.user._id.toString();
    const isAdmin = req.user.role === 'Admin';
    const isManager = !['Admin', 'Client', 'Employee'].includes(req.user.role);

    if (!isAdmin && !isManager && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You can only view your own memberships.' });
    }

    const membershipQuery = { client: req.params.clientId };

    if (isManager) {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }

      const targetClient = await User.findById(req.params.clientId).select('_id role branch');
      if (!targetClient || targetClient.role !== 'Client') {
        return res.status(404).json({ message: 'Client not found' });
      }

      if (!sameBranch(targetClient.branch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: You can only view memberships from your own branch.' });
      }

      membershipQuery.branch = toObjectIdIfValid(userBranchId);
    }

    const { paginate, page, limit, skip } = getPaginationOptions(req);
    const membershipsQuery = Membership.find(membershipQuery)
      .populate('plan')
      .populate('branch')
      .sort({ createdAt: -1 });
    const total = paginate ? await Membership.countDocuments(membershipQuery) : null;
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
    const { serviceId, appointmentId, notes } = req.body;
    const membership = await Membership.findById(req.params.id).populate('plan');

    if (!membership) return res.status(404).json({ message: 'Membership not found' });

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchStaff = req.user.role !== 'Client' && sameBranch(membership.branch, req.user.branch);
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
      branch: membership.branch,
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
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    if (req.user.role === 'Client') {
      query.client = req.user._id;
      if (userBranchId) query.branch = toObjectIdIfValid(userBranchId);
    } else if (req.user.role === 'Admin' && requestedBranch) {
      query.branch = toObjectIdIfValid(requestedBranch);
    } else if (req.user.role !== 'Admin' && userBranchId) {
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view memberships for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
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
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin' && requestedBranch) {
      matchQuery.branch = toObjectIdIfValid(requestedBranch);
    } else if (req.user.role !== 'Admin' && userBranchId) {
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view membership stats for another branch.' });
      }
      matchQuery.branch = toObjectIdIfValid(userBranchId);
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

    const popularityMatch = {};
    if (req.user.role === 'Admin' && requestedBranch) {
      popularityMatch.branch = toObjectIdIfValid(requestedBranch);
    } else if (req.user.role !== 'Admin' && userBranchId) {
      popularityMatch.branch = toObjectIdIfValid(userBranchId);
    }

    const popularity = await Membership.aggregate([
      { $match: popularityMatch },
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
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && sameBranch(membership.branch, req.user.branch);
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
    if (!membership) {
      return res.status(404).json({ message: 'Membership not found' });
    }

    // IDOR Check
    const isBranchManager = req.user.role !== 'Client' && req.user.role !== 'Employee' && sameBranch(membership.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this membership.' });
    }

    if (planId) {
       const plan = await MembershipPlan.findById(planId);
       if (!plan) {
         return res.status(404).json({ message: 'Plan not found' });
       }
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
