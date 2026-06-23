const User = require('../../models/core/User');
const Membership = require('../../models/operations/Membership');
const Appointment = require('../../models/operations/Appointment');
const Invoice = require('../../models/finance/Invoice');
const Branch = require('../../models/operations/Branch');
const path = require('path');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');

const normalizeName = (value = '') => String(value).trim().toLowerCase();
const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase();
const normalizePhone = (value = '') => String(value || '').replace(/\D/g, '');
const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};
const isCountedVisit = (appointment) => appointment.status !== 'Cancelled';
const BRANCH_CLIENT_ID_PATTERN = /^[A-Z0-9]{2}-\d{4}$/;
const buildReferralCode = (clientId = '') => `REF-${String(clientId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || Date.now()}`;
const buildBranchClientPrefix = (branchName = '') => {
  const letters = String(branchName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();
  return (letters || 'CL').padEnd(2, 'X');
};
const buildNextBranchClientId = async (branchId) => {
  const branch = branchId ? await Branch.findById(branchId).select('name').lean() : null;
  const prefix = buildBranchClientPrefix(branch?.name);
  const rx = new RegExp(`^${prefix}-\\d{4}$`);
  const lastClient = await User.findOne({ role: 'Client', clientId: rx })
    .sort({ clientId: -1 })
    .select('clientId')
    .lean();
  const lastNumber = Number(lastClient?.clientId?.match(/\d+$/)?.[0] || 0);
  return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
};
const shouldBackfillClientId = (clientId = '') => !BRANCH_CLIENT_ID_PATTERN.test(String(clientId || ''));
const backfillLegacyBranchClientIds = async () => {
  const legacyClients = await User.find({
    role: 'Client',
    $or: [
      { clientId: { $exists: false } },
      { clientId: null },
      { clientId: '' },
      { clientId: { $not: BRANCH_CLIENT_ID_PATTERN } }
    ]
  })
    .select('_id clientId branch createdAt')
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  if (legacyClients.length === 0) return;

  const fallbackBranch = await Branch.findOne({}).sort({ createdAt: 1 }).select('_id name').lean();
  const branchIds = [...new Set(legacyClients.map(client => (
    getBranchId(client.branch)?.toString() || fallbackBranch?._id?.toString()
  )).filter(Boolean))];
  const branches = await Branch.find({ _id: { $in: branchIds } }).select('name').lean();
  const branchById = new Map(branches.map(branch => [branch._id.toString(), branch]));

  for (const branchId of branchIds) {
    const branch = branchById.get(branchId);
    if (!branch) continue;

    const prefix = buildBranchClientPrefix(branch.name);
    const rx = new RegExp(`^${prefix}-\\d{4}$`);
    const existingIds = await User.find({ role: 'Client', clientId: rx }).select('clientId').lean();
    const usedIds = new Set(existingIds.map(client => client.clientId));
    let nextNumber = existingIds.reduce((max, client) => {
      const number = Number(client.clientId?.match(/\d+$/)?.[0] || 0);
      return Math.max(max, number);
    }, 0);

    const branchLegacyClients = legacyClients.filter(client => (
      (getBranchId(client.branch)?.toString() || fallbackBranch?._id?.toString()) === branchId
    ));
    for (const client of branchLegacyClients) {
      if (!shouldBackfillClientId(client.clientId)) continue;

      let nextClientId = '';
      do {
        nextNumber += 1;
        nextClientId = `${prefix}-${String(nextNumber).padStart(4, '0')}`;
      } while (usedIds.has(nextClientId));

      usedIds.add(nextClientId);
      await User.updateOne(
        { _id: client._id },
        { $set: { clientId: nextClientId, ...(client.branch ? {} : { branch: toObjectIdIfValid(branchId) }) } }
      );
    }
  }
};
const buildReferralLookupConditions = (lookup = '') => {
  const conditions = [
    { referralCode: lookup },
    { clientId: lookup },
    { email: normalizeEmail(lookup) }
  ];
  const lookupObjectId = toObjectIdIfValid(lookup);
  if (lookupObjectId && typeof lookupObjectId === 'object') {
    conditions.unshift({ _id: lookupObjectId });
  }
  return conditions;
};
const isSelfReferral = ({ name, email, phone }, referrer) => {
  if (!referrer) return false;
  const sameName = normalizeName(name) && normalizeName(name) === normalizeName(referrer.name);
  const sameEmail = normalizeEmail(email) && normalizeEmail(email) === normalizeEmail(referrer.email);
  const samePhone = normalizePhone(phone) && normalizePhone(phone) === normalizePhone(referrer.phone);
  return Boolean(sameName || sameEmail || samePhone);
};

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    await backfillLegacyBranchClientIds();

    let query = {};
    const userBranchId = getBranchId(req.user.branch);

    const { paginate, page, limit, skip } = getPaginationOptions(req);

    // Unified query: filter by role: 'Client'
    query.role = 'Client';
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = toObjectIdIfValid(requestedBranch);
      }
    } else if (req.user.role === 'Client') {
      query._id = req.user._id;
      if (userBranchId) {
        query.branch = toObjectIdIfValid(userBranchId);
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view clients from another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
    }

    const clientsQuery = User.find(query)
      .populate('referredBy', 'name clientId referralCode')
      .sort({ createdAt: -1 })
      .lean();
    const total = paginate ? await User.countDocuments(query) : null;
    const clients = paginate ? await clientsQuery.skip(skip).limit(limit) : await clientsQuery;

    // Lightweight mode for simple lists (e.g. dropdowns)
    if (req.query.strict === 'true' || req.query.lightweight === 'true') {
      return res.json(paginate ? {
        data: clients,
        pagination: buildPaginationMeta(total || 0, page, limit)
      } : clients);
    }

    // Fetch all memberships for these clients
    const clientIds = clients.map(c => c._id);
    // Fetch all memberships for these clients globally (cross-branch view for client records)
    const memberships = await Membership.find({
      client: { $in: clientIds }
    })
    .populate({
      path: 'plan',
      populate: { path: 'applicableServices', select: 'name' }
    })
    .populate('usageHistory.service')
    .populate('usageHistory.branch')
    .sort({ createdAt: -1 })
    .lean();

    const clientNames = clients.map(c => c.name).filter(Boolean);

    // Fetch all appointments globally for these clients to see complete history.
    const appointments = await Appointment.find({
      $or: [
        { clientId: { $in: clientIds } },
        { clientId: { $exists: false }, client: { $in: clientNames } },
        { clientId: null, client: { $in: clientNames } }
      ]
    }).populate('branch').sort({ date: -1, time: -1 }).lean();

    const invoices = await Invoice.find({
      $or: [
        { clientId: { $in: clientIds } },
        { clientId: { $exists: false }, clientName: { $in: clientNames } },
        { clientId: null, clientName: { $in: clientNames } }
      ]
    }).select('clientId clientName total').lean();

    const spendingByClientId = new Map();
    const spendingByClientName = new Map();
    invoices.forEach(invoice => {
      const amount = toNumber(invoice.total);
      const invoiceClientId = invoice.clientId?.toString();

      if (invoiceClientId) {
        spendingByClientId.set(
          invoiceClientId,
          (spendingByClientId.get(invoiceClientId) || 0) + amount
        );
        return;
      }

      const nameKey = normalizeName(invoice.clientName);
      if (nameKey) {
        spendingByClientName.set(
          nameKey,
          (spendingByClientName.get(nameKey) || 0) + amount
        );
      }
    });

    // Fetch referrals for these clients
    const referrals = await User.find({
      role: 'Client',
      referredBy: { $in: clientIds }
    }).select('name phone email referredBy createdAt referralRedeemedAt').lean();

    const referredClientIds = referrals.map(r => r._id);
    const referredClientKeys = new Set(referrals.map(r => (
      r._id?.toString() ||
      normalizeEmail(r.email) ||
      normalizePhone(r.phone) ||
      normalizeName(r.name)
    )).filter(Boolean));

    // Fetch all invoices for referred clients, sorted by creation date so the first invoice is first
    const referredInvoices = await Invoice.find({
      clientId: { $in: referredClientIds }
    }).select('clientId referralDiscountAmount date createdAt').sort({ createdAt: 1 }).lean();

    const firstInvoiceByClientId = new Map();
    referredInvoices.forEach(inv => {
      const clientId = inv.clientId?.toString();
      if (clientId && !firstInvoiceByClientId.has(clientId)) {
        firstInvoiceByClientId.set(clientId, inv);
      }
    });

    const referralsByReferrerId = new Map();
    referrals.forEach(ref => {
      const referrerId = ref.referredBy?.toString();
      if (referrerId) {
        if (!referralsByReferrerId.has(referrerId)) {
          referralsByReferrerId.set(referrerId, []);
        }
        
        const firstInv = firstInvoiceByClientId.get(ref._id.toString());
        const hasPaid = !!firstInv;

        referralsByReferrerId.get(referrerId).push({
          _id: ref._id,
          name: ref.name,
          phone: ref.phone,
          email: ref.email,
          joinDate: ref.createdAt,
          generatedDate: firstInv ? firstInv.date : null,
          usedDate: ref.referralRedeemedAt || null,
          referralDiscount: hasPaid ? 50 : 0
        });
      }
    });

    const clientLookupByReferralToken = new Map();
    const appointmentReferralValues = new Set();
    clients.forEach(client => {
      [
        client._id?.toString(),
        client.clientId,
        client.referralCode,
        client.name,
        client.email,
        client.phone,
        normalizeName(client.name),
        normalizeEmail(client.email),
        normalizePhone(client.phone)
      ].filter(Boolean).forEach(token => {
        const rawToken = String(token).trim();
        appointmentReferralValues.add(rawToken);
        clientLookupByReferralToken.set(rawToken.toLowerCase(), client);
      });
    });

    const referralTokens = [...appointmentReferralValues];
    const referralAppointments = referralTokens.length > 0
      ? await Appointment.find({
        $or: [
          { referralCode: { $in: referralTokens } },
          { referralCustomer: { $in: referralTokens } }
        ]
      }).select('client clientId clientPhone clientEmail referralCustomer referralCode date createdAt').lean()
      : [];

    referralAppointments.forEach(appointment => {
      const tokenCandidates = [
        appointment.referralCode,
        appointment.referralCustomer,
        normalizeName(appointment.referralCustomer),
        normalizeEmail(appointment.referralCustomer),
        normalizePhone(appointment.referralCustomer)
      ].filter(Boolean).map(token => String(token).trim().toLowerCase());

      const referrer = tokenCandidates
        .map(token => clientLookupByReferralToken.get(token))
        .find(Boolean);
      if (!referrer) return;

      const referrerId = referrer._id.toString();
      const referredKey = appointment.clientId?.toString()
        || normalizeEmail(appointment.clientEmail)
        || normalizePhone(appointment.clientPhone)
        || normalizeName(appointment.client);
      if (!referredKey || referredClientKeys.has(referredKey)) return;

      if (!referralsByReferrerId.has(referrerId)) {
        referralsByReferrerId.set(referrerId, []);
      }

      const existingReferral = referralsByReferrerId.get(referrerId).some(ref => {
        const existingKey = ref._id?.toString()
          || normalizeEmail(ref.email)
          || normalizePhone(ref.phone)
          || normalizeName(ref.name);
        return existingKey && existingKey === referredKey;
      });
      if (existingReferral) return;

      referralsByReferrerId.get(referrerId).push({
        _id: appointment.clientId || appointment._id,
        name: appointment.client,
        phone: appointment.clientPhone,
        email: appointment.clientEmail,
        joinDate: appointment.createdAt,
        usedDate: null,
        referralDiscount: 0
      });
    });

    // Map everything to clients
    const clientsWithData = clients.map(client => {
      const clientMemberships = memberships.filter(m => m.client?.toString() === client._id.toString());
      const clientAppointments = appointments.filter(
        a =>
          a.clientId?.toString() === client._id.toString() ||
          (!a.clientId && normalizeName(a.client) === normalizeName(client.name))
      );
      const clientId = client._id.toString();
      const derivedSpending =
        (spendingByClientId.get(clientId) || 0) +
        (spendingByClientName.get(normalizeName(client.name)) || 0);

      return {
        ...client,
        visits: clientAppointments.filter(isCountedVisit).length,
        totalSpending: derivedSpending,
        membership: clientMemberships.find(m => m.status === 'Active') || clientMemberships[0] || null,
        memberships: clientMemberships,
        appointments: clientAppointments,
        referrals: referralsByReferrerId.get(clientId) || []
      };
    });

    res.json(paginate ? {
      data: clientsWithData,
      pagination: {
        ...buildPaginationMeta(total || 0, page, limit),
        activeTotal: await User.countDocuments({ ...query, status: 'Active' }),
        membershipTotal: await User.distinct('_id', query).then((ids) =>
          Membership.distinct('client', { client: { $in: ids }, status: 'Active' }).then((rows) => rows.length)
        )
      }
    } : clientsWithData);
  } catch (error) {
    console.error('Error in getClients:', error);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      dob,
      anniversary,
      notes,
      preferences,
      role,
      password,
      branch,
      referralCode,
      referredBy,
      referredByCode,
      totalReferrals,
      referralRewardBalance,
      referralDiscountUsed
    } = req.body;

    // Check for duplicate email
    if (email) {
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(400).json({ message: 'A client with this email address already exists.' });
      }
    }

    // Check for duplicate phone
    if (phone) {
      const existingPhone = await User.findOne({ phone: phone.trim() });
      if (existingPhone) {
        return res.status(400).json({ message: 'A client with this phone number already exists.' });
      }
    }

    const userBranchId = getBranchId(req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    const requestedBranch = getBranchId(branch);
    const assignedBranch = isAdmin ? (toObjectIdIfValid(requestedBranch) || undefined) : toObjectIdIfValid(userBranchId);

    if (!assignedBranch) {
      return res.status(400).json({ message: 'Branch assignment required to generate client ID.' });
    }

    if (!isAdmin && requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create clients for another branch.' });
    }

    let profilePic = '';
    if (req.files && req.files.profilePic) {
      const file = req.files.profilePic[0];
      profilePic = getStoredFilePath(file);
    }

    const nextClientId = await buildNextBranchClientId(assignedBranch);

    let referredByClient = null;
    const referralLookup = String(referredByCode || referredBy || '').trim();
    if (referralLookup) {
      referredByClient = await User.findOne({
        role: 'Client',
        $or: buildReferralLookupConditions(referralLookup)
      }).select('_id name email phone');
      if (isSelfReferral({ name, email, phone }, referredByClient)) {
        return res.status(400).json({ message: 'Referral customer cannot be the same as the client.' });
      }
    }

    const client = await User.create({
      name,
      phone,
      email,
      dob,
      anniversary,
      notes,
      preferences,
      profilePic,
      password,
      role: 'Client', // Explicitly set to Client for this controller
      branch: assignedBranch,
      clientId: nextClientId,
      referralCode: referralCode || buildReferralCode(nextClientId),
      referredBy: referredByClient?._id,
      totalReferrals: toNumber(totalReferrals),
      referralRewardBalance: toNumber(referralRewardBalance),
      referralDiscountUsed: toNumber(referralDiscountUsed)
    });

    if (referredByClient) {
      await User.findByIdAndUpdate(referredByClient._id, { $inc: { totalReferrals: 1 } });
    }

    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a client
// @route   PUT /api/clients/:id
// @access  Private
exports.updateClient = async (req, res) => {
  try {
    const client = await User.findById(req.params.id);

    if (!client || client.role !== 'Client') {
       return res.status(404).json({ message: 'Client not found' });
    }

    const isAdmin = req.user.role === 'Admin';
    const isSelf = client._id.toString() === req.user._id.toString();
    const userBranchId = getBranchId(req.user.branch);
    const isBranchStaff = req.user.role !== 'Client' && sameBranch(client.branch, userBranchId);

    if (!isAdmin && !isBranchStaff && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this client.' });
    }

    if (!isAdmin && req.body.branch && !sameBranch(req.body.branch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot reassign client to another branch.' });
    }

    const {
      name,
      phone,
      email,
      dob,
      anniversary,
      notes,
      preferences,
      status,
      totalSpending,
      visits,
      password,
      referralCode,
      referredBy,
      referredByCode,
      totalReferrals,
      referralRewardBalance,
      referralDiscountUsed
    } = req.body;

    // Check for duplicate email on update
    if (email && email.toLowerCase() !== client.email?.toLowerCase()) {
      const existingEmail = await User.findOne({ email: email.toLowerCase(), _id: { $ne: client._id } });
      if (existingEmail) {
        return res.status(400).json({ message: 'A client with this email address already exists.' });
      }
    }

    // Check for duplicate phone on update
    if (phone && phone.trim() !== client.phone?.trim()) {
      const existingPhone = await User.findOne({ phone: phone.trim(), _id: { $ne: client._id } });
      if (existingPhone) {
        return res.status(400).json({ message: 'A client with this phone number already exists.' });
      }
    }

    client.name = name || client.name;
    client.phone = phone || client.phone;
    client.email = email || client.email;
    client.dob = dob || client.dob;
    client.anniversary = anniversary || client.anniversary;
    client.notes = notes || client.notes;
    client.preferences = preferences || client.preferences;
    if (isAdmin || isBranchStaff) {
      client.status = status || client.status;
      client.totalSpending = totalSpending !== undefined ? totalSpending : client.totalSpending;
      client.visits = visits !== undefined ? visits : client.visits;
      client.referralCode = referralCode || client.referralCode || buildReferralCode(client.clientId);
      client.totalReferrals = totalReferrals !== undefined ? toNumber(totalReferrals) : client.totalReferrals;
      client.referralRewardBalance = referralRewardBalance !== undefined ? toNumber(referralRewardBalance) : client.referralRewardBalance;
      client.referralDiscountUsed = referralDiscountUsed !== undefined ? toNumber(referralDiscountUsed) : client.referralDiscountUsed;

      const referralLookup = String(referredByCode || referredBy || '').trim();
      if (referralLookup) {
        const referredByClient = await User.findOne({
          role: 'Client',
          _id: { $ne: client._id },
          $or: buildReferralLookupConditions(referralLookup)
        }).select('_id name email phone');

        if (isSelfReferral({ name: client.name, email: client.email, phone: client.phone }, referredByClient)) {
          return res.status(400).json({ message: 'Referral customer cannot be the same as the client.' });
        }

        client.referredBy = referredByClient?._id || undefined;
      } else if (referredBy !== undefined || referredByCode !== undefined) {
        client.referredBy = undefined;
      }
    }

    if (isAdmin && req.body.branch) {
      client.branch = req.body.branch;
    }

    if (password) {
      client.password = password;
    }

    if (req.files && req.files.profilePic) {
      if (client.profilePic) {
        await deleteFile(client.profilePic);
      }
      const file = req.files.profilePic[0];
      client.profilePic = getStoredFilePath(file);
    }

    const updatedClient = await client.save();
    res.json(updatedClient);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a client
// @route   DELETE /api/clients/:id
// @access  Private
exports.deleteClient = async (req, res) => {
  try {
    const client = await User.findById(req.params.id);

    if (!client || client.role !== 'Client') {
      return res.status(404).json({ message: 'Client not found' });
    }

    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this client' });
    }

    if (client.profilePic) {
      await deleteFile(client.profilePic);
    }

    await client.deleteOne();
    res.json({ message: 'Client removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
