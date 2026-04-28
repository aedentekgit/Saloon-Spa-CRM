import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useJsApiLoader, Libraries } from '@react-google-maps/api';
import { useSettings } from './SettingsContext';

interface MapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const MapsContext = createContext<MapsContextType | undefined>(undefined);

const libraries: Libraries = ["places"];

const MapsLoader: React.FC<{ children: ReactNode; apiKey: string }> = ({ children, apiKey }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: `google-map-script-${apiKey}`,
    googleMapsApiKey: apiKey,
    libraries,
    version: "weekly"
  });

  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Listen for Google Maps authentication failures (invalid key, etc.)
    (window as any).gm_authFailure = () => {
      console.error("Google Maps Authentication Failed: Invalid Key or unauthorized domain.");
      setAuthError("Invalid API Key or Domain Authorization Error");
    };
    return () => {
      (window as any).gm_authFailure = null;
    };
  }, []);

  return (
    <MapsContext.Provider value={{ isLoaded: !!isLoaded, loadError: loadError || (authError ? new Error(authError) : undefined) }}>
      {children}
    </MapsContext.Provider>
  );
};

export const MapsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const apiKey = settings?.maps?.googleMapsApiKey;
  const isKeyValid = apiKey && apiKey.length > 10 && apiKey !== '********';

  if (!isKeyValid) {
    return (
      <MapsContext.Provider value={{ isLoaded: false, loadError: undefined }}>
        {children}
      </MapsContext.Provider>
    );
  }

  return <MapsLoader apiKey={apiKey}>{children}</MapsLoader>;
};

export const useMaps = () => {
  const context = useContext(MapsContext);
  if (context === undefined) {
    throw new Error('useMaps must be used within a MapsProvider');
  }
  return context;
};
