import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import { useSettings } from './SettingsContext';

interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
  enabled: boolean;
  hasApiKey: boolean;
  status: 'offline' | 'missing-key' | 'loading' | 'ready' | 'error';
  statusMessage: string;
}

const MapsContext = createContext<MapsContextType | undefined>(undefined);

const libraries: Libraries = ["places"];

const MapsLoader: React.FC<{ children: ReactNode; apiKey: string; enabled: boolean }> = ({ children, apiKey, enabled }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-script-${apiKey}`,
    googleMapsApiKey: apiKey,
    libraries,
    version: "weekly"
  });

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setAuthError(null);
    // Listen for Google Maps authentication failures (invalid key, etc.)
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Authentication Failed: Invalid Key or unauthorized domain.");
      setAuthError("Invalid API Key or Domain Authorization Error");
    };
    return () => {
      (window as any).gm_authFailure = null;
    };
  }, [apiKey]);

  const resolvedError = loadError || (authError ? new Error(authError) : undefined);
  const status = resolvedError ? 'error' : isLoaded ? 'ready' : 'loading';
  const statusMessage = resolvedError
    ? 'Google Maps could not load. Check API key restrictions, enabled APIs, billing, and the current domain.'
    : isLoaded
      ? 'Google Maps is connected and ready.'
      : 'Google Maps is validating the saved API key.';

  return (
    <MapsContext.Provider value={{ isLoaded: !!isLoaded, loadError: resolvedError, enabled, hasApiKey: true, status, statusMessage }}>
      {children}
    </MapsContext.Provider>
  );
};

export const MapsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const apiKey = settings?.maps?.googleMapsApiKey;
  const enabled = Boolean(settings?.maps?.enabled);
  const isKeyValid = apiKey && apiKey.length > 10 && apiKey !== '********';

  if (!enabled || !isKeyValid) {
    const status = enabled ? 'missing-key' : 'offline';
    const statusMessage = enabled
      ? 'Add a Google Maps API key before using branch geofencing.'
      : 'Maps are disabled in settings.';

    return (
      <MapsContext.Provider value={{ isLoaded: false, loadError: undefined, enabled, hasApiKey: Boolean(isKeyValid), status, statusMessage }}>
        {children}
      </MapsContext.Provider>
    );
  }

  return <MapsLoader apiKey={apiKey} enabled={enabled}>{children}</MapsLoader>;
};

export const useMaps = () => {
  const context = useContext(MapsContext);
  if (context === undefined) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};
