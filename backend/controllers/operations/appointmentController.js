const Appointment = require('../../models/operations/Appointment');
const User = require('../../models/core/User');
const Notification = require('../../models/core/Notification');
const Branch = require('../../models/operations/Branch');
const crypto = require('crypto');
const { paginateModelQuery } = require('../../utils/pagination');
const { getBranchId, sameBranch, toObjectIdIfValid } = require('../../utils/branch');
const { findServiceForBranch, hasServiceBranch } = require('../../utils/serviceBranches');
const mongoose = require('mongoose');

const ANY_SPECIALIST = 'Any available specialist';

const buildReferralCode = (clientId = '') => `REF-${String(clientId || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || Date.now()}`;
const buildBranchClientPrefix = (branchName = '') => {
  const letters = String(branchName || '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 2)
    .toUpperCase();
  return (letters || 'CL').padEnd(2, 'X');
};
const buildNextBranchClientId = async (branchId) => {
  const branch = branchId ? await Branch.findById(branchId).select('name').lean() : null;
  const prefix = buildBranchClientPrefix(branch?.name);
  const rx = new RegExp(`^${prefix}-\\d{4}$`);
  const lastClient = await User.findOne({ role: 'Client', clientId: rx })
    .sort({ clientId: -1 })
    .select('clientId')
    .lean();
  const lastNumber = Number(lastClient?.clientId?.match(/\d+$/)?.[0] || 0);
  return `${prefix}-${String(lastNumber + 1).padStart(4, '0')}`;
};

const normalizePersonName = (name = '') => String(name || '').trim().toLowerCase();
const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();
const normalizePhone = (phone = '') => String(phone || '').replace(/\D/g, '');
const isSamePersonName = (left = '', right = '') => {
  const normalizedLeft = normalizePersonName(left);
  const normalizedRight = normalizePersonName(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};
const isSameEmail = (left = '', right = '') => {
  const normalizedLeft = normalizeEmail(left);
  const normalizedRight = normalizeEmail(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};
const isSamePhone = (left = '', right = '') => {
  const normalizedLeft = normalizePhone(left);
  const normalizedRight = normalizePhone(right);
  return Boolean(normalizedLeft && normalizedRight && normalizedLeft === normalizedRight);
};

const buildReferralLookupConditions = (referralCustomer, referralCode) => {
  const lookups = [referralCustomer, referralCode]
    .map(value => String(value || '').trim())
    .filter(Boolean);

  const conditions = [];
  for (const lookup of lookups) {
    conditions.push(
      { name: lookup },
      { email: lookup.toLowerCase() },
      { clientId: lookup },
      { referralCode: lookup }
    );
    const lookupObjectId = toObjectIdIfValid(lookup);
    if (lookupObjectId && typeof lookupObjectId === 'object') {
      conditions.push({ _id: lookupObjectId });
    }
  }

  return conditions;
};

const findReferralClient = async (appointmentData = {}) => {
  const conditions = buildReferralLookupConditions(
    appointmentData.referralCustomer,
    appointmentData.referralCode
  );
  if (conditions.length === 0) return null;

  return User.findOne({
    role: 'Client',
    $or: conditions
  }).select('_id name email phone clientId referralCode branch');
};

const getReferralSelfConflict = (appointmentData = {}, referralClient = null) => {
  if (!appointmentData.referralCustomer && !appointmentData.referralCode) return '';

  if (
    isSamePersonName(appointmentData.client, appointmentData.referralCustomer) ||
    isSamePersonName(appointmentData.client, referralClient?.name)
  ) {
    return 'Referral customer cannot be the same as the appointment client.';
  }

  if (
    isSameEmail(appointmentData.clientEmail, appointmentData.referralCustomer) ||
    isSameEmail(appointmentData.clientEmail, referralClient?.email)
  ) {
    return 'Referral customer email cannot be the same as the appointment client email.';
  }

  if (
    isSamePhone(appointmentData.clientPhone, appointmentData.referralCustomer) ||
    isSamePhone(appointmentData.clientPhone, referralClient?.phone)
  ) {
    return 'Referral customer phone cannot be the same as the appointment client phone.';
  }

  return '';
};

const createClientProfileFromAppointment = async ({
  name,
  phone,
  email,
  branch,
  referralClient = null,
  notes = 'Created via Appointment Booking'
}) => {
  const cleanName = String(name || '').trim();
  const cleanEmail = normalizeEmail(email);
  const cleanPhone = String(phone || '').trim();
  const assignedBranch = toObjectIdIfValid(branch);

  if (!cleanName || !cleanEmail || !cleanPhone || !assignedBranch) return null;

  const nextClientId = await buildNextBranchClientId(assignedBranch);
  const client = await User.create({
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    role: 'Client',
    status: 'Active',
    notes,
    branch: assignedBranch,
    clientId: nextClientId,
    referralCode: buildReferralCode(nextClientId),
    referredBy: referralClient?._id,
    password: crypto.randomBytes(16).toString('hex')
  });

  if (referralClient?._id) {
    await User.findByIdAndUpdate(referralClient._id, { $inc: { totalReferrals: 1 } });
  }

  return client;
};

// Helper: convert "YYYY-MM-DD" + "HH:mm" into minutes since midnight for overlap math
// Helper: convert "YYYY-MM-DD" + "HH:mm" into minutes since midnight for overlap math
const parseTime = (date, time) => {
  if (!time) return 0;
  
  // Try 24h format HH:mm
  const match24 = String(time).trim().match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
  }

  // Try 12h format (8am, 9 PM, 8:30 PM, etc)
  const match12 = String(time).trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2] || '0', 10);
    const period = match12[3]?.toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    return (hours * 60) + minutes;
  }

  return 0;
};

const normalizeQuantity = (value) => {
  const quantity = Number(value);
  if (!Number.isFinite(quantity) || quantity < 1) return 1;
  return Math.floor(quantity);
};

const resolveServiceForAppointment = async (Service, branchId, serviceId, serviceName) => {
  const branch = toObjectIdIfValid(branchId);
  const rawId = getBranchId(serviceId);
  const id = rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId)) ? rawId : null;

  if (id) {
    const service = await findServiceForBranch(Service, branch, id, null);
    if (!service) return { error: 'Selected service was not found in the appointment branch.', status: 403 };
    return { service };
  }

  if (!serviceName) return { service: null };

  const service = await findServiceForBranch(Service, branch, null, serviceName);
  return { service };
};

const normalizeAppointmentServices = async (Service, appointmentData) => {
  const branchId = appointmentData.branch;
  const primary = await resolveServiceForAppointment(
    Service,
    branchId,
    appointmentData.serviceId,
    appointmentData.service
  );

  if (primary.error) return primary;

  const primaryQuantity = normalizeQuantity(appointmentData.quantity);
  const primaryService = primary.service;
  if (!primaryService) {
    return { error: 'Selected service is not available in the appointment branch.', status: 403 };
  }
  if (primaryService.status && primaryService.status !== 'Active') {
    return { error: 'Selected service is inactive for the appointment branch.', status: 403 };
  }

  appointmentData.quantity = primaryQuantity;

  if (primaryService) {
    appointmentData.serviceId = primaryService._id;
    appointmentData.service = primaryService.name;
  }

  const primaryDuration = Number(primaryService?.duration || 60);
  let totalQuantity = primaryQuantity;
  let totalDuration = primaryDuration * primaryQuantity;
  let totalAmount = 0; // Start at 0; membership-covered services stay free

  // Resolve membership status for this client/service
  const getMembershipForService = async (serviceId, clientId, branch) => {
    const Membership = require('../../models/operations/Membership');
    const membership = await Membership.findOne({
      client: clientId,
      branch: toObjectIdIfValid(branch),
      status: 'Active',
      remainingSessions: { $gt: 0 }
    }).populate('plan').lean();

    if (!membership) return null;

    const applicableServices = Array.isArray(membership.plan?.applicableServices)
      ? membership.plan.applicableServices
      : [];
    // Empty applicableServices = covers all services
    const isCovered = applicableServices.length === 0 ||
      applicableServices.some(id => id.toString() === serviceId.toString());

    return isCovered ? membership : null;
  };

  const clientId = appointmentData.clientId;
  let primaryMembership = null;
  if (clientId && primaryService?._id) {
    primaryMembership = await getMembershipForService(primaryService._id, clientId, branchId);
  }

  // Primary service price: ₹0 if membership covers it
  const primaryPrice = primaryMembership ? 0 : Number(primaryService?.price || 0);
  totalAmount += primaryPrice * primaryQuantity;

  // Mark primary as membership-covered for downstream billing logic
  appointmentData._primaryMembershipId = primaryMembership?._id || null;
  appointmentData._primaryServiceCovered = !!primaryMembership;

  const normalizedAddOns = [];
  let addOnMembership = null;

  for (const addOn of appointmentData.addOns || []) {
    const serviceName = addOn?.service || addOn?.name;
    const addOnServiceResult = await resolveServiceForAppointment(
      Service,
      branchId,
      addOn?.serviceId,
      serviceName
    );

    if (addOnServiceResult.error) return addOnServiceResult;

    const addOnService = addOnServiceResult.service;
    if (!addOnService && !serviceName) continue;
    if (!addOnService) {
      return { error: 'Selected add-on service is not available in the appointment branch.', status: 403 };
    }
    if (addOnService.status && addOnService.status !== 'Active') {
      return { error: 'Selected add-on service is inactive for the appointment branch.', status: 403 };
    }

    const quantity = normalizeQuantity(addOn?.quantity);
    const isCovered = addOn?.isMembershipCovered === true ||
      addOn?.bookingType === 'Membership' ||
      addOn?.price === 0;

    // Price logic: respect explicit ₹0 / covered flag, otherwise use service price
    const price = isCovered
      ? 0
      : (Number(addOn?.price ?? addOnService?.price ?? 0) || 0);
    const duration = Number(addOnService?.duration ?? addOn?.duration ?? 0) || 0;

    // Track if ANY service is membership-covered (use same membership for all if client has one)
    if (!addOnMembership && isCovered && clientId && addOnService?._id) {
      addOnMembership = await getMembershipForService(addOnService._id, clientId, branchId);
    }

    normalizedAddOns.push({
      serviceId: addOnService?._id || addOn?.serviceId,
      service: addOnService?.name || serviceName,
      price,
      duration,
      quantity,
      isMembershipCovered: isCovered,
      membershipId: isCovered ? (addOn?.membershipId || addOnMembership?._id || appointmentData.membershipId || undefined) : undefined,
      bookingType: isCovered ? 'Membership' : 'Normal',
      membershipPlanName: addOn?.membershipPlanName || ''
    });

    totalQuantity += quantity;
    totalDuration += duration * quantity;
    totalAmount += price * quantity;
  }

  appointmentData.addOns = normalizedAddOns;
  appointmentData.totalQuantity = totalQuantity;
  appointmentData.totalDuration = totalDuration || primaryDuration;
  appointmentData.totalAmount = totalAmount;

  // Auto-link the first found membershipId from any covered service
  const linkedMembershipId = appointmentData._primaryMembershipId || addOnMembership?._id || null;
  if (linkedMembershipId) {
    appointmentData.membershipId = linkedMembershipId;
    appointmentData.serviceType = 'MEMBERSHIP';
    appointmentData.bookingType = 'Membership';
  }

  return { appointmentData };
};

const resolveEmployeeForAppointment = async (Employee, branchId, employeeId, employeeName) => {
  const branch = toObjectIdIfValid(branchId);
  const rawId = getBranchId(employeeId);
  const id = rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId)) ? rawId : null;

  if (id) {
    const employee = await Employee.findById(id).select('_id branch name status');
    if (!employee) return { error: 'Selected employee was not found.', status: 400 };
    if (!sameBranch(employee.branch, branch)) {
      return { error: 'Access Denied: Selected employee belongs to another branch.', status: 403 };
    }
    if (employee.status && employee.status !== 'Active') {
      return { error: 'Selected employee is inactive in the appointment branch.', status: 403 };
    }
    return { employee };
  }

  if (!employeeName || employeeName === 'None') return { employee: null };

  const employee = await Employee.findOne({
    name: employeeName,
    branch
  }).select('_id branch name status');

  if (!employee) {
    return { error: 'Selected employee is not available in the appointment branch.', status: 403 };
  }
  if (employee.status && employee.status !== 'Active') {
    return { error: 'Selected employee is inactive in the appointment branch.', status: 403 };
  }

  return { employee };
};

const resolveRoomForAppointment = async (Room, branchId, roomId, roomName) => {
  const branch = toObjectIdIfValid(branchId);
  const rawId = getBranchId(roomId);
  const id = rawId && /^[0-9a-fA-F]{24}$/.test(String(rawId)) ? rawId : null;

  if (id) {
    const room = await Room.findById(id).select('_id branch name isActive');
    if (!room) return { error: 'Selected room was not found.', status: 400 };
    if (!sameBranch(room.branch, branch)) {
      return { error: 'Access Denied: Selected room belongs to another branch.', status: 403 };
    }
    if (room.isActive === false) {
      return { error: 'Selected room is inactive in the appointment branch.', status: 403 };
    }
    return { room };
  }

  if (!roomName || roomName === 'None') return { room: null };

  const room = await Room.findOne({
    name: roomName,
    branch
  }).select('_id branch name isActive');

  if (!room) {
    return { error: 'Selected room is not available in the appointment branch.', status: 403 };
  }
  if (room.isActive === false) {
    return { error: 'Selected room is inactive in the appointment branch.', status: 403 };
  }

  return { room };
};

const getAppointmentDuration = async (Service, appointment, branchId) => {
  if (Number(appointment.totalDuration) > 0) return Number(appointment.totalDuration);

  const primary = await resolveServiceForAppointment(
    Service,
    branchId,
    appointment.serviceId,
    appointment.service
  );
  const primaryDuration = Number(primary.service?.duration || 60) * normalizeQuantity(appointment.quantity);
  const addOnDuration = await (appointment.addOns || []).reduce(async (durationPromise, addOn) => {
    const duration = await durationPromise;
    const result = await resolveServiceForAppointment(Service, branchId, addOn?.serviceId, addOn?.service);
    const serviceDuration = Number(result.service?.duration ?? addOn?.duration ?? 0) || 0;
    return duration + (serviceDuration * normalizeQuantity(addOn?.quantity));
  }, Promise.resolve(0));

  return primaryDuration + addOnDuration;
};

const refundMembershipSessionIfNeeded = async (appointmentId) => {
  try {
    const Membership = require('../../models/operations/Membership');
    const linkedMembership = await Membership.findOne({ "usageHistory.appointment": appointmentId }).populate('plan');
    if (linkedMembership) {
      linkedMembership.usageHistory = linkedMembership.usageHistory.filter(
        usage => usage.appointment?.toString() !== appointmentId.toString()
      );
      if (linkedMembership.plan) {
        const max = linkedMembership.plan.maxSessions || 0;
        if (max > 0) {
          linkedMembership.remainingSessions = Math.min(max, linkedMembership.remainingSessions + 1);
        } else {
          linkedMembership.remainingSessions += 1;
        }
      } else {
        linkedMembership.remainingSessions += 1;
      }
      await linkedMembership.save();
    }
  } catch (err) {
    console.error('Failed to refund membership session:', err);
  }
};

const deductMembershipSessionIfNeeded = async (appointment, session = null) => {
  try {
    if (appointment.serviceType !== 'MEMBERSHIP') return;
    if (!appointment.clientId) return;
    const Membership = require('../../models/operations/Membership');
    const ServiceModel = require('../../models/operations/Service');
    const serviceObj = await ServiceModel.findOne({
      name: appointment.service,
      branch: appointment.branch
    }).session(session);
    const serviceId = appointment.serviceId || serviceObj?._id;

    if (!serviceId) return;

    let activeMembership;
    if (appointment.membershipId) {
      activeMembership = await Membership.findById(appointment.membershipId).populate('plan').session(session);
    } else {
      activeMembership = await Membership.findOne({
        client: appointment.clientId,
        branch: appointment.branch,
        status: 'Active',
        remainingSessions: { $gt: 0 }
      }).populate('plan').session(session);
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
        await activeMembership.save({ session });
      }
    }
  } catch (err) {
    console.error('Failed to deduct membership session:', err);
  }
};

const isAppointmentAssignedToUser = (appointment, user) => {
  if (!appointment || !user) return false;
  const appointmentEmployeeId = getBranchId(appointment.employeeId);
  if (appointmentEmployeeId && appointmentEmployeeId.toString() === user._id.toString()) return true;

  const appointmentEmployeeName = String(appointment.employee || '').trim().toLowerCase();
  const userName = String(user.name || '').trim().toLowerCase();
  const userEmail = String(user.email || '').trim().toLowerCase();

  return Boolean(appointmentEmployeeName && (
    appointmentEmployeeName === userName ||
    appointmentEmployeeName === userEmail
  ));
};

const findCompletionEmployee = async (Employee, appointment, req) => {
  const branch = getBranchId(appointment.branch);

  if (req.authSource === 'Employee') {
    const employee = await Employee.findById(req.user._id).select('_id branch name role status');
    if (employee && sameBranch(employee.branch, branch)) return employee;
  }

  if (req.user.role === 'Employee' || (req.authSource === 'Employee' && req.user.role !== 'Manager' && req.user.role !== 'Admin')) {
    const employee = await Employee.findOne({
      branch: toObjectIdIfValid(branch),
      $or: [
        { email: req.user.email },
        { name: req.user.name }
      ]
    }).select('_id branch name role status');
    if (employee) return employee;
  }

  const appointmentEmployeeId = getBranchId(appointment.employeeId);
  if (appointmentEmployeeId) {
    const employee = await Employee.findById(appointmentEmployeeId).select('_id branch name role status');
    if (employee && sameBranch(employee.branch, branch)) return employee;
  }

  if (appointment.employee) {
    const employee = await Employee.findOne({
      branch: toObjectIdIfValid(branch),
      name: appointment.employee
    }).select('_id branch name role status');
    if (employee) return employee;
  }

  return null;
};

const applyCompletionMetadata = async (appointment, req, status) => {
  if (status !== 'Completed') {
    appointment.completedAt = undefined;
    appointment.completedBy = undefined;
    appointment.completedBySource = undefined;
    appointment.completedByEmployeeId = undefined;
    appointment.completedByName = undefined;
    appointment.completedByRole = undefined;
    return;
  }

  const Employee = require('../../models/human-resources/Employee');
  const completionEmployee = await findCompletionEmployee(Employee, appointment, req);

  appointment.completedAt = new Date();
  appointment.completedBy = req.user._id;
  appointment.completedBySource = req.authSource === 'Employee' ? 'Employee' : 'User';
  appointment.completedByEmployeeId = completionEmployee?._id || getBranchId(appointment.employeeId) || undefined;
  appointment.completedByName = completionEmployee?.name || appointment.employee || req.user.name;
  appointment.completedByRole = completionEmployee?.role || req.user.role;
};

// ============================================================
// ATOMIC CONFLICT VALIDATION (Race Condition Prevention)
// Uses MongoDB transactions to ensure thread-safe booking
// ============================================================

const ATOMIC_CONFLICT_STATES = ['Confirmed', 'Pending'];

/**
 * Validates appointment conflicts atomically using a MongoDB transaction.
 * This prevents race conditions where two simultaneous bookings could both pass validation.
 *
 * @param {Object} params - Validation parameters
 * @param {mongoose.Connection} params.connection - MongoDB connection for transaction
 * @param {string} params.branchId - Target branch ObjectId
 * @param {string} params.date - Appointment date (YYYY-MM-DD)
 * @param {string} params.time - Appointment time (HH:mm)
 * @param {string} params.employee - Employee name
 * @param {string} params.room - Room name (optional)
 * @param {number} params.serviceDuration - Total service duration in minutes
 * @param {number} params.cleaningDuration - Room cleaning duration in minutes
 * @returns {Promise<{conflict: boolean, message?: string}>}
 */
const validateConflictAtomically = async ({
  connection,
  branchId,
  date,
  time,
  employee: employeeName,
  room,
  serviceDuration,
  cleaningDuration
}) => {
  const session = await connection.startSession();
  session.startTransaction();

  try {
    const totalNewOccupancy = serviceDuration + cleaningDuration;
    const newStart = parseTime(date, time);
    const newEnd = newStart + totalNewOccupancy;

    // 1. Shift & Working Hours Validation (The "Is it open?" check)
    const Employee = connection.model('Employee');
    const Shift = connection.model('Shift');
    const Settings = connection.model('Settings');
    const Room = connection.model('Room');

    const employeeObj = await Employee.findOne({ branch: branchId, name: employeeName }).session(session);
    const settings = await Settings.findOne({}).session(session);
    
    // Day of week check
    const dayName = new Date(date).toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const workingHours = settings?.workingHours?.[dayName];

    if (workingHours && !workingHours.isOpen) {
      await session.abortTransaction();
      return { conflict: true, message: `The branch is closed on ${dayName}.` };
    }

    // Shift check
    if (employeeObj?.shift) {
      const shift = await Shift.findOne({ name: employeeObj.shift }).session(session);
      if (shift?.startTime && shift?.endTime) {
        let shiftStart = parseTime(date, shift.startTime);
        let shiftEnd = parseTime(date, shift.endTime);
        if (shiftEnd < shiftStart) shiftEnd += 1440; // overnight

        // Allow starting exactly at the end time for "extra work"
        if (newStart < shiftStart || newStart > shiftEnd) {
          await session.abortTransaction();
          return { conflict: true, message: `${employeeName} is not on shift at this time (${shift.startTime}-${shift.endTime}).` };
        }
      }
    }

    // 2. Overlap Validation
    const existingApts = await Appointment.find({
      branch: branchId,
      date: date,
      status: { $in: ATOMIC_CONFLICT_STATES }
    }).session(session);

    let occupiedRoomCount = 0;
    const branchRooms = await Room.find({ branch: branchId }).session(session);
    const roomCapacity = branchRooms.length || 999;

    for (const apt of existingApts) {
      const existingDuration = apt.totalDuration || 60;
      
      // Fetch cleaning duration for the room used in the existing appointment
      let existingCleaning = 0;
      if (apt.roomId || apt.room) {
        const aptRoom = branchRooms.find(r => 
          (apt.roomId && String(r._id) === String(apt.roomId)) || 
          (apt.room && r.name === apt.room)
        );
        existingCleaning = aptRoom?.cleaningDuration || 0;
      }

      const existingStart = parseTime(apt.date, apt.time);
      const existingEnd = existingStart + existingDuration + existingCleaning;

      const overlaps = newStart < existingEnd && newEnd > existingStart;

      if (overlaps) {
        // Employee conflict check
        if (apt.employee === employeeName) {
          await session.abortTransaction();
          return { conflict: true, message: `${employeeName} is already booked at this time.` };
        }

        // Specific room conflict
        if (room && apt.room === room) {
          await session.abortTransaction();
          return { conflict: true, message: `Room "${room}" is occupied/cleaning during this period.` };
        }

        // Track room occupancy
        if (apt.room) {
          occupiedRoomCount++;
        }
      }
    }

    // Room capacity check (for auto-assignment)
    if (!room && occupiedRoomCount >= roomCapacity) {
      await session.abortTransaction();
      return { conflict: true, message: `All rooms in this branch are occupied or cleaning during this period.` };
    }

    await session.commitTransaction();
    return { conflict: false };

  } catch (error) {
    await session.abortTransaction();
    if (error.code === 112 || error.code === 20) {
      return { conflict: true, message: 'Booking conflict detected. Please choose a different time slot.' };
    }
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Atomic appointment creation within a MongoDB transaction.
 * Ensures no race conditions during booking.
 */
const createAppointmentAtomic = async (session, appointmentData) => {
  return Appointment.create([appointmentData], { session });
};

// ============================================================
// END ATOMIC CONFLICT VALIDATION
// ============================================================

// @desc    Get all appointments
// @route   GET /api/appointments
// @access  Private
const getAppointments = async (req, res) => {
  try {
    let query = {};
    const userBranchId = getBranchId(req.user.branch);
    const requestedBranch = req.query.branch && req.query.branch !== 'all' ? getBranchId(req.query.branch) : null;

    // IDOR Prevention: Filter logically based on role and branch
    if (req.user.role === 'Admin') {
      if (requestedBranch) {
        query.branch = toObjectIdIfValid(requestedBranch);
      }
    } else if (req.user.role === 'Client') {
      query.clientId = req.user._id;
      if (userBranchId) {
        query.branch = toObjectIdIfValid(userBranchId);
      }
    } else {
      if (!userBranchId) {
        return res.status(403).json({ message: 'Access Denied: Branch assignment required.' });
      }
      if (requestedBranch && !sameBranch(requestedBranch, userBranchId)) {
        return res.status(403).json({ message: 'Access Denied: Cannot view appointments for another branch.' });
      }
      query.branch = toObjectIdIfValid(userBranchId);
      if (req.user.role === 'Employee' || (req.authSource === 'Employee' && req.user.role !== 'Manager' && req.user.role !== 'Admin')) {
        query.status = { $ne: 'Pending' };
      }
    }

    // Optional dynamic filters
    if (req.query.roomId) query.roomId = req.query.roomId;
    if (req.query.room) query.room = req.query.room;
    if (req.query.clientId && req.user.role !== 'Client') query.clientId = req.query.clientId;
    if (req.query.date) query.date = req.query.date;
    if (!req.query.date && (req.query.dateFrom || req.query.dateTo)) {
      query.date = {};
      if (req.query.dateFrom) query.date.$gte = req.query.dateFrom;
      if (req.query.dateTo) query.date.$lte = req.query.dateTo;
    }
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
    const isAdmin = req.user.role === 'Admin';
    const isClient = req.user.role === 'Client';

    if (!isAdmin && !sameBranch(appointmentBranchId, userBranchId)) {
      return res.status(403).json({ message: 'Access Denied: Cannot create appointments for another branch.' });
    }

    if (isClient && req.body.clientId && req.body.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access Denied: Clients can only book for themselves.' });
    }

    const appointmentData = {
      ...req.body,
      branch: toObjectIdIfValid(appointmentBranchId),
      user: req.user._id
    };

    // Sanitize optional ObjectIds to avoid Mongoose CastErrors
    if (appointmentData.membershipId === '' || appointmentData.membershipId === 'None') {
      delete appointmentData.membershipId;
    }
    if (appointmentData.serviceId === '' || appointmentData.serviceId === 'None') {
      delete appointmentData.serviceId;
    }
    if (appointmentData.employeeId === '' || appointmentData.employeeId === 'None') {
      delete appointmentData.employeeId;
    }
    if (appointmentData.roomId === '' || appointmentData.roomId === 'None') {
      delete appointmentData.roomId;
    }

    if (!appointmentData.branch) {
      return res.status(400).json({ message: 'Branch assignment required' });
    }

    const Service = require('../../models/operations/Service');
    const Employee = require('../../models/human-resources/Employee');
    const Room = require('../../models/operations/Room');

    if (appointmentData.serviceId) {
      const targetService = await findServiceForBranch(Service, appointmentData.branch, appointmentData.serviceId, null);
      if (!targetService) {
        return res.status(403).json({ message: 'Access Denied: Selected service belongs to another branch.' });
      }
      appointmentData.service = appointmentData.service || targetService.name;
    }

    if (appointmentData.employeeId) {
      const targetEmployee = await Employee.findById(appointmentData.employeeId).select('branch name');
      if (!targetEmployee || !sameBranch(targetEmployee.branch, appointmentData.branch)) {
        return res.status(403).json({ message: 'Access Denied: Selected employee belongs to another branch.' });
      }
      appointmentData.employee = appointmentData.employee || targetEmployee.name;
    }

    if (appointmentData.roomId) {
      const targetRoom = await Room.findById(appointmentData.roomId).select('branch name');
      if (!targetRoom || !sameBranch(targetRoom.branch, appointmentData.branch)) {
        return res.status(403).json({ message: 'Access Denied: Selected room belongs to another branch.' });
      }
      appointmentData.room = appointmentData.room || targetRoom.name;
    }

    const employeeSelection = await resolveEmployeeForAppointment(
      Employee,
      appointmentData.branch,
      appointmentData.employeeId,
      appointmentData.employee
    );
    if (employeeSelection.error) {
      return res.status(employeeSelection.status || 400).json({ message: employeeSelection.error });
    }
    if (employeeSelection.employee) {
      appointmentData.employeeId = employeeSelection.employee._id;
      appointmentData.employee = employeeSelection.employee.name;
    }

    const roomSelection = await resolveRoomForAppointment(
      Room,
      appointmentData.branch,
      appointmentData.roomId,
      appointmentData.room
    );
    if (roomSelection.error) {
      return res.status(roomSelection.status || 400).json({ message: roomSelection.error });
    }
    if (roomSelection.room) {
      appointmentData.roomId = roomSelection.room._id;
      appointmentData.room = roomSelection.room.name;
    }

    const serviceSummary = await normalizeAppointmentServices(Service, appointmentData);
    if (serviceSummary.error) {
      return res.status(serviceSummary.status || 400).json({ message: serviceSummary.error });
    }

    // --- ATOMIC CONFLICT VALIDATION (Race Condition Prevention) ---
    const { date, time, employee, room } = appointmentData;
    if (date && time && employee) {
      const selectedService = await findServiceForBranch(Service, appointmentData.branch, appointmentData.serviceId, appointmentData.service).catch(() => null);
      const serviceDuration = appointmentData.totalDuration || selectedService?.duration || 60;

      const selectedRoom = room ? await Room.findOne({
        name: room,
        branch: toObjectIdIfValid(appointmentData.branch)
      }) : null;
      const roomCleaning = selectedRoom?.cleaningDuration || 0;

      // Use atomic conflict validation with MongoDB transaction
      const conflictResult = await validateConflictAtomically({
        connection: Appointment.db,
        branchId: appointmentData.branch,
        date,
        time,
        employee,
        room,
        serviceDuration,
        cleaningDuration: roomCleaning
      });

      if (conflictResult.conflict) {
        return res.status(409).json({ message: conflictResult.message });
      }
    }
    // ------------------------------------------
    // Note: Actual appointment creation still needs transaction for atomicity
    // See below after client resolution

    const referralClient = await findReferralClient(appointmentData);
    const referralConflict = getReferralSelfConflict(appointmentData, referralClient);
    if (referralConflict) {
      return res.status(400).json({ message: referralConflict });
    }

    // Auto-resolve clientId
    if (isClient) {
      appointmentData.clientId = req.user._id;
      appointmentData.client = req.user.name || appointmentData.client;
      appointmentData.clientEmail = req.user.email || appointmentData.clientEmail;
      appointmentData.clientPhone = req.user.phone || appointmentData.clientPhone;
    } else if (appointmentData.clientId) {
      const targetClient = await User.findById(appointmentData.clientId).select('_id role branch phone email referredBy');
      if (!targetClient || targetClient.role !== 'Client') {
        return res.status(400).json({ message: 'Invalid client selection for appointment.' });
      }
      if (!sameBranch(targetClient.branch, appointmentData.branch)) {
        return res.status(403).json({ message: 'Access Denied: Selected client belongs to another branch.' });
      }
      appointmentData.clientPhone = targetClient.phone || appointmentData.clientPhone;
      appointmentData.clientEmail = targetClient.email || appointmentData.clientEmail;
    } else if (!appointmentData.clientId) {
      let foundClient = null;

      // Look up by email or phone first to prevent duplicate registrations via typo names
      const queryOr = [];
      if (appointmentData.clientEmail) {
        queryOr.push({ email: appointmentData.clientEmail.toLowerCase() });
      }
      if (appointmentData.clientPhone) {
        queryOr.push({ phone: appointmentData.clientPhone.trim() });
      }

      if (queryOr.length > 0) {
        foundClient = await User.findOne({
          role: 'Client',
          $or: queryOr
        });
      }

      // Fallback: look up by name
      if (!foundClient && appointmentData.client) {
        foundClient = await User.findOne({
          name: appointmentData.client,
          role: 'Client',
          branch: toObjectIdIfValid(appointmentData.branch)
        });
        if (!foundClient) {
          foundClient = await User.findOne({
            name: appointmentData.client,
            role: 'Client'
          });
        }
      }

      if (foundClient) {
        appointmentData.clientId = foundClient._id;
        appointmentData.client = foundClient.name; // Synchronize name to existing profile to prevent duplicate guest creation
        appointmentData.clientPhone = foundClient.phone || appointmentData.clientPhone;
        appointmentData.clientEmail = foundClient.email || appointmentData.clientEmail;
      } else if (referralClient) {
        const createdClient = await createClientProfileFromAppointment({
          name: appointmentData.client,
          phone: appointmentData.clientPhone,
          email: appointmentData.clientEmail,
          branch: appointmentData.branch,
          referralClient
        });

        if (createdClient) {
          appointmentData.clientId = createdClient._id;
          appointmentData.client = createdClient.name;
          appointmentData.clientPhone = createdClient.phone || appointmentData.clientPhone;
          appointmentData.clientEmail = createdClient.email || appointmentData.clientEmail;
        }
      }
    }

    // Existing clients cannot be referred on an appointment, so clear referral fields
    if (appointmentData.clientId) {
      delete appointmentData.referralCustomer;
      delete appointmentData.referralCode;
    }

    // Set serviceType and bookingType based on membershipId
    if (appointmentData.membershipId && appointmentData.membershipId !== 'None' && appointmentData.membershipId !== '') {
      appointmentData.serviceType = 'MEMBERSHIP';
      appointmentData.bookingType = 'Membership';
    } else {
      appointmentData.serviceType = 'REGULAR';
      appointmentData.bookingType = 'Normal';
      delete appointmentData.membershipId;
    }

    // Membership Booking Validation
    if (appointmentData.serviceType === 'MEMBERSHIP') {
      const Membership = require('../../models/operations/Membership');
      const activeMembership = await Membership.findById(appointmentData.membershipId).populate('plan');
      if (!activeMembership) {
        return res.status(400).json({ message: 'Selected membership plan not found.' });
      }
      if (activeMembership.status !== 'Active') {
        return res.status(400).json({ message: 'Selected membership is not active.' });
      }
      if (activeMembership.remainingSessions <= 0) {
        return res.status(400).json({ message: 'Selected membership has zero remaining sessions.' });
      }
      if (activeMembership.client?.toString() !== appointmentData.clientId?.toString()) {
        return res.status(400).json({ message: 'Selected membership does not belong to the selected client.' });
      }

      // Check if selected service is covered by the membership plan
      const ServiceModel = require('../../models/operations/Service');
      const serviceObj = await ServiceModel.findOne({
        name: appointmentData.service,
        branch: appointmentData.branch
      });
      const serviceId = appointmentData.serviceId || serviceObj?._id;

      if (serviceId) {
        const applicableServices = Array.isArray(activeMembership.plan?.applicableServices)
          ? activeMembership.plan.applicableServices
          : [];
        const isApplicable = applicableServices.length === 0 || applicableServices.some(
          id => id.toString() === serviceId.toString()
        );
        if (!isApplicable) {
          return res.status(400).json({ message: `The selected service "${appointmentData.service}" is not included in this membership plan.` });
        }
      }
    }

    // ============================================================
    // ATOMIC APPOINTMENT CREATION (With Transaction)
    // Ensures appointment + membership update are atomic
    // ============================================================
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const createdApts = await Appointment.create([appointmentData], { session });
      const appointment = createdApts[0];

      if (appointment.status === 'Completed') {
        appointment.completedAt = new Date();
        appointment.completedBy = req.user._id;
        appointment.completedBySource = req.authSource === 'Employee' ? 'Employee' : 'User';
        appointment.completedByName = req.user.name;
        appointment.completedByRole = req.user.role;
        await appointment.save();
      }

      // Membership Integration (within same transaction) - Only deduct if COMPLETED and serviceType is MEMBERSHIP!
      if (appointment.clientId && appointment.status === 'Completed' && appointment.serviceType === 'MEMBERSHIP') {
        const Membership = require('../../models/operations/Membership');
        const ServiceModel = require('../../models/operations/Service');
        const serviceObj = await ServiceModel.findOne({
          name: appointment.service,
          branch: toObjectIdIfValid(appointment.branch)
        }).session(session);
        const serviceId = appointment.serviceId || serviceObj?._id;

        if (serviceId) {
          let activeMembership;
          if (appointmentData.membershipId) {
            activeMembership = await Membership.findById(appointmentData.membershipId).populate('plan').session(session);
            if (activeMembership && !sameBranch(activeMembership.branch, appointment.branch)) {
              throw new Error('Membership does not belong to this branch.');
            }
          } else {
            activeMembership = await Membership.findOne({
              client: appointment.clientId,
              branch: appointment.branch,
              status: 'Active',
              remainingSessions: { $gt: 0 }
            }).populate('plan').session(session);
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
              await activeMembership.save({ session });
            }
          }
        }
      }

      await session.commitTransaction();
      session.endSession();

      // --- REAL-TIME NOTIFICATION INTEGRATION (Outside transaction - non-critical) ---
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

      res.status(201).json(appointment);

    } catch (error) {
      await session.abortTransaction();
      session.endSession();

      // Handle duplicate key error specifically for race conditions
      if (error.code === 11000) {
        return res.status(409).json({ message: 'Booking conflict detected. Please choose a different time slot.' });
      }

      res.status(400).json({ message: error.message });
    }
    // ============================================================
    // END ATOMIC APPOINTMENT CREATION
    // ============================================================
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
    const isAdmin = req.user.role === 'Admin';
    const isBranchMatch = sameBranch(appointment.branch, req.user.branch);
    if (!isAdmin && !isBranchMatch) {
      return res.status(403).json({ message: 'Access Denied: Appointment belongs to another branch.' });
    }

    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = req.user.role !== 'Client' && isBranchMatch;
    const isOwnerOnly = isOwner && !isBranchStaff && !isAdmin;

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied' });
    }

    if (!isAdmin && req.body.branch && !sameBranch(req.body.branch, appointment.branch)) {
      return res.status(403).json({ message: 'Access Denied: You cannot reassign appointment branch.' });
    }

    const incoming = req.body || {};
    const allowedForStaff = [
      'client',
      'clientPhone',
      'clientEmail',
      'referralCustomer',
      'referralCode',
      'service',
      'serviceId',
      'quantity',
      'employee',
      'employeeId',
      'date',
      'time',
      'room',
      'roomId',
      'membershipId',
      'bookingType',
      'status',
      'cancellationReason',
      'addOns',
      'totalQuantity',
      'totalDuration',
      'totalAmount'
    ];
    const allowedForOwnerOnly = [
      'clientPhone',
      'clientEmail',
      'referralCustomer',
      'referralCode',
      'service',
      'serviceId',
      'quantity',
      'employee',
      'employeeId',
      'date',
      'time',
      'room',
      'roomId',
      'membershipId',
      'cancellationReason'
    ];
    const allowedForAdmin = [...allowedForStaff, 'branch', 'clientId', 'user'];
    const allowedFields = isAdmin
      ? allowedForAdmin
      : isOwnerOnly
        ? allowedForOwnerOnly
        : allowedForStaff;

    const updatePayload = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(incoming, field)) {
        updatePayload[field] = incoming[field];
      }
    }

    // Sanitize optional ObjectIds to avoid Mongoose CastErrors
    if (updatePayload.membershipId === '' || updatePayload.membershipId === 'None') {
      updatePayload.membershipId = undefined;
    }
    if (updatePayload.serviceId === '' || updatePayload.serviceId === 'None') {
      updatePayload.serviceId = undefined;
    }
    if (updatePayload.employeeId === '' || updatePayload.employeeId === 'None') {
      updatePayload.employeeId = undefined;
    }
    if (updatePayload.roomId === '' || updatePayload.roomId === 'None') {
      updatePayload.roomId = undefined;
    }

    // Existing clients cannot be referred on an appointment, so clear referral fields
    const checkClientId = updatePayload.clientId || appointment.clientId;
    if (checkClientId) {
      delete updatePayload.referralCustomer;
      delete updatePayload.referralCode;
      appointment.referralCustomer = undefined;
      appointment.referralCode = undefined;
    }

    if (isOwnerOnly && Object.prototype.hasOwnProperty.call(updatePayload, 'status')) {
      return res.status(403).json({ message: 'Access Denied: You cannot directly change appointment status.' });
    }

    const nextClientName = Object.prototype.hasOwnProperty.call(updatePayload, 'client')
      ? updatePayload.client
      : appointment.client;
    const nextClientEmail = Object.prototype.hasOwnProperty.call(updatePayload, 'clientEmail')
      ? updatePayload.clientEmail
      : appointment.clientEmail;
    const nextClientPhone = Object.prototype.hasOwnProperty.call(updatePayload, 'clientPhone')
      ? updatePayload.clientPhone
      : appointment.clientPhone;
    const nextReferralCustomer = Object.prototype.hasOwnProperty.call(updatePayload, 'referralCustomer')
      ? updatePayload.referralCustomer
      : appointment.referralCustomer;
    const nextReferralCode = Object.prototype.hasOwnProperty.call(updatePayload, 'referralCode')
      ? updatePayload.referralCode
      : appointment.referralCode;
    const nextReferralClient = await findReferralClient({
      referralCustomer: nextReferralCustomer,
      referralCode: nextReferralCode
    });
    const referralConflict = getReferralSelfConflict({
      client: nextClientName,
      clientEmail: nextClientEmail,
      clientPhone: nextClientPhone,
      referralCustomer: nextReferralCustomer,
      referralCode: nextReferralCode
    }, nextReferralClient);
    if (referralConflict) {
      return res.status(400).json({ message: referralConflict });
    }

    const oldStatus = appointment.status;
    const statusIsChanging = Object.prototype.hasOwnProperty.call(updatePayload, 'status') && updatePayload.status !== oldStatus;
    if (statusIsChanging) {
      const allowedStatus = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
      if (!allowedStatus.includes(updatePayload.status)) {
        return res.status(400).json({ message: 'Invalid status value' });
      }

      const isManagerLike = isAdmin || (req.user.role === 'Manager' && isBranchMatch);
      const isAssignedEmployeeCompletion = (
        (req.user.role === 'Employee' || (req.authSource === 'Employee' && req.user.role !== 'Manager' && req.user.role !== 'Admin')) &&
        updatePayload.status === 'Completed' &&
        isAppointmentAssignedToUser(appointment, req.user)
      );

      if (!isManagerLike && !isAssignedEmployeeCompletion) {
        return res.status(403).json({ message: 'Access Denied: You cannot update this appointment status.' });
      }
    }

    const { date, time, employee, room } = updatePayload;

    // --- CONFLICT VALIDATION (Staff + Room) ---
    const checkDate = date || appointment.date;
    const checkTime = time || appointment.time;
    const checkEmployee = employee || appointment.employee;
    const checkRoom = room || appointment.room;
    const checkBranch = getBranchId(updatePayload.branch || appointment.branch);

    const Service = require('../../models/operations/Service');
    const Employee = require('../../models/human-resources/Employee');
    const Room = require('../../models/operations/Room');

    if (updatePayload.serviceId) {
      const targetService = await findServiceForBranch(Service, checkBranch, updatePayload.serviceId, null);
      if (!targetService) {
        return res.status(403).json({ message: 'Access Denied: Selected service belongs to another branch.' });
      }
      if (!updatePayload.service) updatePayload.service = targetService.name;
    }

    if (updatePayload.employeeId) {
      const targetEmployee = await Employee.findById(updatePayload.employeeId).select('branch name');
      if (!targetEmployee || !sameBranch(targetEmployee.branch, checkBranch)) {
        return res.status(403).json({ message: 'Access Denied: Selected employee belongs to another branch.' });
      }
      if (!updatePayload.employee) updatePayload.employee = targetEmployee.name;
    }

    if (updatePayload.roomId) {
      const targetRoom = await Room.findById(updatePayload.roomId).select('branch name');
      if (!targetRoom || !sameBranch(targetRoom.branch, checkBranch)) {
        return res.status(403).json({ message: 'Access Denied: Selected room belongs to another branch.' });
      }
      if (!updatePayload.room) updatePayload.room = targetRoom.name;
    }

    // Only validate employee if it's being changed AND employee is in updatePayload
    const isEmployeeBeingChanged = updatePayload.employee !== undefined || updatePayload.employeeId !== undefined;
    if (isEmployeeBeingChanged) {
      const employeeSelection = await resolveEmployeeForAppointment(
        Employee,
        checkBranch,
        updatePayload.employeeId ?? appointment.employeeId,
        updatePayload.employee ?? appointment.employee
      );
      if (employeeSelection.error) {
        return res.status(employeeSelection.status || 400).json({ message: employeeSelection.error });
      }
      if (employeeSelection.employee) {
        updatePayload.employeeId = employeeSelection.employee._id;
        updatePayload.employee = employeeSelection.employee.name;
      }
    }

    // Only validate room if it's being changed AND room is in updatePayload
    const isRoomBeingChanged = updatePayload.room !== undefined || updatePayload.roomId !== undefined;
    if (isRoomBeingChanged) {
      const roomSelection = await resolveRoomForAppointment(
        Room,
        checkBranch,
        updatePayload.roomId ?? appointment.roomId,
        updatePayload.room ?? appointment.room
      );
      if (roomSelection.error) {
        return res.status(roomSelection.status || 400).json({ message: roomSelection.error });
      }
      if (roomSelection.room) {
        updatePayload.roomId = roomSelection.room._id;
        updatePayload.room = roomSelection.room.name;
      }
    }

    const mergedServiceData = {
      branch: checkBranch,
      service: updatePayload.service ?? appointment.service,
      serviceId: updatePayload.serviceId ?? appointment.serviceId,
      quantity: updatePayload.quantity ?? appointment.quantity,
      addOns: updatePayload.addOns ?? appointment.addOns
    };
    const serviceSummary = await normalizeAppointmentServices(Service, mergedServiceData);
    if (serviceSummary.error) {
      return res.status(serviceSummary.status || 400).json({ message: serviceSummary.error });
    }
    Object.assign(updatePayload, {
      service: mergedServiceData.service,
      serviceId: mergedServiceData.serviceId,
      quantity: mergedServiceData.quantity,
      addOns: mergedServiceData.addOns,
      totalQuantity: mergedServiceData.totalQuantity,
      totalDuration: mergedServiceData.totalDuration,
      totalAmount: mergedServiceData.totalAmount
    });

    if (checkDate && checkTime && checkEmployee) {
      const updatedService = updatePayload.service || appointment.service;
      const selectedService = await findServiceForBranch(Service, checkBranch, updatePayload.serviceId, updatedService);
      const serviceDuration = updatePayload.totalDuration || selectedService?.duration || 60;

      const existingApts = await Appointment.find({
        branch: checkBranch,
        date: checkDate,
        status: { $in: ['Confirmed', 'Pending'] },
        _id: { $ne: appointment._id } // exclude self
      });

      const newStart = parseTime(checkDate, checkTime);
      const newEnd = newStart + serviceDuration;

      for (const apt of existingApts) {
        const existingDuration = await getAppointmentDuration(Service, apt, checkBranch);
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

    const shouldApplyCompletionMetadata = (
      Object.prototype.hasOwnProperty.call(updatePayload, 'status') &&
      (updatePayload.status !== oldStatus || (updatePayload.status === 'Completed' && !appointment.completedAt))
    );

    Object.assign(appointment, updatePayload);
    if (shouldApplyCompletionMetadata) {
      await applyCompletionMetadata(appointment, req, updatePayload.status);
    }
    const updatedAppointment = await appointment.save();

    if (statusIsChanging) {
      if (oldStatus === 'Completed' && updatePayload.status !== 'Completed') {
        await refundMembershipSessionIfNeeded(appointment._id);
      } else if (oldStatus !== 'Completed' && updatePayload.status === 'Completed') {
        await deductMembershipSessionIfNeeded(appointment);
      }
    }

    // Trigger notification if status changed during update
    if (updatePayload.status && updatePayload.status !== oldStatus) {
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
          const status = updatePayload.status;
          const reason = updatePayload.cancellationReason;

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
    const isAdmin = req.user.role === 'Admin';
    const isBranchMatch = sameBranch(appointment.branch, req.user.branch);
    if (!isAdmin && !isBranchMatch) {
      return res.status(403).json({ message: 'Access Denied: Appointment belongs to another branch.' });
    }

    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isBranchStaff = req.user.role !== 'Client' && isBranchMatch;

    if (!isAdmin && !isBranchStaff && !isOwner) {
      return res.status(403).json({ message: 'Access Denied: You do not have permission to delete this resource' });
    }

    if (appointment.status === 'Completed') {
      await refundMembershipSessionIfNeeded(appointment._id);
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

    const isAdmin = req.user.role === 'Admin';
    const isBranchMatch = sameBranch(appointment.branch, req.user.branch);
    if (!isAdmin && !isBranchMatch) {
      return res.status(403).json({ message: 'Access Denied: Appointment belongs to another branch.' });
    }

    const isOwner = appointment.clientId?.toString() === req.user._id.toString();
    const isManagerLike = isAdmin || (req.user.role === 'Manager' && isBranchMatch);

    const allowedStatus = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const isOwnerCancellation = isOwner && status === 'Cancelled' && ['Pending', 'Confirmed'].includes(appointment.status);
    const isAssignedEmployeeCompletion = (
      (req.user.role === 'Employee' || (req.authSource === 'Employee' && req.user.role !== 'Manager' && req.user.role !== 'Admin')) &&
      status === 'Completed' &&
      isAppointmentAssignedToUser(appointment, req.user)
    );

    if (!isManagerLike && !isAssignedEmployeeCompletion && !isOwnerCancellation) {
      return res.status(403).json({ message: 'Access Denied: You cannot update this appointment status.' });
    }

    const oldStatus = appointment.status;
    const statusIsChanging = status !== oldStatus;

    appointment.status = status;
    await applyCompletionMetadata(appointment, req, status);
    if (cancellationReason) {
      appointment.cancellationReason = cancellationReason;
    }

    await appointment.save();

    if (statusIsChanging) {
      if (oldStatus === 'Completed' && status !== 'Completed') {
        await refundMembershipSessionIfNeeded(appointment._id);
      } else if (oldStatus !== 'Completed' && status === 'Completed') {
        await deductMembershipSessionIfNeeded(appointment);
      }
    }

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
    if (!branch) {
      return res.status(400).json({ message: 'Branch is required' });
    }
    let query = {
      status: { $in: ['Confirmed', 'Pending'] }
    };
    query.branch = branch;
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
      .select('date time service employee room branch status quantity addOns totalDuration')
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

    const referralClient = await findReferralClient({
      ...rest,
      client: name,
      clientPhone: phone,
      clientEmail: email
    });
    const referralConflict = getReferralSelfConflict({
      ...rest,
      client: name,
      clientPhone: phone,
      clientEmail: email
    }, referralClient);
    if (referralConflict) {
      return res.status(400).json({ message: referralConflict });
    }

    // Server-side service validation and conflict validation to prevent double booking
    const Service = require('../../models/operations/Service');
    const serviceSummary = await normalizeAppointmentServices(Service, {
      ...rest,
      branch: appointmentBranch
    });

    if (serviceSummary.error) {
      return res.status(serviceSummary.status || 400).json({ message: serviceSummary.error });
    }

    Object.assign(rest, serviceSummary.appointmentData);

    const selectedService = await findServiceForBranch(Service, appointmentBranch, rest.serviceId, rest.service).catch(() => null);
    const serviceDuration = rest.totalDuration || selectedService?.duration || 60;

    // ============================================================
    // ATOMIC CONFLICT VALIDATION FOR GUEST BOOKING
    // ============================================================
    const conflictResult = await validateConflictAtomically({
      connection: Appointment.db,
      branchId: appointmentBranch,
      date: rest.date,
      time: rest.time,
      employee: rest.employee || 'Any available specialist',
      room: rest.room,
      serviceDuration,
      cleaningDuration: 0
    });

    if (conflictResult.conflict) {
      return res.status(409).json({ message: conflictResult.message });
    }
    // ============================================================

    // 1. Create or find a client profile for the guest
    // This allows them to show up in the Billing dropdown and maintain history
    let client = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone: phone }
      ]
    });

    const isExistingClient = !!client;

    if (!client) {
      client = await createClientProfileFromAppointment({
        name,
        phone,
        email,
        branch: appointmentBranch,
        referralClient,
        notes: 'Created via Guest Booking'
      });
    }

    const appointmentData = {
      ...rest,
      client: client.name || name, // Synchronize to existing name if profile exists
      clientId: client._id, // Link to the created/found client
      clientPhone: client.phone || phone,
      clientEmail: client.email || email,
      branch: appointmentBranch,
      bookingType: 'Guest',
      status: 'Pending'
    };

    if (isExistingClient) {
      delete appointmentData.referralCustomer;
      delete appointmentData.referralCode;
    }

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
