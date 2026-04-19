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
const { protect } = require('../../middleware/authMiddleware');

router.get('/public', getPublicAppointments);
router.post('/guest', createGuestAppointment);

router.route('/')
  .get(protect, getAppointments)
  .post(protect, createAppointment);

router.route('/:id')
  .put(protect, updateAppointment)
  .patch(protect, updateAppointmentStatus)
  .delete(protect, deleteAppointment);

module.exports = router;
