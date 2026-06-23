const express = require('express');
const router = express.Router();
const {
  getClients,
  createClient,
  updateClient,
  deleteClient
} = require('../../controllers/operations/clientController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

// Define fields for multi-upload
const clientUploads = upload.fields([
  { name: 'profilePic', maxCount: 1 }
]);

router.get('/', protect, requirePermission('clients'), getClients);
router.post('/', protect, requirePermission('clients'), clientUploads, createClient);
router.put('/:id', protect, requirePermission('clients'), clientUploads, updateClient);
router.delete('/:id', protect, requirePermission('clients'), deleteClient);

// Client Management (Documents not supported yet for clients)

module.exports = router;
