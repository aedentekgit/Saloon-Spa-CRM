#!/usr/bin/env node
require('dotenv').config();

const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Branch = require('../models/operations/Branch');
const User = require('../models/core/User');
const Appointment = require('../models/operations/Appointment');
const Invoice = require('../models/finance/Invoice');
const Expense = require('../models/finance/Expense');
const Service = require('../models/operations/Service');
const MembershipPlan = require('../models/operations/MembershipPlan');
const Membership = require('../models/operations/Membership');
const Role = require('../models/human-resources/Role');

const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || '5005'}/api`;
const FIXTURE_TAG = `branchsec_${Date.now()}`;
const KEEP_FIXTURES = process.env.KEEP_BRANCHSEC_FIXTURES === 'true';

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const cleanupOldFixtures = async () => {
  const fixtureNameRx = /^branchsec_\d+_/;
  const fixtureEmailRx = /^branchsec_\d+\.(manager|client)\.[ab]@test\.local$/;
  const fixtureInvoiceRx = /^branchsec_\d+-INV-/;
  const fixtureUsers = await User.find({ email: { $regex: fixtureEmailRx } }).select('_id');
  const fixtureUserIds = fixtureUsers.map((u) => u._id);
  const fixtureBranches = await Branch.find({ name: { $regex: fixtureNameRx } }).select('_id');
  const fixtureBranchIds = fixtureBranches.map((b) => b._id);

  await Membership.deleteMany({
    $or: [
      { client: { $in: fixtureUserIds } },
      { branch: { $in: fixtureBranchIds } }
    ]
  });
  await Appointment.deleteMany({ client: { $regex: fixtureNameRx } });
  await Invoice.deleteMany({ invoiceNumber: { $regex: fixtureInvoiceRx } });
  await Expense.deleteMany({ title: { $regex: fixtureNameRx } });
  await MembershipPlan.deleteMany({ name: { $regex: fixtureNameRx } });
  await Service.deleteMany({ name: { $regex: fixtureNameRx } });
  await User.deleteMany({ email: { $regex: fixtureEmailRx } });
  await Branch.deleteMany({ name: { $regex: fixtureNameRx } });
};

const ensureRole = async (name, permissions) => {
  const existing = await Role.findOne({ name });
  if (existing) return existing;
  return Role.create({
    name,
    description: `${name} role for branch security fixtures`,
    permissions
  });
};

const createFixtures = async () => {
  if (!process.env.MONGODB_URI) {
    fail('MONGODB_URI is required');
  }
  if (!process.env.JWT_SECRET) {
    fail('JWT_SECRET is required');
  }

  console.log('[branch-security] connecting to mongo');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  });
  console.log('[branch-security] connected');
  console.log('[branch-security] cleaning old fixture records');
  await cleanupOldFixtures();

  console.log('[branch-security] ensuring roles');
  await ensureRole('Admin', ['*']);
  await ensureRole('Manager', ['dashboard', 'appointments', 'clients', 'services', 'rooms', 'employees', 'billing', 'finance', 'inventory', 'settings']);
  await ensureRole('Client', ['dashboard', 'appointments']);

  console.log('[branch-security] creating branches');
  const branchA = await Branch.create({
    name: `${FIXTURE_TAG}_A`,
    contactNumber: '9999991001',
    email: `${FIXTURE_TAG}_a@branch.test`,
    address: 'Fixture Branch A'
  });

  const branchB = await Branch.create({
    name: `${FIXTURE_TAG}_B`,
    contactNumber: '9999991002',
    email: `${FIXTURE_TAG}_b@branch.test`,
    address: 'Fixture Branch B'
  });

  console.log('[branch-security] creating users');
  const managerAId = new mongoose.Types.ObjectId();
  const managerBId = new mongoose.Types.ObjectId();
  const clientBId = new mongoose.Types.ObjectId();
  const now = new Date();

  await User.collection.insertMany([
    {
      _id: managerAId,
      name: `${FIXTURE_TAG}_ManagerA`,
      email: `${FIXTURE_TAG}.manager.a@test.local`,
      password: 'fixture_password_unused',
      role: 'Manager',
      branch: branchA._id,
      isEmailVerified: true,
      status: 'Active',
      loginAttempts: 0,
      createdAt: now
    },
    {
      _id: managerBId,
      name: `${FIXTURE_TAG}_ManagerB`,
      email: `${FIXTURE_TAG}.manager.b@test.local`,
      password: 'fixture_password_unused',
      role: 'Manager',
      branch: branchB._id,
      isEmailVerified: true,
      status: 'Active',
      loginAttempts: 0,
      createdAt: now
    },
    {
      _id: clientBId,
      name: `${FIXTURE_TAG}_ClientB`,
      email: `${FIXTURE_TAG}.client.b@test.local`,
      password: 'fixture_password_unused',
      role: 'Client',
      branch: branchB._id,
      isEmailVerified: true,
      status: 'Active',
      loginAttempts: 0,
      createdAt: now
    }
  ]);

  const managerA = await User.findById(managerAId).select('_id');
  const managerB = await User.findById(managerBId).select('_id');
  const clientB = await User.findById(clientBId).select('_id name email');

  console.log('[branch-security] creating service/records');
  const serviceB = await Service.create({
    name: `${FIXTURE_TAG}_Service_B`,
    duration: 60,
    price: 1200,
    category: 'Wellness',
    branch: branchB._id,
    status: 'Active'
  });

  const today = new Date().toISOString().slice(0, 10);

  const appointmentB = await Appointment.create({
    client: clientB.name,
    clientId: clientB._id,
    service: serviceB.name,
    serviceId: serviceB._id,
    employee: `${FIXTURE_TAG}_Specialist_B`,
    date: today,
    time: '11:00',
    room: `${FIXTURE_TAG}_Room_B`,
    branch: branchB._id,
    clientPhone: '9999992001',
    clientEmail: clientB.email,
    status: 'Confirmed',
    user: managerB._id
  });

  const expenseB = await Expense.create({
    user: managerB._id,
    title: `${FIXTURE_TAG}_Expense_B`,
    category: 'Marketing',
    amount: 777,
    date: today,
    branch: branchB._id
  });

  const invoiceB = await Invoice.create({
    user: managerB._id,
    clientId: clientB._id,
    invoiceNumber: `${FIXTURE_TAG}-INV-001`,
    clientName: clientB.name,
    items: [{ name: serviceB.name, price: 1200, duration: 60 }],
    subtotal: 1200,
    gst: 0,
    discount: 0,
    total: 1200,
    paymentMode: 'Cash',
    date: today,
    branch: branchB._id
  });

  console.log('[branch-security] creating membership');
  const plan = await MembershipPlan.create({
    name: `${FIXTURE_TAG}_Plan`,
    price: 5000,
    durationDays: 30,
    maxSessions: 5,
    applicableServices: [serviceB._id],
    branches: [branchB._id],
    isActive: true
  });

  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  const membershipB = await Membership.create({
    client: clientB._id,
    plan: plan._id,
    branch: branchB._id,
    startDate: new Date(),
    endDate,
    totalSessions: 5,
    remainingSessions: 5,
    status: 'Active'
  });

  console.log('[branch-security] creating signed tokens');
  const branchAToken = jwt.sign({ id: managerA._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const branchBToken = jwt.sign({ id: managerB._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

  const tamperedBranchToken = jwt.sign(
    { id: managerA._id, branch: branchB._id },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    API_BASE_URL,
    BRANCH_A_TOKEN: branchAToken,
    BRANCH_B_TOKEN: branchBToken,
    FOREIGN_BRANCH_ID: branchB._id.toString(),
    FOREIGN_CLIENT_ID: clientB._id.toString(),
    FOREIGN_APPOINTMENT_ID: appointmentB._id.toString(),
    FOREIGN_INVOICE_ID: invoiceB._id.toString(),
    FOREIGN_EXPENSE_ID: expenseB._id.toString(),
    FOREIGN_MEMBERSHIP_ID: membershipB._id.toString(),
    FOREIGN_SERVICE_ID: serviceB._id.toString(),
    FOREIGN_PLAN_ID: plan._id.toString(),
    TAMPERED_BRANCH_TOKEN: tamperedBranchToken
  };
};

const main = async () => {
  try {
    const envValues = await createFixtures();

    console.log('[branch-security] running tests');
    await mongoose.disconnect();

    const run = spawnSync('node', ['--test', 'tests/branch-security.test.js'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, ...envValues }
    });

    if (run.status !== 0) {
      process.exit(run.status || 1);
    }

    if (!KEEP_FIXTURES) {
      console.log('[branch-security] cleaning current fixture records');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });
      await cleanupOldFixtures();
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Branch security full run failed:', error);
    try {
      await mongoose.disconnect();
    } catch (_err) {}
    process.exit(1);
  }
};

main();
