const Appointment = require('../../models/operations/Appointment');
const { paginateModelQuery } = require('../../utils/pagination');

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
  try {
    let query = {};
    
    // IDOR Prevention: Filter logically based on role and branch
    if (req.user.role === 'Admin') {
      // Global admin sees all
    } else if (req.user.role === 'Manager') {
      // Manager sees their branch
      if (req.user.branch) {
        query.branch = req.user.branch;
      }
    } else if (req.user.role === 'Employee') {
      // Employee sees their branch or only their own tasks? 
      // Usually employees see all appointments for the branch to coordinate.
      if (req.user.branch) {
        query.branch = req.user.branch;
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
    const appointmentData = {
      ...req.body,
      // Enforce branch from user if not provided or to prevent spoofing
      branch: req.body.branch || req.user.branch,
      user: req.user._id // Track who created it
    };

    if (!appointmentData.branch && req.user.role !== 'Admin') {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    // Auto-resolve clientId if missing but client (name) is present
    if (!appointmentData.clientId && appointmentData.client) {
      const Client = require('../../models/operations/Client');
      const foundClient = await Client.findOne({ name: appointmentData.client });
      if (foundClient) {
        appointmentData.clientId = foundClient._id;
      }
    }

    const appointment = await Appointment.create(appointmentData);

    // Membership Integration: Automatically deduct sessions if applicable
    if (appointment.clientId) {
      const Membership = require('../../models/operations/Membership');
      const Service = require('../../models/operations/Service');
      
      // Find the service to check its ID if needed
      const serviceObj = await Service.findOne({ name: appointment.service });
      const serviceId = appointment.serviceId || serviceObj?._id;

      if (serviceId) {
        let activeMembership;
        if (req.body.membershipId) {
          activeMembership = await Membership.findById(req.body.membershipId).populate('plan');
        } else {
          activeMembership = await Membership.findOne({
            client: appointment.clientId,
            status: 'Active',
            remainingSessions: { $gt: 0 }
          }).populate('plan');
        }

        if (activeMembership) {
          // Check if this service is covered by the plan
          const isApplicable = activeMembership.plan.applicableServices.some(
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

    // IDOR Check: Ensure user has rights to this specific appointment
    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = req.user.branch && appointment.branch?.toString() === req.user.branch.toString();
    const isAdmin = req.user.role === 'Admin';

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not own this resource' });
    }

    Object.assign(appointment, req.body);
    const updatedAppointment = await appointment.save();
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
    const isBranchStaff = req.user.branch && appointment.branch?.toString() === req.user.branch.toString();
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

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment
};
