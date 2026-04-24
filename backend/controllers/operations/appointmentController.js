const Appointment = require('../../models/operations/Appointment');
const User = require('../../models/core/User');
const Notification = require('../../models/core/Notification');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch } = require('../../utils/branch');

const ANY_SPECIALIST = 'Any available specialist';

// Helper: convert "YYYY-MM-DD" + "HH:mm" into minutes since midnight for overlap math
const parseTime = (date, time) => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return h * 60 + (m || 0);
};

const parseTime12ToMinutes = (time = '') => {
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
  if (!match) return null;

  let hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  const period = match[3]?.toUpperCase();

  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;

  return (hours * 60) + minutes;
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
      if (userBranchId) {
        query.branch = userBranchId;
      }
    } else if (req.user.role === 'Client') {
      query.clientId = req.user._id;
    }

    // Optional dynamic filters
    if (req.query.roomId) query.roomId = req.query.roomId;
    if (req.query.room) query.room = req.query.room;
    if (req.query.clientId) query.clientId = req.query.clientId;
    if (req.query.date) query.date = req.query.date;
    if (req.query.status) query.status = req.query.status;

    const { data, pagination } = await paginateModelQuery(Appointment, query, req, {
      sort: { date: -1, time: -1 },
      populate: ['branch', 'clientId']
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
        const Room = require('../../models/operations/Room');
        
        const selectedService = await Service.findOne({ name: appointmentData.service });
        const serviceDuration = selectedService?.duration || 60;
        
        const selectedRoom = room ? await Room.findOne({ name: room }) : null;
        const roomCleaning = selectedRoom?.cleaningDuration || 0;
        const totalNewOccupancy = serviceDuration + roomCleaning;

        // Get all active appointments for this date
        const existingApts = await Appointment.find({
          branch: appointmentData.branch,
          date,
          status: { $in: ['Confirmed', 'Pending'] }
        });

        const newStart = parseTime(date, time);
        const newEnd = newStart + totalNewOccupancy;

        let occupiedRoomCount = 0;

        for (const apt of existingApts) {
          const existingService = await Service.findOne({ name: apt.service });
          const existingDuration = existingService?.duration || 60;
          
          const aptRoom = apt.room ? await Room.findOne({ name: apt.room }) : null;
          const aptCleaning = aptRoom?.cleaningDuration || 0;
          const totalExistingOccupancy = existingDuration + aptCleaning;

          const existingStart = parseTime(apt.date, apt.time);
          const existingEnd = existingStart + totalExistingOccupancy;

          const overlaps = newStart < existingEnd && newEnd > existingStart;

          if (overlaps) {
            // Check Specialist Conflict
            if (apt.employee === employee) {
              return res.status(409).json({ message: `${employee} is already booked at this time (including cleaning buffer).` });
            }
            
            // Check Room Conflict (Specific Room)
            if (room && apt.room === room) {
              return res.status(409).json({ message: `Room "${room}" is occupied/cleaning during this period.` });
            }

            // Track room occupancy for capacity check
            if (apt.room) {
              occupiedRoomCount++;
            }
          }
        }

        // Branch-wide Room Capacity Check (for Guest/Unassigned Room bookings)
        if (!room) {
          const allRoomsInBranch = await Room.find({ branch: appointmentData.branch });
          const roomCapacity = allRoomsInBranch.length || 999;
          if (occupiedRoomCount >= roomCapacity) {
            return res.status(409).json({ message: `All rooms in this branch are occupied or cleaning during this period.` });
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
    const { branch, date, status } = req.query;
    let query = {
      status: { $in: ['Confirmed', 'Pending'] }
    };
    if (branch) query.branch = branch;
    if (date) query.date = date;
    if (status) {
      const statusList = String(status)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      if (statusList.length === 1) {
        query.status = statusList[0];
      } else if (statusList.length > 1) {
        query.status = { $in: statusList };
      }
    }

    // Only return fields needed for availability calculation
    const appointments = await Appointment.find(query)
      .select('date time service employee room branch status')
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

    if (!name || !phone || !email || !rest.service || !rest.date || !rest.time || !appointmentBranch) {
      return res.status(400).json({ message: 'Missing required booking details' });
    }

    // Server-side conflict validation to prevent double booking
    const Service = require('../../models/operations/Service');
    const selectedService = await Service.findOne({ name: rest.service }) || await Service.findById(rest.service).catch(() => null);
    const serviceDuration = selectedService?.duration || 60;
    const existingApts = await Appointment.find({
      branch: appointmentBranch,
      date: rest.date,
      status: { $in: ['Confirmed', 'Pending'] }
    });
    const newStart = parseTime(rest.date, rest.time);
    const newEnd = newStart + serviceDuration;

    const windows = [];
    for (const apt of existingApts) {
      const existingService = await Service.findOne({ name: apt.service });
      const existingDuration = existingService?.duration || 60;
      const existingStart = parseTime(apt.date, apt.time);
      const existingEnd = existingStart + existingDuration;
      windows.push({
        employee: apt.employee,
        room: apt.room,
        start: existingStart,
        end: existingEnd
      });
    }

    // Room conflict regardless of specialist selection
    if (rest.room) {
      const roomOverlap = windows.some(w => (newStart < w.end && newEnd > w.start) && w.room === rest.room);
      if (roomOverlap) {
        return res.status(409).json({ message: `Room "${rest.room}" is already booked at this time. Please choose a different slot or room.` });
      }
    }

    // If a specific employee is chosen, validate conflict.
    const wantsAny = !rest.employee || rest.employee === ANY_SPECIALIST;
    if (!wantsAny) {
      const empOverlap = windows.some(w => (newStart < w.end && newEnd > w.start) && w.employee === rest.employee);
      if (empOverlap) {
        return res.status(409).json({ message: `${rest.employee} is already booked at this time. Please choose a different slot.` });
      }
    }

    // General booking: auto-assign an available specialist
    if (wantsAny) {
      const Employee = require('../../models/human-resources/Employee');
      const Shift = require('../../models/human-resources/Shift');

      const employees = await Employee.find({ branch: appointmentBranch, status: 'Active' })
        .select('_id name shift services')
        .lean();

      const shiftNames = employees.map(e => e.shift).filter(Boolean);
      const shifts = shiftNames.length > 0
        ? await Shift.find({ name: { $in: Array.from(new Set(shiftNames)) } }).select('name startTime endTime').lean()
        : [];

      const serviceName = selectedService?.name || rest.service;

      const isWithinShift = (employee) => {
        const shift = shifts.find(s => s.name === employee.shift);
        if (!shift?.startTime || !shift?.endTime) return true; // no shift => assume available

        const startMin = parseTime12ToMinutes(shift.startTime);
        const endMin = parseTime12ToMinutes(shift.endTime);
        if (startMin === null || endMin === null) return true;

        let shiftStart = startMin;
        let shiftEnd = endMin;
        let apptStart = newStart;
        let apptEnd = newEnd;

        if (shiftEnd < shiftStart) {
          shiftEnd += 1440;
          if (apptStart < shiftStart) {
            apptStart += 1440;
            apptEnd += 1440;
          }
        }

        return apptStart >= shiftStart && apptEnd <= shiftEnd;
      };

      const matchesService = (employee) => {
        const list = Array.isArray(employee.services) ? employee.services : [];
        if (list.length === 0) return true;
        return list.includes(serviceName);
      };

      const isEmployeeFree = (employeeName) => !windows.some(w => (newStart < w.end && newEnd > w.start) && w.employee === employeeName);

      const candidate = employees.find(e => matchesService(e) && isWithinShift(e) && isEmployeeFree(e.name));
      if (!candidate) {
        return res.status(409).json({ message: 'No specialists are available for this time. Please choose a different slot.' });
      }

      rest.employee = candidate.name;
      rest.employeeId = candidate._id;
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
