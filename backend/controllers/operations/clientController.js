const User = require('../../models/core/User');
const Membership = require('../../models/operations/Membership');
const Appointment = require('../../models/operations/Appointment');
const path = require('path');
const { deleteFile } = require('../../middleware/uploadMiddleware');
const { getPaginationOptions, buildPaginationMeta } = require('../../utils/pagination');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    let query = {};
    
    const { paginate, page, limit, skip } = getPaginationOptions(req);
    
    // Unified query: filter by role: 'Client'
    query.role = 'Client';
    
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
      $or: [
        { clientId: { $in: clientIds } },
        { client: { $in: clients.map(c => c.name) } }
      ]
    }).populate('branch').sort({ date: -1, time: -1 }).lean();

    // Map everything to clients
    const clientsWithData = clients.map(client => {
      const clientMemberships = memberships.filter(m => m.client?.toString() === client._id.toString());
      const clientAppointments = appointments.filter(a => 
        a.clientId?.toString() === client._id.toString() || 
        (a.client === client.name && !a.clientId) // Only match by name if clientId is not present
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
        activeTotal: await User.countDocuments({ role: 'Client', status: 'Active' }),
        membershipTotal: await Membership.distinct('client', { status: 'Active' }).then(res => res.length)
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
    const { name, phone, email, dob, anniversary, notes, preferences, role, password } = req.body;
    
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
      role: 'Client' // Explicitly set to Client for this controller
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

    const { name, phone, email, dob, anniversary, notes, preferences, status, totalSpending, visits, password } = req.body;

    client.name = name || client.name;
    client.phone = phone || client.phone;
    client.email = email || client.email;
    client.dob = dob || client.dob;
    client.anniversary = anniversary || client.anniversary;
    client.notes = notes || client.notes;
    client.preferences = preferences || client.preferences;
    client.status = status || client.status;
    client.totalSpending = totalSpending !== undefined ? totalSpending : client.totalSpending;
    client.visits = visits !== undefined ? visits : client.visits;

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
