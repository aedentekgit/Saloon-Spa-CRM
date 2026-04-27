const express = require('express');
const router = express.Router();
const {
  getEmployees,
  getPublicEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  uploadDocument,
  deleteDocument
} = require('../../controllers/human-resources/employeeController');
const { protect, manager, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

// Define fields for multi-upload
const staffUploads = upload.fields([
  { name: 'profilePic', maxCount: 1 }
]);

router.get('/public', getPublicEmployees);
router.get('/', protect, requirePermission('employees'), getEmployees);
router.post('/', protect, manager, staffUploads, createEmployee);
router.put('/:id', protect, manager, staffUploads, updateEmployee);
router.delete('/:id', protect, manager, deleteEmployee);

// Document Management
router.post('/:id/documents', protect, manager, upload.single('document'), uploadDocument);
router.delete('/:id/documents/:docId', protect, manager, deleteDocument);

module.exports = router;
