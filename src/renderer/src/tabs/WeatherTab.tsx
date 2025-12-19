import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TactileButton } from '../components/TactileButton';
import { Input } from '../components/Input';
import { TabFallback } from '../components/TabFallback';
import type { WeatherAlert } from '@shared/ipc';

interface WeatherData {
  current_weather: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    weathercode: number[];
    precipitation_probability: number[];
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    wind_speed_10m_max: number[];
    precipitation_probability_max: number[];
  };
}

interface Location {
  latitude: number;
  longitude: number;
  name?: string;
}

// Generate RainViewer URL with location centered
const getRadarUrl = (lat: number, lon: number): string => {
  // theme=dark, color=2 (Universal Blue), opacity=0.8, smooth=1 (smoothed radar rendering)
  // loc=lat,lon,zoom
  return `https://www.rainviewer.com/map.html?loc=${lat},${lon},8&theme=dark&color=2&opacity=0.8&smooth=1&animation=1`;
};

const getWeatherIcon = (code: number, size = 24) => {
  const strokeWidth = 2;

  // Clear / Sun
  if (code === 0 || code === 1) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#FDB813" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <circle cx="12" cy="12" r="4" fill="rgba(253, 184, 19, 0.1)" />
        <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41m12.73-12.73l-1.41 1.41" />
      </svg>
    );
  }

  // Partly Cloudy
  if (code === 2) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        {/* Sun peaking behind */}
        <path d="M12 2v2m-6.36 1.64 1.41 1.41M2 12h2" stroke="#FDB813" />
        <circle cx="12" cy="12" r="3" stroke="#FDB813" />
        {/* Cloud in front */}
        <path
          d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8"
          stroke="#A1A1AA"
          fill="rgba(15, 15, 18, 0.8)"
          transform="scale(0.8) translate(4, 4)"
        />
      </svg>
    );
  }

  // Overcast / Fog
  if (code === 3 || code === 45 || code === 48) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8" fill="rgba(161, 161, 170, 0.05)" />
      </svg>
    );
  }

  // Drizzle / Rain
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8" stroke="#A1A1AA" />
        <path d="M8 20l-1 2m4-2l-1 2m4-2l-1 2" stroke="#60A5FA" />
      </svg>
    );
  }

  // Snow
  if (code >= 71 && code <= 77) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8" stroke="#A1A1AA" />
        <path d="M8 20h.01M12 20h.01M16 20h.01" stroke="#E5E7EB" strokeWidth="3" />
      </svg>
    );
  }

  // Thunderstorm
  if (code >= 95) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
        <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8" stroke="#A1A1AA" />
        <path d="m13 14-4 6h5l-4 6" stroke="#FDE047" fill="rgba(253, 224, 71, 0.1)" />
      </svg>
    );
  }

  // Default / Cloudy
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A1A1AA" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <path d="M17.5 19c2.5 0 4.5-2 4.5-4.5 0-2.3-1.7-4.2-3.9-4.5-1.1-2.9-3.9-4.9-7.1-4.9-3.3 0-6.2 2.1-7.1 5.2C1.7 10.8 0 12.8 0 15.2c0 2.6 2.1 4.8 4.7 4.8h12.8" />
    </svg>
  );
};


interface WeatherTabProps {
  weather: WeatherData | null;
  alerts: WeatherAlert[];
  location: Location | null;
  loading: boolean;
  onLocationChange: (loc: Location) => void;
  onManualRefresh: (lat: number, lon: number) => void;
}

export const WeatherTab: React.FC<WeatherTabProps> = ({ weather, alerts, location, loading, onLocationChange, onManualRefresh }) => {
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [radarLoaded, setRadarLoaded] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const webviewRef = useRef<Electron.WebviewTag | null>(null);
  const radarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reverse geocode coordinates to get location name
  const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
    try {
      const data = await window.api.searchLocation(`${lat},${lon}`);
      if (data.results && data.results.length > 0) {
        const { name, admin1, country_code } = data.results[0];
        return `${name}, ${admin1 || ''} ${country_code}`.trim();
      }
    } catch {
      // Fallback
    }
    return 'Current Location';
  };

  const handleAutoLocate = useCallback(async () => {
    setError(null);
    setPermissionDenied(false);

    const tryIPLocation = async () => {
      try {
        console.log('[Weather] Attempting IP-based location fallback...');
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();

        if (data.latitude && data.longitude) {
          const newLoc = {
            latitude: data.latitude,
            longitude: data.longitude,
            name: `${data.city}, ${data.region_code} ${data.country_code}`
          };
          onLocationChange(newLoc);
          localStorage.setItem('weather_location', JSON.stringify(newLoc));
          onManualRefresh(data.latitude, data.longitude);
          return true;
        }
      } catch (e) {
        console.error('[Weather] IP Location fallback failed:', e);
      }
      return false;
    };

    if (!('geolocation' in navigator)) {
      await tryIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const name = await reverseGeocode(latitude, longitude);
        const newLoc = { latitude, longitude, name };
        onLocationChange(newLoc);
        localStorage.setItem('weather_location', JSON.stringify(newLoc));
        onManualRefresh(latitude, longitude);
      },
      async (err) => {
        console.error('[Weather] Geolocation failed:', err.message);

        const ipSuccess = await tryIPLocation();

        if (!ipSuccess) {
          if (err.code === 1) { // PERMISSION_DENIED
            setPermissionDenied(true);
            setError('Location access was denied and fallback failed. Please search for your city manualy.');
          } else {
            setError('Could not detect location automatically. Please search for your city manualy.');
          }
        }
      },
      {
        timeout: 5000,
        maximumAge: 300000,
        enableHighAccuracy: false // Use false initially for faster response on desktop
      }
    );
  }, [onLocationChange, onManualRefresh, reverseGeocode]);

  // Auto-locate on mount if no location
  useEffect(() => {
    if (!location && !loading) {
      // Only auto-locate if we don't have a location and aren't already loading one (from app init)
      // Actually, App passed null if nothing in storage.
      handleAutoLocate();
    }
  }, []);

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setError(null);
    try {
      const data = await window.api.searchLocation(manualInput);
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, admin1, country_code } = data.results[0];
        const label = `${name}, ${admin1 || ''} ${country_code}`.trim();
        const newLoc = { latitude, longitude, name: label };
        onLocationChange(newLoc);
        localStorage.setItem('weather_location', JSON.stringify(newLoc));
        setRadarLoaded(false); // Reset radar loading state

        onManualRefresh(latitude, longitude);
        setManualInput(''); // Clear input after successful search
      } else {
        setError('Location not found. Try a different search term.');
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
    }
  };


  // Handle webview events with timeout fallback
  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview || !location) return;

    // Reset radar loaded state when location changes
    setRadarLoaded(false);

    // Clear any existing timeout
    if (radarTimeoutRef.current) {
      clearTimeout(radarTimeoutRef.current);
    }

    const handleDidFinishLoad = () => {
      if (radarTimeoutRef.current) {
        clearTimeout(radarTimeoutRef.current);
      }
      setRadarLoaded(true);

      if (webview) {
        // Persistent CSS injection
        webview.insertCSS(`
          html, body { 
            background-color: #0f0f12 !important; 
            overflow: hidden !important;
          }
          /* Aggressively Hide RainViewer UI Clutter */
          .menu-container, 
          .left-menu, 
          .right-menu, 
          .top-menu,
          .bottom-menu,
          .search-container, 
          .logo-alt,
          .map-legend,
          .leaflet-control,
          .promo-container,
          .bottom-info,
          .header-container,
          .app-promo,
          .larger-map-btn,
          .refresh-btn,
          #search-input-container,
          .leaflet-top.leaflet-right,
          .leaflet-top.leaflet-left,
          .leaflet-bottom.leaflet-left,
          .leaflet-bottom.leaflet-right,
          .leaflet-control-container,
          #radar-info,
          .info-box { 
            display: none !important; 
          }
          /* Ensure player is visible and positioned nicely */
          .player-container {
            display: block !important;
            bottom: 30px !important;
            left: 50% !important;
            transform: translateX(-50%) !important;
            background: rgba(15, 15, 18, 0.95) !important;
            backdrop-filter: blur(12px) !important;
            border-radius: 16px !important;
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            padding: 8px 16px !important;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6) !important;
            z-index: 999999 !important;
          }
          /* Hide the text overlays that RainViewer injects */
          div[style*="z-index"][style*="position: absolute"] {
             pointer-events: none !important;
          }
        `);

        // DOM Removal - Surgical and Safe
        webview.executeJavaScript(`
          const cleanup = () => {
             const selectors = [
              '.menu-container', 
              '.promo-container',
              '.larger-map-btn', 
              '.refresh-btn', 
              '.app-promo', 
              '.logo-alt', 
              '.view-selector',
              '.leaflet-control-zoom',
              '.leaflet-control-attribution',
              '.leaflet-control-container',
              '.top-menu',
              '.bottom-menu'
            ];
            
            selectors.forEach(s => {
              document.querySelectorAll(s).forEach(el => {
                if (el) el.style.setProperty('display', 'none', 'important');
              });
            });

            // Target "Plain Viewer" and "Larger map" by text
            document.querySelectorAll('div, span, a').forEach(el => {
               if (el.textContent && (el.textContent.includes('Plain Viewer') || el.textContent.includes('Larger map'))) {
                  el.style.setProperty('display', 'none', 'important');
               }
            });

            // Ensure player stays visible and high-z-index
            const player = document.querySelector('.player-container');
            if (player) {
              player.style.setProperty('display', 'block', 'important');
              player.style.setProperty('z-index', '999999', 'important');
              player.style.setProperty('bottom', '30px', 'important');
              player.style.setProperty('top', 'auto', 'important');
            }
          };
          
          cleanup();
          // Hammer it for 10 seconds
          const interval = setInterval(cleanup, 1000);
          setTimeout(() => clearInterval(interval), 10000);
        `);
      }
    };

    const handleDidFailLoad = () => {
      console.error('Radar webview failed to load');
      if (radarTimeoutRef.current) {
        clearTimeout(radarTimeoutRef.current);
      }
      setRadarLoaded(true); // Still mark as loaded to hide spinner
    };

    // Set a timeout fallback - if radar doesn't load in 10 seconds, show it anyway
    radarTimeoutRef.current = setTimeout(() => {
      console.warn('Radar load timeout - forcing display');
      setRadarLoaded(true);
    }, 10000);

    webview.addEventListener('did-finish-load', handleDidFinishLoad);
    webview.addEventListener('did-fail-load', handleDidFailLoad);

    // Check if webview is already loaded (race condition fix)
    // Use a small delay to ensure the webview element is properly mounted
    const checkLoaded = setTimeout(() => {
      try {
        // If the webview can execute JavaScript, it's loaded
        webview.executeJavaScript('true').then(() => {
          if (!radarLoaded) {
            setRadarLoaded(true);
            if (radarTimeoutRef.current) {
              clearTimeout(radarTimeoutRef.current);
            }
          }
        }).catch(() => {
          // Not ready yet, wait for events
        });
      } catch {
        // Webview not ready
      }
    }, 2000);

    return () => {
      webview.removeEventListener('did-finish-load', handleDidFinishLoad);
      webview.removeEventListener('did-fail-load', handleDidFailLoad);
      if (radarTimeoutRef.current) {
        clearTimeout(radarTimeoutRef.current);
      }
      clearTimeout(checkLoaded);
    };
  }, [location]);

  if (!location && loading) return <TabFallback />;

  // Filter hourly forecast to only show future hours
  const getFilteredHourlyForecast = () => {
    if (!weather) return [];
    const now = new Date();
    const currentHour = now.getHours();

    return weather.hourly.time
      .map((t, i) => ({
        time: t,
        temp: weather.hourly.temperature_2m[i],
        code: weather.hourly.weathercode[i],
        precip: weather.hourly.precipitation_probability[i],
        index: i
      }))
      .filter((item, i) => {
        const date = new Date(item.time);
        // Show current hour and future hours, up to 12 items
        return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour) && i < 24;
      })
      .slice(0, 12);
  };

  return (
    <div className="weather-scroll-container" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--color-bg-app)',
      padding: '20px 12px',
      gap: '16px',
      overflow: 'hidden'
    }}>
      {/* Top Bar: Location & Controls */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            {location?.name || 'Weather'}
          </h2>
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {getWeatherIcon(weather.current_weather.weathercode, 28)}
              <span style={{ fontSize: '24px', fontWeight: 500 }}>
                {Math.round(weather.current_weather.temperature)}°F
              </span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <Input
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="Search city..."
            onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
            style={{ width: '180px' }}
          />
          <TactileButton onClick={handleManualSearch}>SEARCH</TactileButton>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#EF4444',
          borderRadius: '8px',
          fontSize: '13px',
          flexShrink: 0
        }}>
          {error}
        </div>
      )}

      {/* Weather Alerts */}
      {alerts.length > 0 && (
        <div className="weather-scroll-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          flexShrink: 0,
          maxHeight: expandedAlert ? '300px' : '150px',
          overflowY: 'auto'
        }}>
          {alerts.map((alert) => {
            const isExpanded = expandedAlert === alert.id;
            const severityColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
              'Extreme': { bg: 'rgba(220, 38, 38, 0.15)', border: 'rgba(220, 38, 38, 0.5)', text: '#FCA5A5', icon: '#EF4444' },
              'Severe': { bg: 'rgba(234, 88, 12, 0.15)', border: 'rgba(234, 88, 12, 0.5)', text: '#FDBA74', icon: '#F97316' },
              'Moderate': { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.5)', text: '#FDE047', icon: '#EAB308' },
              'Minor': { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.5)', text: '#93C5FD', icon: '#3B82F6' },
              'Unknown': { bg: 'rgba(107, 114, 128, 0.15)', border: 'rgba(107, 114, 128, 0.5)', text: '#9CA3AF', icon: '#6B7280' }
            };
            const colors = severityColors[alert.severity] || severityColors['Unknown'];

            return (
              <div
                key={alert.id}
                style={{
                  background: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  padding: '10px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  {/* Alert Icon */}
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={colors.icon}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: '2px' }}
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontWeight: 600,
                        fontSize: '15px',
                        color: colors.text
                      }}>
                        {alert.event}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'rgba(0,0,0,0.2)',
                        color: colors.text,
                        textTransform: 'uppercase',
                        fontWeight: 500
                      }}>
                        {alert.severity}
                      </span>
                      {alert.urgency === 'Immediate' && (
                        <span style={{
                          fontSize: '11px',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          background: 'rgba(220, 38, 38, 0.3)',
                          color: '#FCA5A5',
                          textTransform: 'uppercase',
                          fontWeight: 500
                        }}>
                          Immediate
                        </span>
                      )}
                    </div>
                    <p style={{
                      fontSize: '14px',
                      color: 'var(--color-text-secondary)',
                      margin: '4px 0 0',
                      lineHeight: '1.4'
                    }}>
                      {alert.headline}
                    </p>
                    {isExpanded && (
                      <div className="weather-scroll-container" style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.border}` }}>
                        <p style={{
                          fontSize: '14px',
                          color: 'var(--color-text-tertiary)',
                          margin: '0 0 8px',
                          lineHeight: '1.5',
                          whiteSpace: 'pre-wrap',
                          maxHeight: '120px',
                          overflowY: 'auto'
                        }}>
                          {alert.description}
                        </p>
                        <div style={{
                          display: 'flex',
                          gap: '16px',
                          fontSize: '12px',
                          color: 'var(--color-text-quaternary)'
                        }}>
                          <span>Expires: {new Date(alert.expires).toLocaleString()}</span>
                          <span>{alert.senderName}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Expand/Collapse Arrow */}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-tertiary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      flexShrink: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Main Content - Responsive Grid */}
      <div className="weather-tab-root weather-scroll-container" style={{
        display: 'flex',
        gap: '16px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Left: Forecast */}
        <div className="weather-forecast-column weather-scroll-container" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: '0 0 35%',
          minWidth: '300px',
          overflowY: 'auto'
        }}>
          {/* Hourly Forecast */}
          <div style={{
            background: 'var(--color-bg-card)',
            borderRadius: '10px',
            padding: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            flexShrink: 0
          }}>
            <h3 style={{
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Hourly Forecast
            </h3>
            <div className="weather-scroll-container" style={{
              display: 'flex',
              gap: '4px',
              overflowX: 'auto',
              paddingBottom: '4px'
            }}>
              {getFilteredHourlyForecast().map((item, idx) => {
                const date = new Date(item.time);
                const now = new Date();
                const isNow = date.getHours() === now.getHours() && date.getDate() === now.getDate();
                return (
                  <div
                    key={item.time}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      background: isNow ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                      minWidth: '48px',
                      flexShrink: 0
                    }}
                  >
                    <span style={{
                      fontSize: '12px',
                      color: isNow ? 'var(--color-accent-blue)' : 'var(--color-text-tertiary)',
                      marginBottom: '6px',
                      fontWeight: isNow ? 600 : 400
                    }}>
                      {isNow ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric' })}
                    </span>
                    <div style={{ marginBottom: '6px' }}>
                      {getWeatherIcon(item.code, 18)}
                    </div>
                    {/* Rain Chance */}
                    {item.precip > 0 ? (
                      <div style={{
                        fontSize: '10px',
                        color: '#60A5FA',
                        fontWeight: 600,
                        marginBottom: '2px'
                      }}>
                        {item.precip}%
                      </div>
                    ) : (
                      <div style={{ height: '15px' }} />
                    )}
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>
                      {Math.round(item.temp)}°
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Weekly Forecast */}
          <div style={{
            background: 'var(--color-bg-card)',
            borderRadius: '10px',
            padding: '14px',
            border: '1px solid rgba(255,255,255,0.08)',
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              fontSize: '13px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              16-Day Forecast
            </h3>
            <div className="weather-scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'auto' }}>
              {weather?.daily.time.map((t, i) => {
                const date = new Date(t);
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={t}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '10px 8px',
                      borderRadius: '6px',
                      background: isToday ? 'rgba(59, 130, 246, 0.1)' : 'transparent'
                    }}
                  >
                    <span style={{
                      width: '44px',
                      fontWeight: isToday ? 600 : 500,
                      fontSize: '14px',
                      color: isToday ? 'var(--color-accent-blue)' : 'var(--color-text-primary)'
                    }}>
                      {isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' })}
                    </span>
                    <div style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                      {getWeatherIcon(weather.daily.weathercode[i], 20)}
                    </div>
                    {/* Wind and Precip */}
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px', flex: 1, alignItems: 'center' }}>
                      {weather.daily.wind_speed_10m_max[i] > 8 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--color-text-tertiary)', background: 'rgba(255,255,255,0.03)', padding: '2px 6px', borderRadius: '4px' }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                          <span style={{ fontSize: '11px', fontWeight: 500 }}>{Math.round(weather.daily.wind_speed_10m_max[i])}</span>
                        </div>
                      )}
                      {weather.daily.precipitation_probability_max[i] > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#60A5FA', background: 'rgba(96, 165, 250, 0.08)', padding: '2px 6px', borderRadius: '4px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600 }}>{weather.daily.precipitation_probability_max[i]}%</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '15px', minWidth: '32px', textAlign: 'right' }}>
                        {Math.round(weather.daily.temperature_2m_max[i])}°
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '15px', minWidth: '32px', textAlign: 'right' }}>
                        {Math.round(weather.daily.temperature_2m_min[i])}°
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Radar */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          minHeight: 0
        }}>
          <div style={{
            flex: 1,
            background: '#1a1a2e',
            borderRadius: '10px',
            overflow: 'hidden',
            position: 'relative',
            border: '1px solid rgba(255,255,255,0.08)',
            minHeight: '300px'
          }}>
            {location ? (
              <>
                {!radarLoaded && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#0f0f12', // Match NWS dark theme
                    zIndex: 10
                  }}>
                    <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                      <div className="animate-spin" style={{
                        width: '32px',
                        height: '32px',
                        border: '3px solid rgba(255,255,255,0.1)',
                        borderTopColor: 'var(--color-accent-blue)',
                        borderRadius: '50%',
                        margin: '0 auto 12px'
                      }} />
                      Loading radar...
                    </div>
                  </div>
                )}
                <webview
                  ref={webviewRef as any}
                  src={getRadarUrl(location.latitude, location.longitude)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    opacity: radarLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  partition="persist:weather"
                  // @ts-ignore - webview attributes
                  allowpopups="false"
                />
              </>
            ) : (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: 'var(--color-text-tertiary)'
              }}>
                Search for a location to view radar
              </div>
            )}
          </div>
          <div style={{
            marginTop: '8px',
            fontSize: '10px',
            color: 'var(--color-text-quaternary)',
            textAlign: 'right'
          }}>
            Radar & Alerts by NWS • Forecast by Open-Meteo
          </div>
        </div>
      </div>
    </div>
  );
};
