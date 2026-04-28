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
const { protect, requirePermission } = require('../../middleware/authMiddleware');
const { upload } = require('../../middleware/uploadMiddleware');

// Define fields for multi-upload
const staffUploads = upload.fields([
  { name: 'profilePic', maxCount: 1 }
]);

router.get('/public', getPublicEmployees);
router.get('/', protect, requirePermission('employees', 'appointments', 'attendance', 'payroll'), getEmployees);
router.post('/', protect, requirePermission('employees'), staffUploads, createEmployee);
router.put('/:id', protect, requirePermission('employees'), staffUploads, updateEmployee);
router.delete('/:id', protect, requirePermission('employees'), deleteEmployee);

// Document Management
router.post('/:id/documents', protect, requirePermission('employees'), upload.single('document'), uploadDocument);
router.delete('/:id/documents/:docId', protect, requirePermission('employees'), deleteDocument);

module.exports = router;
