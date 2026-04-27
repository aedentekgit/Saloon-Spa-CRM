require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/core/User');
const Role = require('./models/human-resources/Role');

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
    password: 'admin123',
    role: 'Admin',
  },
  {
    name: 'Spa Manager',
    email: 'manager@gmail.com',
    password: 'manager123',
    role: 'Manager',
  },
  {
    name: 'Spa Employee',
    email: 'employee@gmail.com',
    password: 'employee123',
    role: 'Employee',
  },
  {
    name: 'Spa Client',
    email: 'client@gmail.com',
    password: 'client123',
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
