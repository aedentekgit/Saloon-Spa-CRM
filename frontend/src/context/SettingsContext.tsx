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
    headingFont?: string;
    bodyFont?: string;
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

const DEFAULT_SIDEBAR_START = '#332766';
const DEFAULT_SIDEBAR_END = '#3D2632';

const normalizeHexColor = (color: string) => {
  const value = color.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(value)) {
    return value.split('').map(ch => ch + ch).join('').toUpperCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(value)) {
    return value.toUpperCase();
  }
  return null;
};

const hexToRgb = (hex: string) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const parsed = parseInt(normalized, 16);
  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const clamp = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  return `#${[clamp(r), clamp(g), clamp(b)].map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
};

const mixHexColors = (baseColor: string, targetColor: string, ratio: number) => {
  const base = hexToRgb(baseColor);
  const target = hexToRgb(targetColor);
  if (!base || !target) return baseColor;

  return rgbToHex(
    base.r + (target.r - base.r) * ratio,
    base.g + (target.g - base.g) * ratio,
    base.b + (target.b - base.b) * ratio
  );
};

const getContrastColor = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#FFFFFF';
  // Use YIQ formula for better human perceived contrast
  const yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
};

const deriveSidebarGradient = (primaryColor?: string) => {
  if (!primaryColor) {
    return {
      start: DEFAULT_SIDEBAR_START,
      end: DEFAULT_SIDEBAR_END
    };
  }

  const base = normalizeHexColor(primaryColor);
  if (!base) {
    return {
      start: DEFAULT_SIDEBAR_START,
      end: DEFAULT_SIDEBAR_END
    };
  }

  return {
    start: mixHexColors(base, '#000000', 0.2),
    end: mixHexColors(base, '#FFFFFF', 0.18)
  };
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

  const fetchSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const response = await fetch(`${API_URL}/settings`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });

      if (response.status === 401) {
        logout();
        return;
      }

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

  // Update Favicon, Title and Dynamic Theme
  useEffect(() => {
    if (settings) {
      // Update Title
      if (settings.general) {
        document.title = settings.general.siteName || 'Spa & Saloon CRM';
      }

    // Update Theme Colors & Fonts (Dynamic CSS Variables)
    if (settings.theme) {
      const root = document.documentElement;
      const sidebarGradient = deriveSidebarGradient(settings.theme.primaryColor);
      
      if (settings.theme.primaryColor) {
        root.style.setProperty('--zen-sand', settings.theme.primaryColor);
        root.style.setProperty('--zen-primary', settings.theme.primaryColor);
        root.style.setProperty('--zen-contrast-text', getContrastColor(settings.theme.primaryColor));
      }

      root.style.setProperty('--sidebar-gradient-start', sidebarGradient.start);
      root.style.setProperty('--sidebar-gradient-end', sidebarGradient.end);

      if (settings.theme.headingFont || settings.theme.bodyFont) {
        const hFont = settings.theme.headingFont || 'Plus Jakarta Sans';
        const bFont = settings.theme.bodyFont || 'Plus Jakarta Sans';
        
        let dynamicStyle = document.getElementById('dynamic-custom-fonts') as HTMLStyleElement;
        if (!dynamicStyle) {
          dynamicStyle = document.createElement('style');
          dynamicStyle.id = 'dynamic-custom-fonts';
          document.head.appendChild(dynamicStyle);
        }
        
        let styleContent = '';
        let googleFontsToLoad: string[] = [];
        
        const isCustomFont = (fName: string) => fName.match(/\.(woff|woff2|ttf|otf|zip)$/i) || fName.startsWith('uploads/');
        const getFontUrl = (fName: string) => fName.startsWith('http') ? fName : `${API_URL.split('/api')[0]}/${fName.replace(/^\.?\//, '')}`;
        
        if (isCustomFont(hFont)) {
           styleContent += `
             @font-face {
                font-family: 'ZenCustomHeading';
                src: url('${getFontUrl(hFont)}');
                font-display: swap;
             }
           `;
           root.style.setProperty('--font-serif', `"ZenCustomHeading", serif`);
        } else {
           root.style.setProperty('--font-serif', `"${hFont}", serif`);
           googleFontsToLoad.push(hFont);
        }

        if (isCustomFont(bFont)) {
           styleContent += `
             @font-face {
                font-family: 'ZenCustomBody';
                src: url('${getFontUrl(bFont)}');
                font-display: swap;
             }
           `;
           root.style.setProperty('--font-sans', `"ZenCustomBody", sans-serif`);
        } else {
           root.style.setProperty('--font-sans', `"${bFont}", sans-serif`);
           googleFontsToLoad.push(bFont);
        }
        
        dynamicStyle.innerHTML = styleContent;

        // Dynamically load Google Fonts
        const fontLink = document.getElementById('dynamic-google-fonts') as HTMLLinkElement;
        if (googleFontsToLoad.length > 0) {
           const fontQuery = googleFontsToLoad.map(f => `family=${f.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800`).join('&');
           const url = `https://fonts.googleapis.com/css2?${fontQuery}&display=swap`;

           if (fontLink) {
             fontLink.href = url;
           } else {
             const link = document.createElement('link');
             link.id = 'dynamic-google-fonts';
             link.rel = 'stylesheet';
             link.href = url;
             document.head.appendChild(link);
           }
        } else if (fontLink) {
           fontLink.href = '';
        }
      }
    } else {
      const root = document.documentElement;
      root.style.setProperty('--sidebar-gradient-start', DEFAULT_SIDEBAR_START);
      root.style.setProperty('--sidebar-gradient-end', DEFAULT_SIDEBAR_END);
    }

      // Update Favicon
      if (settings.general && settings.general.logo) {
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
