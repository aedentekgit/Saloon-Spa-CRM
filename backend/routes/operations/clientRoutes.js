const express = require('express');
const router = express.Router();
const {
  getClients,
  createClient,
  updateClient,
  deleteClient
} = require('../../controllers/operations/clientController');
const { protect } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

// Define fields for multi-upload
const clientUploads = upload.fields([
  { name: 'profilePic', maxCount: 1 }
]);

router.get('/', protect, getClients);
router.post('/', protect, clientUploads, createClient);
router.put('/:id', protect, clientUploads, updateClient);
router.delete('/:id', protect, deleteClient);

// Client Management (Documents not supported yet for clients)

module.exports = router;
