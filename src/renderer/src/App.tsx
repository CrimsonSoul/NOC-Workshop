import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { Sidebar } from './components/Sidebar';
import { WorldClock } from './components/WorldClock';
import { AssemblerTab } from './tabs/AssemblerTab';
import { WindowControls } from './components/WindowControls';
import { ToastProvider } from './components/Toast';
import { AppData, Contact } from '@shared/ipc';
import { TabFallback } from './components/TabFallback';
import './styles.css';

// Lazy load non-default tabs and settings modal to optimize initial bundle size
const DirectoryTab = lazy(() => import('./tabs/DirectoryTab').then(m => ({ default: m.DirectoryTab })));
const ServersTab = lazy(() => import('./tabs/ServersTab').then(m => ({ default: m.ServersTab })));
const RadarTab = lazy(() => import('./tabs/RadarTab').then(m => ({ default: m.RadarTab })));
const MetricsTab = lazy(() => import('./tabs/MetricsTab').then(m => ({ default: m.MetricsTab })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));

type Tab = 'Compose' | 'People' | 'Servers' | 'Reports' | 'Live';

export function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('Compose');
  const [data, setData] = useState<AppData>({ groups: {}, contacts: [], servers: [], lastUpdated: 0 });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualAdds, setManualAdds] = useState<string[]>([]);
  const [manualRemoves, setManualRemoves] = useState<string[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const reloadStartRef = useRef<number | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReloadingRef = useRef(isReloading);

  // Sync ref
  useEffect(() => { isReloadingRef.current = isReloading; }, [isReloading]);

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
    return () => { if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current); };
  }, [settleReloadIndicator]);

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
               {activeTab === 'Live' && 'Dispatcher Radar'}
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
          {activeTab === 'Live' && (
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
        <ToastProvider>
            <MainApp />
        </ToastProvider>
    );
}
