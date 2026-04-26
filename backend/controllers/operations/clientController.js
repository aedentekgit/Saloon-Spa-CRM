const User = require('../../models/core/User');
const Membership = require('../../models/operations/Membership');
const Appointment = require('../../models/operations/Appointment');
const path = require('path');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    
    const { paginate, page, limit, skip } = getPaginationOptions(req);
    
    // Unified query: filter by role: 'Client'
    query.role = 'Client';
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = requestedBranch;
      }
    } else if (req.user.role === 'Manager' || req.user.role === 'Employee') {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      query.branch = userBranchId;
    } else if (req.user.role === 'Client') {
      query._id = req.user._id;
    }
    
    const clientsQuery = User.find(query).sort({ createdAt: -1 }).lean();
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

    // Fetch all appointments for these clients (Search by both clientId and name string for legacy/fallback support)
    const appointments = await Appointment.find({
      clientId: { $in: clientIds }
    }).populate('branch').sort({ date: -1, time: -1 }).lean();

    // Map everything to clients
    const clientsWithData = clients.map(client => {
      const clientMemberships = memberships.filter(m => m.client?.toString() === client._id.toString());
      const clientAppointments = appointments.filter(
        a => a.clientId?.toString() === client._id.toString()
      );
      
      return {
        ...client,
        membership: clientMemberships.find(m => m.status === 'Active') || clientMemberships[0] || null,
        memberships: clientMemberships,
        appointments: clientAppointments
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
    const { name, phone, email, dob, anniversary, notes, preferences, role, password, branch } = req.body;
    const userBranchId = getBranchId(req.user.branch);
    const isAdmin = req.user.role === 'Admin';
    const requestedBranch = getBranchId(branch);
    const assignedBranch = isAdmin ? (requestedBranch || undefined) : userBranchId;

    if (!isAdmin && !assignedBranch) {
      return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
    }

    if (!isAdmin && requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create clients for another branch.' });
    }
    
    let profilePic = '';

    if (req.files) {
      if (req.files.profilePic) {
        profilePic = req.files.profilePic[0].path || req.files.profilePic[0].url;
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
      branch: assignedBranch
    });

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
    const isBranchStaff = (req.user.role === 'Manager' || req.user.role === 'Employee') && sameBranch(client.branch, userBranchId);

    if (!isAdmin && !isBranchStaff && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this client.' });
    }

    if (!isAdmin && req.body.branch && !sameBranch(req.body.branch, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot reassign client to another branch.' });
    }

    const { name, phone, email, dob, anniversary, notes, preferences, status, totalSpending, visits, password } = req.body;

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
    }

    if (isAdmin && req.body.branch) {
      client.branch = req.body.branch;
    }

    if (password) {
      client.password = password;
    }

    if (req.files) {
      if (req.files.profilePic) {
        if (client.profilePic) {
          await deleteFile(client.profilePic);
        }
        client.profilePic = req.files.profilePic[0].path || req.files.profilePic[0].url;
      }
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
