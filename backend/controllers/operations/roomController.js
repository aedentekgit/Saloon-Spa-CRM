const Room = require('../../models/operations/Room');
const Branch = require('../../models/operations/Branch');
const { deleteFile, getStoredFilePath } = require('../../middleware/uploadMiddleware');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const applyRoomSearch = async (query, search) => {
  const searchTerm = String(search || '').trim();
  if (!searchTerm) return query;

  const regex = new RegExp(escapeRegex(searchTerm), 'i');
  const matchingBranches = await Branch.find({ name: regex }).select('_id').lean();
  const branchIds = matchingBranches.map(branch => branch._id);

  query.$or = [
    { name: regex },
    { type: regex },
    { status: regex },
    { timer: regex }
  ];

  if (branchIds.length > 0) {
    query.$or.push({ branch: { $in: branchIds } });
  }

  return query;
};

// @desc    Get public rooms
// @route   GET /api/rooms/public
// @access  Public
const getPublicRooms = async (req, res) => {
  try {
    const query = {};
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;
    if (requestedBranch) {
      query.branch = requestedBranch;
    }

    await applyRoomSearch(query, req.query.search);

    const { data, pagination } = await paginateModelQuery(
      Room,
      query,
      req,
      { populate: 'branch' }
    );
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res) => {
  try {
    const query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = requestedBranch;
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      query.branch = userBranchId;
    }

    await applyRoomSearch(query, req.query.search);

    const { data, pagination } = await paginateModelQuery(Room, query, req, {
      populate: 'branch'
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a room
// @route   POST /api/rooms
// @access  Private/Manager
const createRoom = async (req, res) => {
  try {
    const { name, type, status, timer, branch, isActive, cleaningDuration } = req.body;

    // IDOR Check
    const userBranchId = getBranchId(req.user.branch);
    const selectedBranch = getBranchId(branch) || userBranchId;
    if (req.user.role !== 'Admin' && !sameBranch(selectedBranch, userBranchId)) {
       return res.status(403).json({ message: 'Access Denied: Cannot create rooms for another branch.' });
    }

    const roomExists = await Room.findOne({ name, branch: selectedBranch });
    if (roomExists) {
      return res.status(400).json({ message: 'Room already exists in this branch' });
    }

    let image = '';
    if (req.files && req.files.image) {
      const file = req.files.image[0];
      image = getStoredFilePath(file);
    }

    const room = await Room.create({
      name,
      type,
      status,
      timer,
      branch: selectedBranch,
      image,
      isActive: isActive !== undefined ? isActive : true,
      cleaningDuration: cleaningDuration || 0
    });

    res.status(201).json(room);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a room
// @route   PUT /api/rooms/:id
// @access  Private/Manager
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = req.user.role === 'Manager' && sameBranch(room.branch, req.user.branch);
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied: You cannot update rooms of other branches.' });
    }

    room.name = req.body.name || room.name;
    room.type = req.body.type || room.type;
    room.status = req.body.status || room.status;
    room.timer = req.body.timer || room.timer;
    room.isActive = req.body.isActive !== undefined ? req.body.isActive : room.isActive;
    room.cleaningDuration = req.body.cleaningDuration !== undefined ? req.body.cleaningDuration : room.cleaningDuration;

    if (isAdmin && req.body.branch) {
       room.branch = req.body.branch;
    }

    if (req.files && req.files.image) {
      if (room.image) {
        await deleteFile(room.image);
      }
      const file = req.files.image[0];
      room.image = getStoredFilePath(file);
    }

    const updatedRoom = await room.save();
    res.json(updatedRoom);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a room
// @route   DELETE /api/rooms/:id
// @access  Private/Manager
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // IDOR Check
    const isAdmin = req.user.role === 'Admin';
    const isBranchManager = req.user.role === 'Manager' && sameBranch(room.branch, req.user.branch);
    if (!isAdmin && !isBranchManager) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    if (room.image) {
      await deleteFile(room.image);
    }
    await Room.deleteOne({ _id: req.params.id });
    res.json({ message: 'Room removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPublicRooms,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
};
