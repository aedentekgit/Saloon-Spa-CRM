import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { getPollIntervalMs, shouldPollNow } from '../utils/polling';
import { getCachedJson, setCachedJson } from '../utils/localCache';
import { getImageUrl } from '../utils/imageUrl';

export interface SettingsData {
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
    cloudinaryCloudName?: string;
    cloudinaryApiKey?: string;
    cloudinaryApiSecret?: string;
  };
  billing?: {
    gstEnabled: boolean;
  };
  smtp?: {
    host: string;
    port: number;
    user: string;
    password?: string;
    fromName: string;
    fromEmail: string;
  };
  whatsapp?: {
    instanceId: string;
    token: string;
    provider: string;
    enabled: boolean;
  };
  notifications: {
    pushEnabled: boolean;
    firebaseApiKey?: string;
    firebaseAuthDomain?: string;
    firebaseProjectId?: string;
    firebaseStorageBucket?: string;
    firebaseMessagingSenderId?: string;
    firebaseAppId?: string;
    firebaseMeasurementId?: string;
    firebaseVapidKey?: string;
    firebaseClientEmail?: string;
    firebasePrivateKey?: string;
  };
  workingHours?: {
    [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    }
  };
  maps?: {
    googleMapsApiKey: string;
    enabled: boolean;
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
    start: mixHexColors(base, '#FFFFFF', 0.96),
    end: mixHexColors(base, '#FFFFFF', 0.92)
  };
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasPermission } = useAuth();
  const [settings, setSettings] = useState<SettingsData | null>(() => getCachedJson<SettingsData | null>('zen_settings', null));
  const [loading, setLoading] = useState(() => !getCachedJson<SettingsData | null>('zen_settings', null));

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

  const fetchSettings = async (silent: boolean = false) => {
    try {
      if (!silent && !settings) setLoading(true);
      
      const endpoint = (user && hasPermission('settings')) ? 'settings' : 'settings/public';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const response = await fetch(`${API_URL}/${endpoint}`, { headers });

      if (response.status === 401 && user) {
        logout();
        return;
      }

      if (response.status === 403 && endpoint !== 'settings/public') {
        const publicResponse = await fetch(`${API_URL}/settings/public`);
        const publicData = await publicResponse.json();
        setSettings(publicData);
        return;
      }

      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      if (!silent) setLoading(false);
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
    
    const interval = setInterval(() => {
      if (!shouldPollNow()) return;
      fetchSettings(true);
    }, getPollIntervalMs(60000)); // default 60s
    
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (settings) setCachedJson('zen_settings', settings);
  }, [settings]);

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
        const primary = settings.theme.primaryColor;
        const contrast = getContrastColor(primary);
        
        // Base variables
        root.style.setProperty('--zen-sand', primary);
        root.style.setProperty('--zen-primary', primary);
        root.style.setProperty('--zen-contrast-text', contrast);
        
        // RGB variables for transparency support
        const rgb = hexToRgb(primary);
        if (rgb) {
          const rgbStr = `${rgb.r}, ${rgb.g}, ${rgb.b}`;
          root.style.setProperty('--zen-primary-rgb', rgbStr);
          root.style.setProperty('--zen-sand-rgb', rgbStr);
        }
        
        // Tailwind 4 compatible variables
        root.style.setProperty('--color-zen-sand', primary);
        root.style.setProperty('--color-zen-primary', primary);
        root.style.setProperty('--color-zen-contrast', contrast);

        // Derive tinted cream for background if not in dark mode
        if (!settings.theme.darkMode) {
          const tintedCream = mixHexColors(primary, '#FFFFFF', 0.97);
          root.style.setProperty('--zen-cream', tintedCream);
          root.style.setProperty('--color-zen-cream', tintedCream);
        }
      }

      root.style.setProperty('--sidebar-gradient-start', sidebarGradient.start);
      root.style.setProperty('--sidebar-gradient-end', sidebarGradient.end);
      root.style.setProperty('--color-sidebar-gradient-start', sidebarGradient.start);
      root.style.setProperty('--color-sidebar-gradient-end', sidebarGradient.end);

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
        const getFontUrl = (fName: string) => getImageUrl(fName);
        
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
      root.style.setProperty('--zen-primary', '#6D28D9');
      root.style.setProperty('--zen-sand', '#8B5CF6');
      root.style.setProperty('--color-zen-primary', '#6D28D9');
      root.style.setProperty('--color-zen-sand', '#8B5CF6');
    }

      // Update Favicon — render as circle using canvas
      if (settings.general && settings.general.logo) {
        const logoUrl = getImageUrl(settings.general.logo);
        
        const makeCircularFavicon = (src: string) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            // Draw circular clip
            ctx.beginPath();
            ctx.arc(32, 32, 32, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, 64, 64);
            // Set favicon
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.type = 'image/png';
            link.href = canvas.toDataURL('image/png');
          };
          img.onerror = () => {
            // fallback: set raw URL if canvas fails
            let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (!link) {
              link = document.createElement('link');
              link.rel = 'icon';
              document.getElementsByTagName('head')[0].appendChild(link);
            }
            link.href = src;
          };
          img.src = src;
        };

        makeCircularFavicon(logoUrl);
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
