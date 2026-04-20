const Appointment = require('../../models/operations/Appointment');
const User = require('../../models/core/User');
const Notification = require('../../models/core/Notification');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

// Helper: convert "YYYY-MM-DD" + "HH:mm" into minutes since midnight for overlap math
const parseTime = (date, time) => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
};

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    
    // IDOR Prevention: Filter logically based on role and branch
    if (req.user.role === 'Admin') {
      // Global admin sees all
    } else if (req.user.role === 'Manager') {
      // Manager sees their branch
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else if (req.user.role === 'Employee') {
      // Employee sees their branch or only their own tasks? 
      // Usually employees see all appointments for the branch to coordinate.
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else if (req.user.role === 'Client') {
      // Clients only see their own appointments
      query.clientId = req.user._id;
    }

    const { data, pagination } = await paginateModelQuery(Appointment, query, req, {
      sort: { createdAt: -1 }
    });
    res.json(pagination ? { data, pagination } : data);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const createAppointment = async (req, res) => {
  try {
    const userBranchId = getBranchId(req.user.branch);
    const appointmentBranchId = getBranchId(req.body.branch || userBranchId);
    const appointmentData = {
      ...req.body,
      branch: appointmentBranchId,
      user: req.user._id
    };

    if (!appointmentData.branch) {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    // --- CONFLICT VALIDATION (Staff + Room) ---
    const { date, time, employee, room } = appointmentData;
    if (date && time && employee) {
      const Service = require('../../models/operations/Service');
      const selectedService = await Service.findOne({ name: appointmentData.service });
      const serviceDuration = selectedService?.duration || 60;

      // Get all active appointments for this date
      const existingApts = await Appointment.find({
        branch: appointmentData.branch,
        date,
        status: { $in: ['Confirmed', 'Pending'] }
      });

      const newStart = parseTime(date, time);
      const newEnd = newStart + serviceDuration;

      for (const apt of existingApts) {
        const existingService = await Service.findOne({ name: apt.service });
        const existingDuration = existingService?.duration || 60;
        const existingStart = parseTime(apt.date, apt.time);
        const existingEnd = existingStart + existingDuration;

        const overlaps = newStart < existingEnd && newEnd > existingStart;

        if (overlaps && apt.employee === employee) {
          return res.status(409).json({ message: `${employee} is already booked at this time. Please choose a different slot.` });
        }
        if (overlaps && room && apt.room === room) {
          return res.status(409).json({ message: `Room "${room}" is already booked at this time. Please choose a different slot or room.` });
        }
      }
    }
    // ------------------------------------------

    // Auto-resolve clientId
    if (!appointmentData.clientId && appointmentData.client) {
      const foundClient = await User.findOne({ name: appointmentData.client, role: 'Client' });
      if (foundClient) appointmentData.clientId = foundClient._id;
    }

    const appointment = await Appointment.create(appointmentData);

    // --- REAL-TIME NOTIFICATION INTEGRATION ---
    try {
      const Notification = require('../../models/core/Notification');
      const sendPushNotification = require('../../utils/sendPushNotification');

      const managers = await User.find({
        $or: [{ role: 'Admin' }, { role: 'Manager', branch: appointment.branch }],
        isActive: true
      });

      if (managers.length > 0) {
        const title = 'New Appointment';
        const body = `${appointment.client} booked ${appointment.service} for ${new Date(appointment.date).toLocaleDateString()}`;

        const dbNotifications = managers.map(m => ({
          recipient: m._id,
          title,
          message: body,
          type: 'appointment',
          link: `/appointments`
        }));
        await Notification.insertMany(dbNotifications);

        const allTokens = managers.reduce((acc, m) => {
          if (m.fcmTokens) acc.push(...m.fcmTokens);
          return acc;
        }, []);

        if (allTokens.length > 0) {
          await sendPushNotification({ title, body, tokens: allTokens, data: { appointmentId: appointment._id.toString() } });
        }
      }
    } catch (notifErr) {
      console.error('Non-blocking Notification Error:', notifErr);
    }

    // Membership Integration
    if (appointment.clientId) {
      const Membership = require('../../models/operations/Membership');
      const Service = require('../../models/operations/Service');
      const serviceObj = await Service.findOne({ name: appointment.service });
      const serviceId = appointment.serviceId || serviceObj?._id;

      if (serviceId) {
        let activeMembership;
        if (req.body.membershipId) {
          activeMembership = await Membership.findById(req.body.membershipId).populate('plan');
          if (activeMembership && !sameBranch(activeMembership.branch, appointment.branch)) {
            return res.status(403).json({ message: 'Membership does not belong to this branch.' });
          }
        } else {
          activeMembership = await Membership.findOne({
            client: appointment.clientId,
            branch: appointment.branch,
            status: 'Active',
            remainingSessions: { $gt: 0 }
          }).populate('plan');
        }

        if (activeMembership) {
          const applicableServices = Array.isArray(activeMembership.plan?.applicableServices)
            ? activeMembership.plan.applicableServices
            : [];
          const isApplicable = applicableServices.length === 0 || applicableServices.some(
            id => id.toString() === serviceId.toString()
          );
          if (isApplicable) {
            activeMembership.remainingSessions -= 1;
            activeMembership.usageHistory.push({
              service: serviceId,
              appointment: appointment._id,
              branch: appointment.branch,
              usedAt: new Date()
            });
            await activeMembership.save();
          }
        }
      }
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};


// @desc    Update an appointment
// @route   PUT /api/appointments/:id
// @access  Private
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // IDOR Check
    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = sameBranch(appointment.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    const oldStatus = appointment.status;
    const { date, time, employee, room } = req.body;

    // --- CONFLICT VALIDATION (Staff + Room) ---
    const checkDate = date || appointment.date;
    const checkTime = time || appointment.time;
    const checkEmployee = employee || appointment.employee;
    const checkRoom = room || appointment.room;
    const checkBranch = getBranchId(req.body.branch || appointment.branch);

    if (checkDate && checkTime && checkEmployee) {
      const Service = require('../../models/operations/Service');
      const updatedService = req.body.service || appointment.service;
      const selectedService = await Service.findOne({ name: updatedService });
      const serviceDuration = selectedService?.duration || 60;

      const existingApts = await Appointment.find({
        branch: checkBranch,
        date: checkDate,
        status: { $in: ['Confirmed', 'Pending'] },
        _id: { $ne: appointment._id } // exclude self
      });

      const newStart = parseTime(checkDate, checkTime);
      const newEnd = newStart + serviceDuration;

      for (const apt of existingApts) {
        const existingService = await Service.findOne({ name: apt.service });
        const existingDuration = existingService?.duration || 60;
        const existingStart = parseTime(apt.date, apt.time);
        const existingEnd = existingStart + existingDuration;
        const overlaps = newStart < existingEnd && newEnd > existingStart;

        if (overlaps && apt.employee === checkEmployee) {
          return res.status(409).json({ message: `${checkEmployee} is already booked at this time. Please choose a different slot.` });
        }
        if (overlaps && checkRoom && apt.room === checkRoom) {
          return res.status(409).json({ message: `Room "${checkRoom}" is already booked at this time. Please choose a different slot or room.` });
        }
      }
    }
    // ------------------------------------------

    Object.assign(appointment, req.body);
    const updatedAppointment = await appointment.save();

    // Trigger notification if status changed during update
    if (req.body.status && req.body.status !== oldStatus) {
      // Re-fetch populated for notification
      const populated = await Appointment.findById(updatedAppointment._id).populate('branch');
      try {
        const sendEmail = require('../../utils/sendEmail');
        let recipientEmail = populated.clientEmail;
        if (!recipientEmail && populated.clientId) {
          const User = require('../../models/core/User');
          const usr = await User.findById(populated.clientId);
          recipientEmail = usr?.email;
        }

        if (recipientEmail) {
          let subject = '';
          let message = '';
          const status = req.body.status;
          const reason = req.body.cancellationReason;

          if (status === 'Confirmed') {
            subject = 'Appointment Confirmed - Zen Sanctuary & Spa';
            message = `Peace be upon you, ${populated.client}.\n\nYour ritual for ${populated.service} at ${populated.branch?.name || 'our sanctuary'} has been APPROVED.\n\nDate: ${new Date(populated.date).toLocaleDateString()}\nTime: ${populated.time}\n\nWe look forward to your arrival.`;
          } else if (status === 'Cancelled') {
            subject = 'Appointment Cancelled - Zen Sanctuary & Spa';
            message = `Peace be upon you, ${populated.client}.\n\nWe regret to inform you that your appointment for ${populated.service} has been CANCELLED.\n\n${reason ? `Reason: ${reason}\n\n` : ''}Please contact us if you wish to reschedule.`;
          }

          if (subject) {
            await sendEmail({ email: recipientEmail, subject, message });
          }
        }
      } catch (err) {
        console.error('Notification Error in Update:', err);
      }
    }

    res.json(updatedAppointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an appointment
// @route   DELETE /api/appointments/:id
// @access  Private
const deleteAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // IDOR Check
    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = sameBranch(appointment.branch, req.user.branch);
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this resource' });
    }

    await Appointment.deleteOne({ _id: req.params.id });
    res.json({ message: 'Appointment removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update appointment status
// @route   PATCH /api/appointments/:id/status
// @access  Private
const updateAppointmentStatus = async (req, res) => {
  try {
    const { status, cancellationReason } = req.body;
    const appointment = await Appointment.findById(req.params.id).populate('branch');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    appointment.status = status;
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }

    await appointment.save();

    // --- EMAIL NOTIFICATION ---
    try {
      const sendEmail = require('../../utils/sendEmail');
      
      // Get recipient email (from clientId if available, else clientEmail)
      let recipientEmail = appointment.clientEmail;
      if (!recipientEmail && appointment.clientId) {
        const User = require('../../models/core/User');
        const user = await User.findById(appointment.clientId);
        recipientEmail = user?.email;
      }

      if (recipientEmail) {
        let subject = '';
        let message = '';

        if (status === 'Confirmed') {
          subject = 'Appointment Confirmed - Zen Sanctuary & Spa';
          message = `Peace be upon you, ${appointment.client}.\n\nYour ritual for ${appointment.service} at ${appointment.branch?.name || 'our sanctuary'} has been APPROVED.\n\nDate: ${new Date(appointment.date).toLocaleDateString()}\nTime: ${appointment.time}\n\nWe look forward to your arrival.`;
        } else if (status === 'Cancelled') {
          subject = 'Appointment Cancelled - Zen Sanctuary & Spa';
          message = `Peace be upon you, ${appointment.client}.\n\nWe regret to inform you that your appointment for ${appointment.service} has been CANCELLED.\n\n${cancellationReason ? `Reason: ${cancellationReason}\n\n` : ''}Please contact us if you wish to reschedule.`;
        }

        if (subject) {
          await sendEmail({
            email: recipientEmail,
            subject,
            message
          });
        }
      }
    } catch (emailErr) {
      console.error('Email Notification Error:', emailErr);
    }

    res.json(appointment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public appointments (limited info for availability check)
// @route   GET /api/appointments/public
// @access  Public
const getPublicAppointments = async (req, res) => {
  try {
    const { branch, date } = req.query;
    let query = {};
    if (branch) query.branch = branch;
    if (date) query.date = date;

    // Only return fields needed for availability calculation
    const appointments = await Appointment.find(query)
      .select('date time service employee room branch')
      .populate('branch', 'name');
    
    res.json(appointments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a guest appointment
// @route   POST /api/appointments/guest
// @access  Public
const createGuestAppointment = async (req, res) => {
  try {
    const { name, phone, email, ...rest } = req.body;
    const appointmentBranch = getBranchId(rest.branch);

    if (!name || !phone || !email || !rest.service || !rest.employee || !rest.date || !rest.time || !appointmentBranch) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    // Server-side conflict validation to prevent double booking
    const Service = require('../../models/operations/Service');
    const selectedService = await Service.findOne({ name: rest.service });
    const serviceDuration = selectedService?.duration || 60;
    const existingApts = await Appointment.find({
      branch: appointmentBranch,
      date: rest.date,
      status: { $in: ['Confirmed', 'Pending'] }
    });
    const newStart = parseTime(rest.date, rest.time);
    const newEnd = newStart + serviceDuration;

    for (const apt of existingApts) {
      const existingService = await Service.findOne({ name: apt.service });
      const existingDuration = existingService?.duration || 60;
      const existingStart = parseTime(apt.date, apt.time);
      const existingEnd = existingStart + existingDuration;
      const overlaps = newStart < existingEnd && newEnd > existingStart;

      if (overlaps && apt.employee === rest.employee) {
        return res.status(409).json({ message: `${rest.employee} is already booked at this time. Please choose a different slot.` });
      }

      if (overlaps && rest.room && apt.room === rest.room) {
        return res.status(409).json({ message: `Room "${rest.room}" is already booked at this time. Please choose a different slot or room.` });
      }
    }
    
    // 1. Create or find a client profile for the guest
    // This allows them to show up in the Billing dropdown and maintain history
    let client = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });

    if (!client) {
      // Create a minimalist client profile
      client = await User.create({
        name,
        email: email.toLowerCase(),
        phone,
        role: 'Client',
        status: 'Active',
        notes: 'Created via Guest Booking',
        branch: appointmentBranch,
        password: Math.random().toString(36).slice(-8) // Generate random dummy password
      });
    }

    const appointmentData = {
      ...rest,
      client: name,
      clientId: client._id, // Link to the created/found client
      clientPhone: phone,
      clientEmail: email,
      branch: appointmentBranch,
      bookingType: 'Guest',
      status: 'Pending'
    };

    const appointment = await Appointment.create(appointmentData);

    // --- REAL-TIME NOTIFICATION INTEGRATION ---
    try {
      const sendPushNotification = require('../../utils/sendPushNotification');

      // Populate branch to get the name for the notification message
      await appointment.populate('branch', 'name');

      // Find recipients (All Admins + Managers of this branch)
      const managers = await User.find({
        $or: [
          { role: 'Admin' },
          { role: 'Manager', branch: appointment.branch }
        ],
        isActive: true
      });

      if (managers.length > 0) {
        const title = 'New Guest Booking';
        const contactInfo = phone ? ` (${phone})` : '';
        const body = `Guest ${name}${contactInfo} booked ${appointment.service} at ${appointment.branch?.name || 'Local Branch'} for ${new Date(appointment.date).toLocaleDateString()}`;

        // 1. Save to Database
        const dbNotifications = managers.map(m => ({
          recipient: m._id,
          title,
          message: body,
          type: 'appointment',
          link: `/appointments`
        }));
        await Notification.insertMany(dbNotifications);

        // 2. Trigger Push
        const allTokens = managers.reduce((acc, m) => {
          if (m.fcmTokens) acc.push(...m.fcmTokens);
          return acc;
        }, []);

        if (allTokens.length > 0) {
          await sendPushNotification({
            title,
            body,
            tokens: allTokens,
            data: { 
              appointmentId: appointment._id.toString(),
              clientId: client._id.toString()
            }
          });
        }
      }
    } catch (notifErr) {
      console.error('Non-blocking Notification Error:', notifErr);
    }

    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getAppointments,
  getPublicAppointments,
  createAppointment,
  createGuestAppointment,
  updateAppointment,
  updateAppointmentStatus,
  deleteAppointment
};
