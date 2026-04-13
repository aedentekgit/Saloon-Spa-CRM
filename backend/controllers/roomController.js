const Room = require('../models/Room');
const { deleteFile } = require('../middleware/uploadMiddleware');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Private
const getRooms = async (req, res) => {
  try {
    let query = {};
    if (req.user && req.user.role !== 'Admin') {
      if (req.user.branch) {
        query.branch = req.user.branch._id || req.user.branch;
      }
    }
    const rooms = await Room.find(query).populate('branch');
    res.json(rooms);
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
    const selectedBranch = branch || req.user.branch;
    if (req.user.role !== 'Admin' && selectedBranch?.toString() !== req.user.branch?.toString()) {
       return res.status(403).json({ message: 'Access Denied: Cannot create rooms for another branch.' });
    }

    const roomExists = await Room.findOne({ name, branch: selectedBranch });
    if (roomExists) {
      return res.status(400).json({ message: 'Room already exists in this branch' });
    }

    let image = '';
    if (req.files && req.files.image) {
      const file = req.files.image[0];
      if (file.path && !file.path.startsWith('http')) {
        const filename = file.filename || file.path.split(/[/\\]/).pop();
        image = `uploads/${filename}`;
      } else {
        image = file.path || file.url;
      }
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
    const isBranchManager = req.user.role === 'Manager' && room.branch?.toString() === req.user.branch?.toString();
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
      if (file.path && !file.path.startsWith('http')) {
        const filename = file.filename || file.path.split(/[/\\]/).pop();
        room.image = `uploads/${filename}`;
      } else {
        room.image = file.path || file.url;
      }
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
    const isBranchManager = req.user.role === 'Manager' && room.branch?.toString() === req.user.branch?.toString();
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
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom
};
