import { createContext, useContext, useState, ReactNode } from 'react';

export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Client';

interface User {
  _id?: string;
  email: string;
  role: UserRole;
  name: string;
  token?: string;
  permissions?: string[];
  branch?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Guardian: Default Permission Sets for Roles
const DEFAULT_PERMISSIONS: Record<UserRole, string[]> = {
  'Admin': ['*'],
  'Manager': ['dashboard', 'appointments', 'billing', 'clients', 'services', 'rooms', 'employees', 'attendance', 'finance', 'inventory', 'whatsapp', 'reports', 'settings', 'leave'],
  'Employee': ['dashboard', 'appointments', 'clients', 'services', 'attendance', 'leave'],
  'Client': ['dashboard', 'book', 'profile', 'history']
};

// Safely access Vite environment variables
const getApiUrl = () => {
  try {
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5005/api';
  } catch (e) {
    return 'http://localhost:5005/api';
  }
};

const API_URL = getApiUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('zen_spa_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          return parsed;
        }
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('zen_spa_user');
      }
    }
    return null;
  });
  const [loading] = useState(false);

  const hasPermission = (permId: string): boolean => {
    if (!user) return false;
    // Admin always has full access
    if (user.role.toLowerCase() === 'admin') return true;
    
    // Check custom permissions first
    if (user.permissions && user.permissions.length > 0) {
      if (user.permissions.includes(permId)) return true;
    }

    // Fallback to role-based defaults (Guardian)
    const defaults = DEFAULT_PERMISSIONS[user.role] || [];
    return defaults.includes(permId) || defaults.includes('*');
  };

  const login = async (email: string, password?: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        const userData: User = {
          _id: data._id,
          email: data.email,
          role: data.role as UserRole,
          name: data.name,
          permissions: data.permissions,
          branch: data.branch,
          token: data.token
        };
        setUser(userData);
        localStorage.setItem('zen_spa_user', JSON.stringify(userData));
        return true;
      } else {
        console.error('Login failed:', data.message || 'Unknown error');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('zen_')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
