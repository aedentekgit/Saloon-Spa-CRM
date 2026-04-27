import { createContext, useContext, useState, ReactNode } from 'react';
import { type UserRole, hasPermissionForRole } from '../config/accessControl';

export type { UserRole };

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
  login: (email: string, password?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  hasPermission: (permId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safely access Vite environment variables
const getApiUrl = () => {
  try {
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5005/api';
  } catch (e) {
    return 'http://localhost:5005/api';
  }
};

const API_URL = getApiUrl();

const parseResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (_error) {
    return { message: text };
  }
};

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
    return hasPermissionForRole(user.role, user.permissions, permId);
  };

  const login = async (email: string, password?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const response = await fetch(`${API_URL}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await parseResponseBody(response);

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
        return { success: true };
      } else {
        const message = data.message || data.error || `Login failed (${response.status})`;
        console.error('Login failed:', message);
        return { success: false, message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Unable to connect to the login service' };
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
