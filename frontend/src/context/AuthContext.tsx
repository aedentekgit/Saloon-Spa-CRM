import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserRole = 'Admin' | 'Manager' | 'Employee' | 'Client';

interface User {
  _id?: string;
  email: string;
  role: UserRole;
  name: string;
  token?: string;
  permissions?: string[];
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (permId: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Safely access Vite environment variables
const getApiUrl = () => {
  try {
    return (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
  } catch (e) {
    return 'http://localhost:5000/api';
  }
};

const API_URL = getApiUrl();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('zen_spa_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        if (parsed && parsed.email) {
          setUser(parsed);
        }
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('zen_spa_user');
      }
    }
    setLoading(false);
  }, []);

  const hasPermission = (permId: string): boolean => {
    if (!user) return false;
    // Admin always has full access
    if (user.role === 'Admin') return true;
    return user.permissions?.includes(permId) || false;
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
    localStorage.removeItem('zen_spa_user');
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

