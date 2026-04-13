const Client = require('../models/Client');
const path = require('path');
const { deleteFile } = require('../middleware/uploadMiddleware');

// @desc    Get all clients
// @route   GET /api/clients
// @access  Private
exports.getClients = async (req, res) => {
  try {
    let query = {};
    
    // IDOR Prevention: Filter by branch for non-admins
    if (req.user.role !== 'Admin') {
      if (req.user.role === 'Client') {
        // A client should only see themselves
        query._id = req.user._id;
      } else if (req.user.branch) {
        // Manager/Employee see clients in their branch
        query.branch = req.user.branch._id || req.user.branch;
      }
    }

    const clients = await Client.find(query).populate('branch').sort({ createdAt: -1 });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a client
// @route   POST /api/clients
// @access  Private
exports.createClient = async (req, res) => {
  try {
    const { name, phone, email, dob, anniversary, notes, preferences, branch, password } = req.body;
    
    let profilePic = '';

    if (req.files) {
      if (req.files.profilePic) {
        profilePic = req.files.profilePic[0].path || req.files.profilePic[0].url;
      }
    }

    // Assign branch automatically if not provided and user is branch staff
    const assignedBranch = branch || (req.user.role !== 'Admin' ? req.user.branch : undefined);

    const client = await Client.create({
      name,
      phone,
      email,
      dob,
      anniversary,
      notes,
      preferences,
      profilePic,
      password,
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
    const client = await Client.findById(req.params.id);

    if (!client) {
       return res.status(404).json({ message: 'Client not found' });
    }

    // IDOR Check
    const isSelf = client._id.toString() === req.user._id.toString();
    const isBranchStaff = req.user.branch && client.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isSelf) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to update this client' });
    }

    const { name, phone, email, dob, anniversary, notes, preferences, status, totalSpending, visits, branch, password } = req.body;

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
    
    // Only Admin can change branch
    if (isAdmin && branch) {
      client.branch = branch;
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
    const client = await Client.findById(req.params.id);
    
    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // IDOR Check
    const isBranchStaff = req.user.branch && client.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff) {
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
