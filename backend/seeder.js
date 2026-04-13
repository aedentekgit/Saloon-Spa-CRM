require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Role = require('./models/Role');

const roles = [
  {
    name: 'Admin',
    description: 'System Administrator with full access',
    permissions: ['dashboard', 'clients', 'appointments', 'rooms', 'employees', 'attendance', 'leave', 'services', 'billing', 'finance', 'inventory', 'whatsapp', 'reports', 'settings', 'roles']
  },
  {
    name: 'Manager',
    description: 'Spa Manager with most access',
    permissions: ['dashboard', 'clients', 'appointments', 'rooms', 'employees', 'attendance', 'leave', 'services', 'billing', 'inventory', 'whatsapp', 'reports', 'settings']
  },
  {
    name: 'Employee',
    description: 'Staff member with limited access',
    permissions: ['dashboard', 'appointments', 'attendance', 'leave']
  },
  {
    name: 'Client',
    description: 'End customer with booking access only',
    permissions: ['dashboard', 'appointments']
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
