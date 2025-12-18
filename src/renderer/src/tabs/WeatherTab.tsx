import React, { useState, useEffect } from 'react';
import { TactileButton } from '../components/TactileButton';
import { Input } from '../components/Input';
import { TabFallback } from '../components/TabFallback';

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
    path = "M19 19a5 5 0 0 0-5-5v5l-3-8h5.5l-2 6h5l-4.5 9L19 19z M12 3a9 9 0 0 0-9 9 9 9 0 0 0 9 9 9 9 0 0 0 9-9 9 9 0 0 0-9-9z"; // Simplified rain/cloud
    path = "M16 13v-1.26a8 8 0 1 0-5.4 14.61 M20 20h-8 M16 16v4 M12 16v4"; // Custom rain
    return (
       <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9" />
         <path d="M16 14v6" />
         <path d="M8 14v6" />
         <path d="M12 16v6" />
       </svg>
    );
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
  const [loading, setLoading] = useState(true); // Start loading to check persistence
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Persistence: Load from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('weather_location');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setLocation(parsed);
        fetchWeather(parsed.latitude, parsed.longitude);
      } catch (e) {
        // If parsing fails, fall back to auto location
        handleAutoLocation();
      }
    } else {
      handleAutoLocation();
    }
  }, []);

  // Persistence: Save to localStorage whenever location changes
  useEffect(() => {
    if (location) {
      localStorage.setItem('weather_location', JSON.stringify(location));
    }
  }, [location]);

  const fetchWeather = async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.getWeather(lat, lon);
      setWeather(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch weather data');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoLocation = () => {
    setLoading(true);
    setError(null);

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newLoc = { latitude, longitude, name: 'Current Location' };
          setLocation(newLoc);
          fetchWeather(latitude, longitude);
        },
        (err) => {
          console.error(err);
          setError('Location access denied or unavailable. Please try manual entry.');
          setLoading(false);
        },
        {
          timeout: 8000, // 8 seconds timeout for the API itself
          maximumAge: 600000, // Accept cached position (10 mins)
          enableHighAccuracy: false
        }
      );
    } else {
      setError('Geolocation is not supported by this environment.');
      setLoading(false);
    }
  };

  const handleManualSearch = async () => {
    if (!manualInput) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.api.searchLocation(manualInput);
      if (data.results && data.results.length > 0) {
        const { latitude, longitude, name, admin1, country_code } = data.results[0];
        const label = `${name}, ${admin1 || ''} ${country_code}`;
        const newLoc = { latitude, longitude, name: label };
        setLocation(newLoc);
        fetchWeather(latitude, longitude);
      } else {
        setError('Location not found.');
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setLoading(false);
    }
  };

  useEffect(() => {
    // Refresh weather periodically
    const interval = setInterval(() => {
        if (location) {
            fetchWeather(location.latitude, location.longitude);
        }
    }, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [location]); // Depend on location to ensure we fetch for the correct place

  if (!location && loading) return <TabFallback />;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      background: 'var(--color-bg-app)',
      padding: '24px',
      gap: '24px',
      overflowY: 'auto'
    }}>
      {/* Top Bar: Location & Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <h2 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {location?.name || 'Weather Radar'}
             </h2>
             {weather && (
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                     {getWeatherIcon(weather.current_weather.weathercode, 32)}
                     <span style={{ fontSize: '24px', fontWeight: 500 }}>
                         {Math.round(weather.current_weather.temperature)}°F
                     </span>
                 </div>
             )}
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ width: '200px' }}>
                <Input
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Search city..."
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                />
            </div>
            <TactileButton onClick={handleManualSearch} style={{ color: 'white' }}>SEARCH</TactileButton>
            <TactileButton onClick={handleAutoLocation} style={{ color: 'white' }}>LOCATE ME</TactileButton>
        </div>
      </div>

      {error && (
          <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444', borderRadius: '6px' }}>
              {error}
          </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
          {/* Left: Forecast */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>
              {/* Hourly Forecast */}
              <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-secondary)' }}>HOURLY FORECAST</h3>
                  <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {weather?.hourly.time.slice(0, 24).map((t, i) => {
                          const date = new Date(t);
                          const now = new Date();
                          if (date < now && i !== 0) return null; // Skip past hours, keep current
                          return (
                              <div key={t} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '40px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>
                                      {date.getHours() === now.getHours() ? 'Now' : date.toLocaleTimeString([], { hour: 'numeric' })}
                                  </span>
                                  <div style={{ marginBottom: '4px' }}>
                                    {getWeatherIcon(weather.hourly.weathercode[i], 20)}
                                  </div>
                                  <span style={{ fontSize: '13px', fontWeight: 500 }}>
                                      {Math.round(weather.hourly.temperature_2m[i])}°
                                  </span>
                              </div>
                          );
                      })}
                  </div>
              </div>

              {/* Weekly Forecast */}
              <div style={{ background: 'var(--color-bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-subtle)', flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--color-text-secondary)' }}>7-DAY FORECAST</h3>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {weather?.daily.time.map((t, i) => (
                          <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <span style={{ width: '60px', fontWeight: 500 }}>
                                  {new Date(t).toLocaleDateString([], { weekday: 'short' })}
                              </span>
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                                  {getWeatherIcon(weather.daily.weathercode[i], 24)}
                              </div>
                              <div style={{ display: 'flex', gap: '12px', width: '80px', justifyContent: 'flex-end' }}>
                                  <span style={{ fontWeight: 600 }}>{Math.round(weather.daily.temperature_2m_max[i])}°</span>
                                  <span style={{ color: 'var(--color-text-tertiary)' }}>{Math.round(weather.daily.temperature_2m_min[i])}°</span>
                              </div>
                          </div>
                      ))}
                   </div>
              </div>
          </div>

          {/* Right: Radar */}
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ flex: 1, background: '#000', borderRadius: '12px', overflow: 'hidden', position: 'relative', border: '1px solid var(--border-subtle)' }}>
                  {location ? (
                      <webview
                        src={`https://www.rainviewer.com/map.html?loc=${location.latitude},${location.longitude},8&oFa=0&oC=1&oU=0&oCS=1&oF=0&oAP=1&c=3&o=90&lm=1&layer=radar&sm=1&sn=1`}
                        style={{ width: '100%', height: '100%', border: 'none', background: 'white' }}
                      />
                  ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
                          Map unavailable
                      </div>
                  )}
              </div>
              <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--color-text-tertiary)', textAlign: 'right' }}>
                  Radar data provided by RainViewer | Forecast by Open-Meteo
              </div>
          </div>
      </div>
    </div>
  );
};
