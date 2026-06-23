#!/usr/bin/env node
require('dotenv').config();

const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Branch = require('../models/operations/Branch');
const User = require('../models/core/User');
const Employee = require('../models/human-resources/Employee');
const Role = require('../models/human-resources/Role');

const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || '5005'}/api`;
const FIXTURE_TAG = `authsec_${Date.now()}`;
const KEEP_FIXTURES = process.env.KEEP_AUTHSEC_FIXTURES === 'true';

const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

const cleanupOldFixtures = async () => {
  const fixtureNameRx = /^authsec_\d+_/;
  const fixtureEmailRx = /^authsec_\d+\.(manager|client|staffmanager)\.[ab]@test\.local$/;

  await User.deleteMany({ email: { $regex: fixtureEmailRx } });
  await Employee.deleteMany({ email: { $regex: fixtureEmailRx } });
  await Branch.deleteMany({ name: { $regex: fixtureNameRx } });
};

const ensureRole = async (name, permissions) => {
  const existing = await Role.findOne({ name });
  if (existing) {
    const currentPermissions = Array.isArray(existing.permissions) ? existing.permissions : [];
    const mergedPermissions = Array.from(new Set([...currentPermissions, ...permissions]));
    const shouldUpdatePermissions = mergedPermissions.length !== currentPermissions.length;
    const shouldReactivate = existing.status === 'Inactive' || existing.isActive === false;

    if (shouldUpdatePermissions || shouldReactivate) {
      existing.permissions = mergedPermissions;
      existing.status = 'Active';
      existing.isActive = true;
      await existing.save();
    }

    return existing;
  }
  return Role.create({
    name,
    description: `${name} role for auth security fixtures`,
    permissions
  });
};

const createFixtures = async () => {
  if (!process.env.MONGODB_URI) fail('MONGODB_URI is required');
  if (!process.env.JWT_SECRET) fail('JWT_SECRET is required');

  console.log('[auth-security] connecting to mongo');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    family: 4
  });
  console.log('[auth-security] connected');
  console.log('[auth-security] cleaning old fixture records');
  await cleanupOldFixtures();

  console.log('[auth-security] ensuring roles');
  await ensureRole('Admin', ['*']);
  await ensureRole('Manager', ['dashboard', 'appointments', 'clients', 'services', 'rooms', 'employees', 'billing', 'finance', 'inventory', 'settings']);
  await ensureRole('Client', ['dashboard', 'appointments']);

  console.log('[auth-security] creating branches');
  const branchA = await Branch.create({
    name: `${FIXTURE_TAG}_A`,
    contactNumber: '9998887001',
    email: `${FIXTURE_TAG}_a@branch.test`,
    address: 'Auth Fixture Branch A'
  });

  const branchB = await Branch.create({
    name: `${FIXTURE_TAG}_B`,
    contactNumber: '9998887002',
    email: `${FIXTURE_TAG}_b@branch.test`,
    address: 'Auth Fixture Branch B'
  });

  console.log('[auth-security] creating users');
  const managerAId = new mongoose.Types.ObjectId();
  const clientAId = new mongoose.Types.ObjectId();
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
      _id: clientAId,
      name: `${FIXTURE_TAG}_ClientA`,
      email: `${FIXTURE_TAG}.client.a@test.local`,
      password: 'fixture_password_unused',
      role: 'Client',
      branch: branchA._id,
      isEmailVerified: true,
      status: 'Active',
      loginAttempts: 0,
      createdAt: now
    }
  ]);

  const staffManagerPassword = 'AuthSecStaffManager#123';
  await Employee.create({
    name: `${FIXTURE_TAG}_StaffManagerA`,
    email: `${FIXTURE_TAG}.staffmanager.a@test.local`,
    password: staffManagerPassword,
    role: 'Manager',
    branch: branchA._id,
    isEmailVerified: true,
    status: 'Active',
    loginAttempts: 0
  });

  console.log('[auth-security] creating signed tokens');
  const managerToken = jwt.sign({ id: managerAId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const clientToken = jwt.sign({ id: clientAId }, process.env.JWT_SECRET, { expiresIn: '1h' });
  const expiredManagerToken = jwt.sign({ id: managerAId }, process.env.JWT_SECRET, { expiresIn: -10 });
  const tamperedManagerToken = jwt.sign({ id: managerAId }, `${process.env.JWT_SECRET}_tampered`, { expiresIn: '1h' });

  return {
    API_BASE_URL,
    MANAGER_TOKEN: managerToken,
    CLIENT_TOKEN: clientToken,
    FOREIGN_BRANCH_ID: branchB._id.toString(),
    EXPIRED_MANAGER_TOKEN: expiredManagerToken,
    TAMPERED_MANAGER_TOKEN: tamperedManagerToken,
    STAFF_MANAGER_EMAIL: `${FIXTURE_TAG}.staffmanager.a@test.local`,
    STAFF_MANAGER_PASSWORD: staffManagerPassword,
    STAFF_MANAGER_BRANCH_ID: branchA._id.toString()
  };
};

const main = async () => {
  try {
    const envValues = await createFixtures();
    console.log('[auth-security] running tests');
    await mongoose.disconnect();

    const run = spawnSync('node', ['--test', 'tests/auth-security.test.js'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      env: { ...process.env, ...envValues }
    });

    if (run.status !== 0) {
      process.exit(run.status || 1);
    }

    if (!KEEP_FIXTURES) {
      console.log('[auth-security] cleaning current fixture records');
      await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        family: 4
      });
      await cleanupOldFixtures();
      await mongoose.disconnect();
    }
  } catch (error) {
    console.error('Auth security full run failed:', error);
    try {
      await mongoose.disconnect();
    } catch (_err) {}
    process.exit(1);
  }
};

main();
