import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getCachedJson, setCachedJson } from '../../utils/localCache';
import { getImageUrl } from '../../utils/imageUrl';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5005/api';

export interface PublicSettings {
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
    headingFont: string;
    bodyFont: string;
    darkMode?: boolean;
  };
  upload?: {
    provider: string;
  };
  billing?: {
    gstEnabled: boolean;
  };
  workingHours?: {
    [key in 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday']: {
      isOpen: boolean;
      openTime: string;
      closeTime: string;
    }
  };
  maps?: {
    enabled: boolean;
    googleMapsApiKey: string;
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
    countryIso: 'QA',
    currency: 'Qatari Riyal',
    dialingCode: '+974',
    currencySymbol: 'QR',
    dateTimeFormat: 'DD/MM/YYYY HH:mm'
  },
  theme: {
    primaryColor: '#2D1622',
    headingFont: 'Italiana',
    bodyFont: 'Plus Jakarta Sans',
    darkMode: false
  },
  upload: {
    provider: 'local'
  },
  billing: {
    gstEnabled: false
  },
  workingHours: {
    monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    friday: { isOpen: true, openTime: '14:00', closeTime: '23:00' },
    saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
    sunday: { isOpen: true, openTime: '09:00', closeTime: '21:00' }
  },
  maps: {
    enabled: false,
    googleMapsApiKey: ''
  }
};

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

interface PublicSettingsContextValue {
  settings: PublicSettings;
  loading: boolean;
  error: string;
}

const PublicSettingsContext = createContext<PublicSettingsContextValue | undefined>(undefined);

export const PublicSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PublicSettings>(() => getCachedJson('zen_public_settings', defaultSettings));
  const [loading, setLoading] = useState(() => !localStorage.getItem('zen_public_settings'));
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchSettings = async () => {
      try {
        if (!localStorage.getItem('zen_public_settings')) setLoading(true);
        const response = await fetch(`${API_URL}/settings/public`, {
          signal: controller.signal
        });

        if (!response.ok) {
          throw new Error('Failed to load public settings');
        }

        const data = await response.json();
        setSettings({
          general: { ...defaultSettings.general, ...(data?.general || {}) },
          theme: { ...defaultSettings.theme, ...(data?.theme || {}) },
          upload: { ...defaultSettings.upload, ...(data?.upload || {}) },
          billing: { ...defaultSettings.billing, ...(data?.billing || {}) },
          workingHours: data?.workingHours || defaultSettings.workingHours,
          maps: { ...defaultSettings.maps, ...(data?.maps || {}) }
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

  useEffect(() => {
    if (settings) setCachedJson('zen_public_settings', settings);
  }, [settings]);

  // Update Favicon, Title and Dynamic Theme
  useEffect(() => {
    if (settings) {
      // Update Title
      if (settings.general) {
        document.title = settings.general.siteName || 'Spa & Saloon';
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

  const value = useMemo(() => ({ settings, loading, error }), [settings, loading, error]);

  return <PublicSettingsContext.Provider value={value}>{children}</PublicSettingsContext.Provider>;
};

export const usePublicSettings = () => {
  const context = useContext(PublicSettingsContext);
  return context || { settings: defaultSettings, loading: false, error: '' };
};

export { defaultSettings };
