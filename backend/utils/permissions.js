const DEFAULT_ROLE_PERMISSIONS = {
  Admin: ['*'],
  Manager: [
    'dashboard',
    'clients',
    'appointments',
    'memberships',
    'rooms',
    'employees',
    'attendance',
    'shifts',
    'payroll',
    'leave',
    'services',
    'billing',
    'finance',
    'transactions',
    'inventory',
    'whatsapp',
    'reports',
    'branches',
    'room-categories',
    'service-categories',
    'expense-categories',
    'settings'
  ],
  Employee: ['dashboard', 'appointments', 'clients', 'services', 'attendance', 'leave'],
  Client: ['dashboard', 'book', 'profile', 'history']
};

module.exports = {
  DEFAULT_ROLE_PERMISSIONS
};
