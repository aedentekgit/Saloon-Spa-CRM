import React, { useCallback, useState, useRef, useEffect } from 'react';
import { GoogleMap, MarkerF, CircleF, useJsApiLoader } from '@react-google-maps/api';
import { useMaps } from '../../context/MapsContext';
import { useSettings } from '../../context/SettingsContext';
import { MapPinOff, Loader2, Search } from 'lucide-react';

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1.5rem',
};

// Premium Zen-themed Map Styles (Dark/Plum tones)
const zenMapStyles = [
  { "featureType": "all", "elementType": "labels.text.fill", "stylers": [{ "color": "#7c93a3" }, { "lightness": "-10" }] },
  { "featureType": "all", "elementType": "labels.text.stroke", "stylers": [{ "visibility": "on" }, { "color": "#2D1622" }, { "lightness": 16 }] },
  { "featureType": "all", "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative", "elementType": "geometry.fill", "stylers": [{ "color": "#2D1622" }, { "lightness": 20 }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#2D1622" }, { "lightness": 17 }, { "weight": 1.2 }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 20 }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 21 }] },
  { "featureType": "road.highway", "elementType": "geometry.fill", "stylers": [{ "color": "#2D1622" }, { "lightness": 17 }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#2D1622" }, { "lightness": 29 }, { "weight": 0.2 }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 18 }] },
  { "featureType": "road.local", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 16 }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 19 }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#2D1622" }, { "lightness": 17 }] }
];

interface ZenMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  radius?: number;
  markers?: Array<{ lat: number; lng: number; label?: string }>;
  interactive?: boolean;
  className?: string;
}

export const ZenMap: React.FC<ZenMapProps> = ({ 
  center, 
  zoom = 15, 
  onLocationSelect, 
  radius, 
  markers = [],
  interactive = true,
  className = ""
}) => {
  const { settings } = useSettings();
  const { isLoaded, loadError } = useMaps();
  const enabled = settings?.maps?.enabled;
  const apiKey = settings?.maps?.googleMapsApiKey;

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onLocationSelectRef = useRef(onLocationSelect);

  const safeCenter = {
    lat: Number.isNaN(Number(center.lat)) || center.lat === 0 ? 25.2854 : Number(center.lat),
    lng: Number.isNaN(Number(center.lng)) || center.lng === 0 ? 51.5310 : Number(center.lng)
  };

  // Update ref when prop changes
  useEffect(() => {
    onLocationSelectRef.current = onLocationSelect;
  }, [onLocationSelect]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    mapRef.current = mapInstance;
    
    // Force a resize and re-center on load to prevent white blank maps
    setTimeout(() => {
      if (window.google) {
        window.google.maps.event.trigger(mapInstance, 'resize');
        mapInstance.setCenter(safeCenter);
      }
    }, 100);
  }, [safeCenter.lat, safeCenter.lng]);

  const onUnmount = useCallback(() => {
    setMap(null);
    mapRef.current = null;
  }, []);

  // Sync map center when prop changes
  useEffect(() => {
    if (mapRef.current && safeCenter.lat && safeCenter.lng) {
      mapRef.current.panTo(safeCenter);
    }
  }, [safeCenter.lat, safeCenter.lng]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let timeoutId: any;

    const initAutocomplete = () => {
      if (isLoaded && inputRef.current && !autocompleteRef.current) {
        if ((window as any).google?.maps?.places) {
          try {
            const newAutocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
              fields: ['formatted_address', 'geometry', 'name']
            });

            newAutocomplete.addListener('place_changed', () => {
              const place = newAutocomplete.getPlace();
              if (place && place.geometry && place.geometry.location) {
                const lat = typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat;
                const lng = typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng;
                
                if (onLocationSelectRef.current) {
                  onLocationSelectRef.current(lat, lng);
                }
                if (mapRef.current) {
                  mapRef.current.panTo({ lat, lng });
                  mapRef.current.setZoom(17);
                }
              }
            });
            autocompleteRef.current = newAutocomplete;
          } catch (err) {
            console.error("Failed to initialize ZenMap Autocomplete:", err);
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(initAutocomplete, 500);
        }
      }
    };

    initAutocomplete();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoaded]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (interactive && onLocationSelect && e.latLng) {
      onLocationSelect(e.latLng.lat(), e.latLng.lng());
    }
  };

  if (!enabled || !apiKey) {
    return (
      <div className={`w-full h-full min-h-[350px] bg-zen-cream/30 rounded-[1.5rem] border border-dashed border-zen-brown/20 flex flex-col items-center justify-center text-center p-8 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-zen-brown/20 mb-4 shadow-sm">
          <MapPinOff size={32} strokeWidth={1.5} />
        </div>
        <h4 className="text-sm font-bold text-zen-brown/60 uppercase tracking-widest">Maps Engine Offline</h4>
        <p className="text-[10px] text-zen-brown/40 mt-2 max-w-[200px] leading-relaxed font-bold uppercase tracking-widest">
          Please configure your Google Maps API Key in <span className="text-zen-sand">System Settings &gt; Maps</span> to enable location rituals.
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={`w-full h-full min-h-[350px] bg-zen-cream/30 rounded-[1.5rem] border border-dashed border-zen-brown/20 flex flex-col items-center justify-center text-center p-8 ${className}`}>
        <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center text-red-400/50 mb-4 shadow-sm">
          <MapPinOff size={32} strokeWidth={1.5} />
        </div>
        <h4 className="text-sm font-bold text-red-500/60 uppercase tracking-widest">Connection Failed</h4>
        <p className="text-[10px] text-zen-brown/40 mt-2 max-w-[200px] leading-relaxed font-bold uppercase tracking-widest">
          The map script could not be summoned. Verify your API key and internet connectivity.
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className={`w-full h-full min-h-[350px] bg-zen-cream/5 rounded-[1.5rem] border border-zen-brown/5 flex flex-col items-center justify-center ${className}`}>
        <Loader2 className="w-8 h-8 text-zen-sand/40 animate-spin" />
        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/30 mt-4">Summoning Google Maps...</p>
      </div>
    );
  }

  const handleLocateMe = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        if (onLocationSelect) {
          onLocationSelect(lat, lng);
        }
        if (mapRef.current) {
          mapRef.current.panTo({ lat, lng });
          mapRef.current.setZoom(17);
        }
      });
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-[1.5rem] shadow-xl border border-zen-brown/10 ${className}`} style={{ height: '100%', minHeight: '350px' }}>
      {interactive && (
        <div className="absolute top-4 left-4 right-4 z-10 flex gap-3">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-zen-brown/30 group-focus-within:text-zen-sand transition-colors">
              <Search size={16} />
            </div>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for a location or sanctuary..."
              className="w-full bg-white/95 backdrop-blur-md border border-zen-brown/10 rounded-2xl py-4 pl-12 pr-6 text-sm font-medium text-zen-brown placeholder:text-zen-brown/20 focus:outline-none focus:ring-2 focus:ring-zen-sand/20 focus:border-zen-sand/30 shadow-2xl transition-all"
            />
          </div>
          
          <button
            type="button"
            onClick={handleLocateMe}
            className="p-4 bg-white/95 backdrop-blur-md border border-zen-brown/10 rounded-2xl text-zen-brown/60 hover:text-zen-sand hover:border-zen-sand/30 shadow-2xl transition-all"
            title="Locate Current Position"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/></svg>
          </button>
        </div>
      )}

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={safeCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={{
          styles: zenMapStyles,
          disableDefaultUI: !interactive,
          zoomControl: interactive,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: interactive ? 'greedy' : 'none'
        }}
      >
        {interactive && onLocationSelect && (
          <MarkerF 
            position={safeCenter} 
            draggable={true}
            onDragEnd={(e) => {
              if (e.latLng) onLocationSelect(e.latLng.lat(), e.latLng.lng());
            }}
          />
        )}
        
        {markers.map((marker, i) => (
          <MarkerF key={i} position={marker} label={marker.label} />
        ))}

        {radius && radius > 0 && (
          <CircleF
            center={safeCenter}
            radius={radius}
            options={{
              fillColor: settings?.theme?.primaryColor || '#2D1622',
              fillOpacity: 0.15,
              strokeColor: settings?.theme?.primaryColor || '#2D1622',
              strokeOpacity: 0.6,
              strokeWeight: 2,
            }}
          />
        )}
      </GoogleMap>
      
      {interactive && (
        <div className="absolute bottom-4 left-4 right-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-zen-brown/10 shadow-lg pointer-events-none text-center">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zen-brown/60">
            Search location above or drag marker to refine
          </p>
        </div>
      )}
    </div>
  );
};

export const ZenGoogleSearchInput: React.FC<{
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  label?: string;
  placeholder?: string;
  icon?: any;
  required?: boolean;
  className?: string;
}> = ({ value, onChange, label, placeholder, icon: Icon, required, className }) => {
  const { isLoaded } = useMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep ref up to date to avoid stale closures in Google Maps listeners
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 10;
    let timeoutId: any;

    const initAutocomplete = () => {
      if (isLoaded && inputRef.current && !autocompleteRef.current) {
        if ((window as any).google?.maps?.places) {
          try {
            const newAutocomplete = new (window as any).google.maps.places.Autocomplete(inputRef.current, {
              fields: ['formatted_address', 'geometry', 'name']
            });

            newAutocomplete.addListener('place_changed', () => {
              const place = newAutocomplete.getPlace();
              if (place && place.formatted_address) {
                const lat = place.geometry?.location?.lat ? (typeof place.geometry.location.lat === 'function' ? place.geometry.location.lat() : place.geometry.location.lat) : undefined;
                const lng = place.geometry?.location?.lng ? (typeof place.geometry.location.lng === 'function' ? place.geometry.location.lng() : place.geometry.location.lng) : undefined;
                onChangeRef.current(place.formatted_address, lat, lng);
              }
            });

            autocompleteRef.current = newAutocomplete;
            console.log("Zen Address Search initialized successfully.");
          } catch (err) {
            console.error("Autocomplete initialization failed:", err);
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(initAutocomplete, 500);
        }
      }
    };

    initAutocomplete();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLoaded]);

  return (
    <div className={`space-y-2 group ${className || ''}`}>
      {label && (
        <label className="text-[9px] font-bold uppercase tracking-[0.3em] ml-1 flex items-center gap-1 text-zen-brown/40">
          {label}
          {required && <span className="text-red-400 text-xs mt-0.5">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="w-full relative flex items-center transition-all duration-300">
          {Icon && <Icon className="absolute left-4 text-zen-brown/30 group-focus-within:text-zen-brown transition-colors" size={16} />}
          <input 
            ref={inputRef}
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder || "Search location..."}
            className={`w-full py-3.5 ${Icon ? 'pl-10' : 'pl-4'} pr-4 bg-white border border-zen-brown/10 rounded-2xl outline-none transition-all font-serif text-sm sm:text-base text-zen-brown placeholder:text-zen-brown/20 focus:border-zen-sand/40 focus:ring-4 focus:ring-zen-sand/5 shadow-sm group-hover:border-zen-brown/20`}
          />
          {!isLoaded && (
            <div className="absolute right-4">
              <Loader2 size={14} className="text-zen-brown/20 animate-spin" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
