const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getPublicAppointments,
  createAppointment,
  createGuestAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
} = require('../../controllers/operations/appointmentController');
const { protect, requirePermission } = require('../../middleware/authMiddleware');

router.get('/public', getPublicAppointments);
router.post('/guest', createGuestAppointment);

router.route('/')
  .get(protect, requirePermission('appointments', 'book'), getAppointments)
  .post(protect, requirePermission('appointments', 'book'), createAppointment);

router.patch('/:id/status', protect, requirePermission('appointments', 'book'), updateAppointmentStatus);

router.route('/:id')
  .put(protect, requirePermission('appointments', 'book'), updateAppointment)
  .patch(protect, requirePermission('appointments', 'book'), updateAppointmentStatus)
  .delete(protect, requirePermission('appointments', 'book'), deleteAppointment);

module.exports = router;
