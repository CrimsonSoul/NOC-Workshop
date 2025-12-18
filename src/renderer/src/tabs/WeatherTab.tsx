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
  };
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

interface Location {
  latitude: number;
  longitude: number;
  name?: string;
}

const getWeatherIcon = (code: number, size = 24) => {
  // WMO Weather interpretation codes (WW)
  // 0: Clear sky
  // 1, 2, 3: Mainly clear, partly cloudy, and overcast
  // 45, 48: Fog
  // 51, 53, 55: Drizzle
  // 61, 63, 65: Rain
  // 71, 73, 75: Snow
  // 80, 81, 82: Rain showers
  // 95, 96, 99: Thunderstorm

  let path = '';
  let color = 'var(--color-text-primary)';

  if (code === 0 || code === 1) { // Sun / Clear
    path = "M12 7V2m0 20v-5M7 12H2m20 0h-5m-2.93-6.07L10.5 9.5M4.93 19.07l3.54-3.54M17.07 19.07l-3.54-3.54M10.5 14.5l-3.54 3.54M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z";
    color = '#FDB813';
  } else if (code === 2 || code === 3) { // Cloud
    path = "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";
    color = '#A1A1AA';
  } else if (code >= 51 && code <= 65) { // Rain
    return (
       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
         <path d="M16 14v6" />
         <path d="M8 14v6" />
         <path d="M12 16v6" />
       </svg>
    );
  } else if (code >= 71 && code <= 77) { // Snow
    color = '#E5E7EB';
    path = "M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25";
  } else if (code >= 95) { // Storm
    color = '#60A5FA';
    path = "M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9 M13 11l-4 6h6l-4 6";
  } else {
    // Default cloud
    path = "M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z";
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  );
};

export const WeatherTab: React.FC = () => {
  const [location, setLocation] = useState<Location | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [radarLoaded, setRadarLoaded] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
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
      // Fallback to coordinate-based search
      try {
        const nearbyData = await window.api.searchLocation(`${lat.toFixed(2)} ${lon.toFixed(2)}`);
        if (nearbyData.results && nearbyData.results.length > 0) {
          const { name, admin1, country_code } = nearbyData.results[0];
          return `${name}, ${admin1 || ''} ${country_code}`.trim();
        }
      } catch {
        // Ignore
      }
    }
    return 'Current Location';
  };

  // Auto-locate on mount
  useEffect(() => {
    const initLocation = async () => {
      // Check for saved location first
      const savedLocation = localStorage.getItem('weather_location');
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          // Only use saved location if it has a real name (not "Current Location")
          if (parsed.name && parsed.name !== 'Current Location') {
            setLocation(parsed);
            fetchWeather(parsed.latitude, parsed.longitude);
            return;
          }
        } catch {
          // Fall through to auto-locate
        }
      }

      // Auto-locate using geolocation
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            const name = await reverseGeocode(latitude, longitude);
            const newLoc = { latitude, longitude, name };
            setLocation(newLoc);
            localStorage.setItem('weather_location', JSON.stringify(newLoc));
            fetchWeather(latitude, longitude);
          },
          (err) => {
            console.error('Geolocation error:', err);
            // Fall back to a default location (US center) or show error
            setError('Could not detect location. Please search for your city.');
            setLoading(false);
          },
          {
            timeout: 10000,
            maximumAge: 300000, // 5 min cache
            enableHighAccuracy: true
          }
        );
      } else {
        setError('Geolocation is not supported. Please search for your city.');
        setLoading(false);
      }
    };

    initLocation();
  }, []);

  // Save location to localStorage when it changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('weather_location', JSON.stringify(location));
    }
  }, [location]);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch weather and alerts in parallel
      const [weatherData, alertsData] = await Promise.all([
        window.api.getWeather(lat, lon),
        window.api.getWeatherAlerts(lat, lon).catch(() => []) // Don't fail if alerts fail
      ]);
      setWeather(weatherData);
      setAlerts(alertsData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleManualSearch = async () => {
    if (!manualInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.searchLocation(manualInput);
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, admin1, country_code } = data.results[0];
        const label = `${name}, ${admin1 || ''} ${country_code}`.trim();
        const newLoc = { latitude, longitude, name: label };
        setLocation(newLoc);
        setRadarLoaded(false); // Reset radar loading state
        fetchWeather(latitude, longitude);
        setManualInput(''); // Clear input after successful search
      } else {
        setError('Location not found. Try a different search term.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setLoading(false);
    }
  };

  // Refresh weather periodically
  useEffect(() => {
    if (!location) return;
    const interval = setInterval(() => {
      fetchWeather(location.latitude, location.longitude);
    }, 300000); // 5 minutes
    return () => clearInterval(interval);
  }, [location]);

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
      .map((t, i) => ({ time: t, temp: weather.hourly.temperature_2m[i], code: weather.hourly.weathercode[i], index: i }))
      .filter((item, i) => {
        const date = new Date(item.time);
        // Show current hour and future hours, up to 12 items
        return date >= new Date(now.getFullYear(), now.getMonth(), now.getDate(), currentHour) && i < 24;
      })
      .slice(0, 12);
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--color-bg-app)',
      padding: '20px',
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
          <h2 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
            {location?.name || 'Weather'}
          </h2>
          {weather && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {getWeatherIcon(weather.current_weather.weathercode, 28)}
              <span style={{ fontSize: '22px', fontWeight: 500 }}>
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
        <div style={{
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
                        fontSize: '13px',
                        color: colors.text
                      }}>
                        {alert.event}
                      </span>
                      <span style={{
                        fontSize: '10px',
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
                          fontSize: '10px',
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
                      fontSize: '12px',
                      color: 'var(--color-text-secondary)',
                      margin: '4px 0 0',
                      lineHeight: '1.4'
                    }}>
                      {alert.headline}
                    </p>
                    {isExpanded && (
                      <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${colors.border}` }}>
                        <p style={{
                          fontSize: '11px',
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
                          fontSize: '10px',
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
      <div style={{
        display: 'flex',
        gap: '16px',
        flex: 1,
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Left: Forecast */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          flex: '0 0 380px',
          minWidth: '320px',
          maxWidth: '420px',
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
            <div style={{
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
                      fontSize: '11px',
                      color: isNow ? 'var(--color-accent-blue)' : 'var(--color-text-tertiary)',
                      marginBottom: '6px',
                      fontWeight: isNow ? 600 : 400
                    }}>
                      {isNow ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric' })}
                    </span>
                    <div style={{ marginBottom: '6px' }}>
                      {getWeatherIcon(item.code, 18)}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
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
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '12px',
              color: 'var(--color-text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flexShrink: 0
            }}>
              7-Day Forecast
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflow: 'auto' }}>
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
                      fontSize: '13px',
                      color: isToday ? 'var(--color-accent-blue)' : 'var(--color-text-primary)'
                    }}>
                      {isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' })}
                    </span>
                    <div style={{ width: '32px', display: 'flex', justifyContent: 'center' }}>
                      {getWeatherIcon(weather.daily.weathercode[i], 20)}
                    </div>
                    <div style={{ flex: 1 }} />
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', minWidth: '32px', textAlign: 'right' }}>
                        {Math.round(weather.daily.temperature_2m_max[i])}°
                      </span>
                      <span style={{ color: 'var(--color-text-tertiary)', fontSize: '14px', minWidth: '32px', textAlign: 'right' }}>
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
                    background: '#1a1a2e',
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
                  src={`https://www.rainviewer.com/map.html?loc=${location.latitude},${location.longitude},8&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=3&o=90&lm=1&layer=radar&sm=1&sn=1`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    opacity: radarLoaded ? 1 : 0,
                    transition: 'opacity 0.3s ease'
                  }}
                  partition="persist:rainviewer"
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
            Radar by RainViewer • Forecast by Open-Meteo • Alerts by NWS
          </div>
        </div>
      </div>
    </div>
  );
};
