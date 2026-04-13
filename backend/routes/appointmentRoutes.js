const express = require('express');
const router = express.Router();
const {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .get(getAppointments)
  .post(protect, createAppointment);

router.route('/:id')
  .put(protect, updateAppointment)
  .delete(protect, deleteAppointment);

module.exports = router;
