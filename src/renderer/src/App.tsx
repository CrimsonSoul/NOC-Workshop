import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsMenu } from './components/SettingsMenu';
import { SettingsModal } from './components/SettingsModal';
import { WorldClock } from './components/WorldClock';
import { AssemblerTab } from './tabs/AssemblerTab';
import { DirectoryTab } from './tabs/DirectoryTab';
import { RadarTab } from './tabs/RadarTab';
import { MetricsTab } from './tabs/MetricsTab';
import { WindowControls } from './components/WindowControls';
import { ToastProvider } from './components/Toast';
import { AppData, Contact } from '@shared/ipc';
import './styles.css';

type Tab = 'Compose' | 'People' | 'Reports' | 'Live';

export function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('Compose');
  const [data, setData] = useState<AppData>({ groups: {}, contacts: [], lastUpdated: 0 });
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

  const handleImportGroups = async () => await window.api?.importGroupsFile();
  const handleImportContacts = async () => await window.api?.importContactsFile();

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

  const handleAddToAssembler = (contact: Contact) => {
    setManualRemoves(prev => prev.filter(e => e !== contact.email));
    setManualAdds(prev => prev.includes(contact.email) ? prev : [...prev, contact.email]);
  };

  const handleUndoRemove = () => {
    setManualRemoves(prev => {
      const newRemoves = [...prev];
      newRemoves.pop();
      return newRemoves;
    });
  };

  const handleReset = () => {
    setSelectedGroups([]);
    setManualAdds([]);
    setManualRemoves([]);
  };

  const handleSync = async () => {
    if (isReloading) return;
    await window.api?.reloadData();
  };

  // Logic to show settings menu.
  const [settingsOpen, setSettingsOpen] = useState(false);

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
            <div className="animate-fade-in">
              <AssemblerTab
                groups={data.groups}
                contacts={data.contacts}
                selectedGroups={selectedGroups}
                manualAdds={manualAdds}
                manualRemoves={manualRemoves}
                onToggleGroup={(g, active) => { if (active) setSelectedGroups(p => [...p, g]); else setSelectedGroups(p => p.filter(x => x !== g)); }}
                onAddManual={(email) => setManualAdds(p => [...p, email])}
                onRemoveManual={(email) => setManualRemoves(p => [...p, email])}
                onUndoRemove={handleUndoRemove}
                onResetManual={handleReset}
              />
            </div>
          )}
          {activeTab === 'People' && (
             <div className="animate-fade-in" style={{ height: '100%' }}>
              <DirectoryTab
                contacts={data.contacts}
                groups={data.groups}
                onAddToAssembler={handleAddToAssembler}
              />
            </div>
          )}
          {activeTab === 'Reports' && (
             <div className="animate-fade-in">
               <MetricsTab />
             </div>
          )}
          {activeTab === 'Live' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <RadarTab />
            </div>
          )}
        </div>
      </main>

      {/* Window Controls - Top Right */}
      <div className="window-controls-container">
          <WindowControls />
      </div>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        isSyncing={isReloading}
        onSync={handleSync}
        onImportGroups={handleImportGroups}
        onImportContacts={handleImportContacts}
      />
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
