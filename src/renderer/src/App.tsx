import React, { useState, useEffect, useRef, useCallback, Suspense, lazy, Component, ErrorInfo, ReactNode } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorldClock } from './components/WorldClock';
import { AssemblerTab } from './tabs/AssemblerTab';
import { WindowControls } from './components/WindowControls';
import { ToastProvider, useToast } from './components/Toast';
import { AppData, Contact, DataError, WeatherAlert } from '@shared/ipc';
import { TabFallback } from './components/TabFallback';
import './styles.css';
import { DUMMY_DATA } from './dummyData';

// Error Boundary to prevent full app crashes from component errors
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-bg-app)',
          color: 'var(--color-text-primary)',
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}>⚠</div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>Something went wrong</h1>
          <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '24px', maxWidth: '400px' }}>
            The application encountered an unexpected error. Please restart the application.
          </p>
          <pre style={{
            fontSize: '11px',
            color: 'var(--color-text-tertiary)',
            background: 'rgba(255,255,255,0.05)',
            padding: '12px 16px',
            borderRadius: '6px',
            maxWidth: '500px',
            overflow: 'auto',
            textAlign: 'left'
          }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '10px 20px',
              background: 'var(--color-accent-blue)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lazy load non-default tabs and settings modal to optimize initial bundle size
const DirectoryTab = lazy(() => import('./tabs/DirectoryTab').then(m => ({ default: m.DirectoryTab })));
const ServersTab = lazy(() => import('./tabs/ServersTab').then(m => ({ default: m.ServersTab })));
const RadarTab = lazy(() => import('./tabs/RadarTab').then(m => ({ default: m.RadarTab })));
const WeatherTab = lazy(() => import('./tabs/WeatherTab').then(m => ({ default: m.WeatherTab })));
const MetricsTab = lazy(() => import('./tabs/MetricsTab').then(m => ({ default: m.MetricsTab })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));

type Tab = 'Compose' | 'People' | 'Servers' | 'Reports' | 'Radar' | 'Weather';

// Format data errors for user-friendly display
function formatDataError(error: DataError): string {
  const file = error.file ? ` in ${error.file}` : '';
  switch (error.type) {
    case 'validation':
      if (Array.isArray(error.details) && error.details.length > 0) {
        const count = error.details.length;
        return `Data validation: ${count} issue${count > 1 ? 's' : ''} found${file}`;
      }
      return error.message;
    case 'parse':
      return `Failed to parse data${file}: ${error.message}`;
    case 'write':
      return `Failed to save changes${file}`;
    case 'read':
      return `Failed to read data${file}`;
    default:
      return error.message || 'An unknown error occurred';
  }
}


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

export function MainApp() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('Compose');
  const [data, setData] = useState<AppData>(DUMMY_DATA);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualAdds, setManualAdds] = useState<string[]>([]);
  const [manualRemoves, setManualRemoves] = useState<string[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const reloadStartRef = useRef<number | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReloadingRef = useRef(isReloading);

  // Weather State (Lifted)
  const [weatherLocation, setWeatherLocation] = useState<Location | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherAlerts, setWeatherAlerts] = useState<WeatherAlert[]>([]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const lastAlertIdsRef = useRef<Set<string>>(new Set());

  // Restore Weather Location
  useEffect(() => {
    const saved = localStorage.getItem('weather_location');
    if (saved) {
      try {
        setWeatherLocation(JSON.parse(saved));
      } catch { }
    }
  }, []);

  const fetchWeather = useCallback(async (lat: number, lon: number, silent = false) => {
    if (!silent) setWeatherLoading(true);
    try {
      const [wData, aData] = await Promise.all([
        window.api.getWeather(lat, lon),
        window.api.getWeatherAlerts(lat, lon).catch(() => [])
      ]);
      setWeatherData(wData);
      setWeatherAlerts(aData);

      // Handle Realtime Alerts
      if (aData.length > 0) {
        // Find new alerts we haven't shown yet
        const newAlerts = aData.filter((a: any) => !lastAlertIdsRef.current.has(a.id));
        if (newAlerts.length > 0) {
          // Toast the most severe one to avoid spam
          const severe = newAlerts.find((a: any) => a.severity === 'Extreme' || a.severity === 'Severe') || newAlerts[0];
          showToast(`Weather Alert: ${severe.event}`, 'error');

          // Update known IDs
          newAlerts.forEach((a: any) => lastAlertIdsRef.current.add(a.id));
        }
      }

    } catch (err) {
      console.error('Weather fetch failed', err);
    } finally {
      if (!silent) setWeatherLoading(false);
    }
  }, [showToast]);

  // Weather Polling (Every 2 mins) & Tab Switch Refresh
  useEffect(() => {
    if (!weatherLocation) return;

    // Fetch immediately on mount or location change
    fetchWeather(weatherLocation.latitude, weatherLocation.longitude, !!weatherData);

    // Poll every 2 minutes for background alerts
    const interval = setInterval(() => {
      fetchWeather(weatherLocation.latitude, weatherLocation.longitude, true);
    }, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [weatherLocation, fetchWeather]); // Re-run when location changes


  // Sync ref
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);

  // Set platform class on body for CSS targeting
  useEffect(() => {
    const platform = window.api?.platform || (navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32');
    document.body.classList.add(`platform-${platform}`);
    console.log(`[App] Platform detected: ${platform}`);
  }, []);

  const settleReloadIndicator = useCallback(() => {
    // Always clear, respecting minimum display time if a start time exists
    if (!reloadStartRef.current) {
      setIsReloading(false);
      return;
    }
    const elapsed = performance.now() - reloadStartRef.current;
    const delay = Math.max(900 - elapsed, 0);
    if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    reloadTimeoutRef.current = setTimeout(() => {
      setIsReloading(false);
      reloadStartRef.current = null;
      reloadTimeoutRef.current = null;
    }, delay);
  }, []);


  // Safety timeout to prevent stuck syncing state
  useEffect(() => {
    if (isReloading) {
      const safety = setTimeout(() => {
        if (isReloadingRef.current) {
          console.warn('[App] Force clearing stuck sync indicator after timeout');
          setIsReloading(false);
          reloadStartRef.current = null;
        }
      }, 5000);
      return () => clearTimeout(safety);
    }
  }, [isReloading]);

  // Bolt: Memoize window API calls (though they use global window.api, good practice)
  const handleImportGroups = useCallback(async () => await window.api?.importGroupsFile(), []);
  const handleImportContacts = useCallback(async () => await window.api?.importContactsFile(), []);
  const handleImportServers = useCallback(async () => await window.api?.importServersFile(), []);

  useEffect(() => {
    if (!window.api) return;
    window.api.subscribeToData((newData) => {
      setData(newData);
      settleReloadIndicator();
    });
    window.api.onReloadStart(() => {
      reloadStartRef.current = performance.now();
      setIsReloading(true);
    });
    window.api.onReloadComplete(() => {
      settleReloadIndicator();
    });
    // Subscribe to data errors and surface them to the user
    window.api.onDataError((error: DataError) => {
      console.error('[App] Data error received:', error);
      const errorMessage = formatDataError(error);
      showToast(errorMessage, 'error');
    });
    return () => { if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current); };
  }, [settleReloadIndicator, showToast]);

  // Bolt: Memoize handlers to prevent re-renders of heavy AssemblerTab/DirectoryTab lists
  const handleAddToAssembler = useCallback((contact: Contact) => {
    setManualRemoves(prev => prev.filter(e => e !== contact.email));
    setManualAdds(prev => prev.includes(contact.email) ? prev : [...prev, contact.email]);
  }, []);

  const handleUndoRemove = useCallback(() => {
    setManualRemoves(prev => {
      const newRemoves = [...prev];
      newRemoves.pop();
      return newRemoves;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedGroups([]);
    setManualAdds([]);
    setManualRemoves([]);
  }, []);

  const handleAddManual = useCallback((email: string) => {
    setManualAdds(p => [...p, email]);
  }, []);

  const handleRemoveManual = useCallback((email: string) => {
    setManualRemoves(p => [...p, email]);
  }, []);

  const handleSync = useCallback(async () => {
    if (isReloading) return;
    await window.api?.reloadData();
  }, [isReloading]);

  // Logic to show settings menu.
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Extracted callback to avoid conditional hook call
  const handleToggleGroup = useCallback((group: string) => {
    setSelectedGroups(prev => {
      if (prev.includes(group)) {
        return prev.filter(g => g !== group);
      }
      return [...prev, group];
    });
  }, []);

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab: any) => {
          if (isReloading) return; // Prevent tab switch during reload
          setActiveTab(tab);
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
        }}
      />

      {/* Main Content Area */}
      <main className="main-content">
        {/* Breadcrumb / Header Area */}
        <header className="app-header">
          <div className="header-title-container">
            <span className="header-breadcrumb">
              Relay / {activeTab}
            </span>
            <span className="header-title">
              {activeTab === 'Compose' && 'Data Composition'}
              {activeTab === 'People' && 'Contact Directory'}
              {activeTab === 'Servers' && 'Infrastructure Servers'}
              {activeTab === 'Reports' && 'Reports'}
              {activeTab === 'Radar' && 'Dispatcher Radar'}
              {activeTab === 'Weather' && 'Weather & Radar'}
            </span>
          </div>

          {/* Actions Area */}
          <div className="header-actions">
            <WorldClock />
          </div>
        </header>

        {/* Content View */}
        <div className="content-view">
          {activeTab === 'Compose' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <AssemblerTab
                groups={data.groups}
                contacts={data.contacts}
                selectedGroups={selectedGroups}
                manualAdds={manualAdds}
                manualRemoves={manualRemoves}
                onToggleGroup={handleToggleGroup}
                onAddManual={handleAddManual}
                onRemoveManual={handleRemoveManual}
                onUndoRemove={handleUndoRemove}
                onResetManual={handleReset}
              />
            </div>
          )}
          {activeTab === 'People' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <Suspense fallback={<TabFallback />}>
                <DirectoryTab
                  contacts={data.contacts}
                  groups={data.groups}
                  onAddToAssembler={handleAddToAssembler}
                />
              </Suspense>
            </div>
          )}
          {activeTab === 'Weather' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <Suspense fallback={<TabFallback />}>
                <WeatherTab
                  weather={weatherData}
                  alerts={weatherAlerts}
                  location={weatherLocation}
                  loading={weatherLoading}
                  onLocationChange={setWeatherLocation}
                  onManualRefresh={(lat: number, lon: number) => fetchWeather(lat, lon)}
                />
              </Suspense>
            </div>
          )}
          {activeTab === 'Servers' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <Suspense fallback={<TabFallback />}>
                <ServersTab
                  servers={data.servers}
                  contacts={data.contacts}
                />
              </Suspense>
            </div>
          )}
          {activeTab === 'Reports' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <Suspense fallback={<TabFallback />}>
                <MetricsTab />
              </Suspense>
            </div>
          )}
          {activeTab === 'Radar' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <Suspense fallback={<TabFallback />}>
                <RadarTab />
              </Suspense>
            </div>
          )}
        </div>
      </main>

      {/* Window Controls - Top Right */}
      <div className="window-controls-container">
        <WindowControls />
      </div>

      <Suspense fallback={null}>
        {settingsOpen && (
          <SettingsModal
            isOpen={settingsOpen}
            onClose={() => setSettingsOpen(false)}
            isSyncing={isReloading}
            onSync={handleSync}
            onImportGroups={handleImportGroups}
            onImportContacts={handleImportContacts}
            onImportServers={handleImportServers}
          />
        )}
      </Suspense>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <MainApp />
      </ToastProvider>
    </ErrorBoundary>
  );
}
