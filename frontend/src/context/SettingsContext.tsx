import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface SettingsData {
  general: {
    siteName: string;
    logo: string;
    email: string;
    address: string;
    contactNumber: string;
    country: string;
    countryIso: string;
    dialingCode: string;
    currency: string;
    currencySymbol: string;
    dateTimeFormat: string;
  };
  theme: {
    primaryColor: string;
    darkMode: boolean;
  };
  upload: {
    provider: 'cloudinary' | 'local';
  };
  billing?: {
    gstEnabled: boolean;
  };
  smtp?: {
    host: string;
    port: number;
    user: string;
    password: string;
    fromName: string;
    fromEmail: string;
  };
}

interface SettingsContextType {
  settings: SettingsData | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newData: Partial<SettingsData>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100/api';

  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newData: Partial<SettingsData>) => {
    try {
      const response = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(newData)
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (error) {
      console.error('Update settings failed:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [user]);

  // Update Favicon and Title
  useEffect(() => {
    if (settings && settings.general) {
      // Update Title
      document.title = settings.general.siteName || 'Spa & Saloon CRM';

      // Update Favicon
      if (settings.general.logo) {
        const logoUrl = settings.general.logo.startsWith('http') 
          ? settings.general.logo 
          : `${API_URL.split('/api')[0]}/${settings.general.logo.replace(/^\.?\//, '')}`;
        
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = logoUrl;
      }
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings: fetchSettings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
