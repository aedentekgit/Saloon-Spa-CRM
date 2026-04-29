export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Client';

export type PermissionId =
  | '*'
  | 'dashboard'
  | 'book'
  | 'profile'
  | 'history'
  | 'memberships'
  | 'services'
  | 'rooms'
  | 'clients'
  | 'appointments'
  | 'employees'
  | 'attendance'
  | 'shifts'
  | 'payroll'
  | 'leave'
  | 'finance'
  | 'transactions'
  | 'inventory'
  | 'billing'
  | 'whatsapp'
  | 'reports'
  | 'branches'
  | 'room-categories'
  | 'service-categories'
  | 'expense-categories'
  | 'admins'
  | 'roles'
  | 'settings';

export const PERMISSION_DEFINITIONS = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'book', name: 'Booking' },
  { id: 'profile', name: 'Profile' },
  { id: 'history', name: 'History' },
  { id: 'memberships', name: 'Memberships' },
  { id: 'services', name: 'Services' },
  { id: 'rooms', name: 'Rooms' },
  { id: 'clients', name: 'Clients' },
  { id: 'appointments', name: 'Appointments' },
  { id: 'employees', name: 'Employees' },
  { id: 'attendance', name: 'Attendance' },
  { id: 'shifts', name: 'Shifts' },
  { id: 'payroll', name: 'Payroll' },
  { id: 'leave', name: 'Leave' },
  { id: 'finance', name: 'Finance' },
  { id: 'transactions', name: 'Transactions' },
  { id: 'inventory', name: 'Inventory' },
  { id: 'billing', name: 'Billing' },
  { id: 'whatsapp', name: 'WhatsApp' },
  { id: 'reports', name: 'Reports' },
  { id: 'branches', name: 'Branches' },
  { id: 'room-categories', name: 'Room Category' },
  { id: 'service-categories', name: 'Service Category' },
  { id: 'expense-categories', name: 'Expense Category' },
  { id: 'admins', name: 'Admins' },
  { id: 'roles', name: 'Roles' },
  { id: 'settings', name: 'Settings' }
] as const;

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionId[]> = {
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

export const AUTHENTICATED_ONLY_ROUTES = ['/profile'];

export const ROUTE_PERMISSION_MAP: Record<string, PermissionId[]> = {
  '/dashboard': ['dashboard'],
  '/book': ['book'],
  '/clients': ['clients'],
  '/appointments': ['appointments'],
  '/rooms': ['rooms'],
  '/employees': ['employees'],
  '/attendance': ['attendance'],
  '/staff-attendance': ['attendance'],
  '/leave': ['leave'],
  '/leave/apply': ['leave'],
  '/services': ['services'],
  '/memberships': ['memberships', 'billing'],
  '/billing': ['billing'],
  '/finance': ['finance'],
  '/inventory': ['inventory'],
  '/whatsapp': ['whatsapp'],
  '/reports': ['reports'],
  '/settings': ['settings'],
  '/roles': ['roles'],
  '/branches': ['branches', 'settings'],
  '/room-categories': ['room-categories', 'settings'],
  '/service-categories': ['service-categories', 'settings'],
  '/expense-categories': ['expense-categories', 'settings'],
  '/admins': ['admins', 'roles'],
  '/payroll': ['payroll', 'finance'],
  '/shifts': ['shifts', 'settings'],
  '/transactions': ['transactions', 'finance', 'history'],
  '/expenses': ['finance']
};

const STAFF_ROUTE_ORDER = [
  '/dashboard',
  '/appointments',
  '/billing',
  '/clients',
  '/memberships',
  '/services',
  '/rooms',
  '/inventory',
  '/employees',
  '/attendance',
  '/shifts',
  '/payroll',
  '/leave',
  '/leave/apply',
  '/finance',
  '/expenses',
  '/transactions',
  '/reports',
  '/whatsapp',
  '/branches',
  '/room-categories',
  '/service-categories',
  '/expense-categories',
  '/admins',
  '/roles',
  '/settings',
  '/profile'
];

const EMPLOYEE_ROUTE_ORDER = STAFF_ROUTE_ORDER.map((route) => (
  route === '/attendance' ? '/staff-attendance' : route
));

const CLIENT_ROUTE_ORDER = [
  '/dashboard',
  '/book',
  '/profile',
  '/transactions'
];

const normalizePath = (pathname: string) => {
  const path = pathname.split('?')[0].split('#')[0] || '/';
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
};

export const isAuthenticatedOnlyRoute = (pathname: string) => {
  const path = normalizePath(pathname);
  return AUTHENTICATED_ONLY_ROUTES.includes(path);
};

export const getRoutePermissions = (pathname: string): PermissionId[] | null => {
  const path = normalizePath(pathname);
  if (ROUTE_PERMISSION_MAP[path]) return ROUTE_PERMISSION_MAP[path];

  const matched = Object.keys(ROUTE_PERMISSION_MAP)
    .sort((a, b) => b.length - a.length)
    .find((route) => path.startsWith(`${route}/`));

  return matched ? ROUTE_PERMISSION_MAP[matched] : null;
};

export const getEffectivePermissions = (
  role?: string,
  permissions?: string[]
): PermissionId[] => {
  if (role === 'Admin') return ['*'];

  const normalized = (permissions || []).filter(Boolean) as PermissionId[];
  if (normalized.length > 0) return normalized;

  return DEFAULT_ROLE_PERMISSIONS[role as UserRole] || [];
};

export const hasPermissionForRole = (
  role: string | undefined,
  permissions: string[] | undefined,
  required: string | string[]
) => {
  const requiredList = Array.isArray(required) ? required : [required];
  if (requiredList.length === 0) return true;

  const effective = getEffectivePermissions(role, permissions);
  if (effective.includes('*')) return true;

  return requiredList.some((permission) => effective.includes(permission as PermissionId));
};

export const getInitialRouteForUser = (
  role: string | undefined,
  permissions: string[] | undefined
) => {
  const routeOrder = role === 'Client'
    ? CLIENT_ROUTE_ORDER
    : role === 'Employee'
      ? EMPLOYEE_ROUTE_ORDER
      : STAFF_ROUTE_ORDER;

  return routeOrder.find((route) => {
    if (isAuthenticatedOnlyRoute(route)) return true;
    const required = getRoutePermissions(route);
    return Boolean(required && hasPermissionForRole(role, permissions, required));
  }) || '/profile';
};
