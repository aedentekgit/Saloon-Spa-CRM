import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

export interface PublicSettings {
  general: {
    siteName: string;
    logo: string;
    email: string;
    address: string;
    contactNumber: string;
    country: string;
    dialingCode: string;
    currencySymbol: string;
  };
  theme: {
    primaryColor: string;
    headingFont: string;
    bodyFont: string;
  };
}

const defaultSettings: PublicSettings = {
  general: {
    siteName: 'Zen Spa & Saloon',
    logo: '',
    email: 'contact@zenspa.com',
    address: '123 Wellness St, City',
    contactNumber: '+1234567890',
    country: 'Qatar',
    dialingCode: '+974',
    currencySymbol: 'QR'
  },
  theme: {
    primaryColor: '#2D1622',
    headingFont: 'Italiana',
    bodyFont: 'Plus Jakarta Sans'
  }
};

interface PublicSettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  error: string;
}

const PublicSettingsContext = createContext<PublicSettingsContextValue | undefined>(undefined);

export const PublicSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/settings/public`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to load public settings');
        }

        const data = await response.json();
        setSettings({
          general: { ...defaultSettings.general, ...(data?.general || {}) },
          theme: { ...defaultSettings.theme, ...(data?.theme || {}) }
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError('Failed to load site settings');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => controller.abort();
  }, []);

  const value = useMemo(() => ({ settings, loading, error }), [settings, loading, error]);

  return <PublicSettingsContext.Provider value={value}>{children}</PublicSettingsContext.Provider>;
};

export const usePublicSettings = () => {
  const context = useContext(PublicSettingsContext);
  return context || { settings: defaultSettings, loading: false, error: '' };
};

export { defaultSettings };

