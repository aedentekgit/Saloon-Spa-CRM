require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/core/User');
const Role = require('./models/human-resources/Role');

const requiredSeedPassword = (envName) => {
  const value = process.env[envName];
  if (!value || value.length < 8) {
    throw new Error(`${envName} is required and must be at least 8 characters.`);
  }
  return value;
};

const roles = [
  {
    name: 'Admin',
    description: 'System Administrator with full access',
    permissions: ['dashboard', 'book', 'profile', 'history', 'memberships', 'services', 'rooms', 'clients', 'appointments', 'employees', 'attendance', 'shifts', 'payroll', 'leave', 'finance', 'transactions', 'inventory', 'billing', 'whatsapp', 'reports', 'branches', 'room-categories', 'service-categories', 'admins', 'roles', 'settings']
  },
  {
    name: 'Manager',
    description: 'Spa Manager with most access',
    permissions: ['dashboard', 'clients', 'appointments', 'memberships', 'rooms', 'employees', 'attendance', 'shifts', 'payroll', 'leave', 'services', 'billing', 'finance', 'transactions', 'inventory', 'whatsapp', 'reports', 'branches', 'room-categories', 'service-categories', 'settings']
  },
  {
    name: 'Employee',
    description: 'Staff member with limited access',
    permissions: ['dashboard', 'appointments', 'clients', 'services', 'attendance', 'leave']
  },
  {
    name: 'Client',
    description: 'End customer with booking access only',
    permissions: ['dashboard', 'book', 'profile', 'history']
  }
];

const users = [
  {
    name: 'Spa Admin',
    email: 'admin@gmail.com',
    password: requiredSeedPassword('SEED_ADMIN_PASSWORD'),
    role: 'Admin',
  },
  {
    name: 'Spa Manager',
    email: 'manager@gmail.com',
    password: requiredSeedPassword('SEED_MANAGER_PASSWORD'),
    role: 'Manager',
  },
  {
    name: 'Spa Employee',
    email: 'employee@gmail.com',
    password: requiredSeedPassword('SEED_EMPLOYEE_PASSWORD'),
    role: 'Employee',
  },
  {
    name: 'Spa Client',
    email: 'client@gmail.com',
    password: requiredSeedPassword('SEED_CLIENT_PASSWORD'),
    role: 'Client',
  },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected for seeding...');

    await User.deleteMany();
    await Role.deleteMany();
    console.log('Collections cleared.');

    await Role.create(roles);
    console.log('Roles created.');

    await User.create(users);
    console.log('Demo users created successfully!');

    process.exit();
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
