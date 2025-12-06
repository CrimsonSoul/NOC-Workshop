import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TactileButton } from './components/TactileButton';
import { SettingsMenu } from './components/SettingsMenu';
import { AssemblerTab } from './tabs/AssemblerTab';
import { DirectoryTab } from './tabs/DirectoryTab';
import { RadarTab } from './tabs/RadarTab';
import { AppData, Contact } from '@shared/ipc';

const MinimalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (tz: string) => {
    return time.toLocaleTimeString('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return (
    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ color: 'var(--text-primary)' }}>{formatTime('America/New_York')}</span>
        <span style={{ fontSize: '10px' }}>NYC</span>
      </div>
      <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{formatTime('America/Chicago')}</span>
        <span style={{ color: 'var(--accent-primary)', fontSize: '10px' }}>CHI</span>
      </div>
      <div style={{ width: '1px', height: '24px', background: 'var(--color-border)' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
        <span style={{ color: 'var(--text-primary)' }}>{formatTime('America/Los_Angeles')}</span>
        <span style={{ fontSize: '10px' }}>LAX</span>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'Assembler' | 'Directory' | 'Radar'>('Assembler');
  const [data, setData] = useState<AppData>({ groups: {}, contacts: [], lastUpdated: 0 });
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualAdds, setManualAdds] = useState<string[]>([]);
  const [manualRemoves, setManualRemoves] = useState<string[]>([]);
  const [isReloading, setIsReloading] = useState(false);
  const reloadStartRef = useRef<number | null>(null);
  const reloadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isReloadingRef = useRef(isReloading);

  useEffect(() => {
    isReloadingRef.current = isReloading;
  }, [isReloading]);

  const settleReloadIndicator = useCallback(() => {
    if (!reloadStartRef.current) {
      setIsReloading(false);
      return;
    }

    const elapsed = performance.now() - reloadStartRef.current;
    const delay = Math.max(900 - elapsed, 0);

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    reloadTimeoutRef.current = setTimeout(() => {
      setIsReloading(false);
      reloadStartRef.current = null;
      reloadTimeoutRef.current = null;
    }, delay);
  }, []);

  const handleOpenGroupsFile = () => window.api?.openGroupsFile();
  const handleOpenContactsFile = () => window.api?.openContactsFile();
  const handleImportGroups = async () => await window.api?.importGroupsFile();
  const handleImportContacts = async () => await window.api?.importContactsFile();

  useEffect(() => {
    if (!window.api) return;

    window.api.subscribeToData((newData) => {
      setData(newData);
      if (isReloadingRef.current) {
        settleReloadIndicator();
      }
    });

    window.api.onReloadStart(() => {
      reloadStartRef.current = performance.now();
      setIsReloading(true);
    });

    window.api.onReloadComplete(() => {
      if (isReloadingRef.current) {
        settleReloadIndicator();
      }
    });

    return () => {
      if (reloadTimeoutRef.current) clearTimeout(reloadTimeoutRef.current);
    };
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

  const handleRefresh = async () => {
    if (!window.api) return;
    try {
      await window.api.reloadData();
    } catch (error) {
      console.error('Failed to refresh data', error);
      setIsReloading(false);
      reloadStartRef.current = null;
    }
  };

  return (
    <div className="app-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'radial-gradient(circle at 50% -20%, #1a202c 0%, var(--color-obsidian) 50%)' }}>

      {/* Modern Header */}
      <header style={{
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--color-border)',
        backdropFilter: 'blur(10px)',
        background: 'rgba(5, 5, 5, 0.4)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--text-primary)' }}>
            NOC WORKSHOP
          </div>

          <div className="tab-strip">
            {(['Assembler', 'Directory', 'Radar'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-button ${activeTab === tab ? 'is-active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <MinimalClock />
          <div style={{ width: '1px', height: '16px', background: 'var(--color-border)' }} />
          <div style={{ display: 'flex', gap: '8px' }}>
            <TactileButton
              onClick={handleRefresh}
              variant="secondary"
              active={isReloading}
              disabled={isReloading}
              className={isReloading ? 'pulse-glow-effect' : ''}
              style={{ minWidth: '100px' }}
            >
              {isReloading && <span className="button-spinner" />}
              {isReloading ? 'Syncing' : 'Sync Data'}
            </TactileButton>
            <SettingsMenu
              onOpenGroups={handleOpenGroupsFile}
              onOpenContacts={handleOpenContactsFile}
              onImportGroups={handleImportGroups}
              onImportContacts={handleImportContacts}
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflow: 'hidden', padding: '24px', position: 'relative' }}>
        <div className="animate-enter" style={{ height: '100%' }}>
          {activeTab === 'Assembler' && (
            <AssemblerTab
              groups={data.groups}
              selectedGroups={selectedGroups}
              manualAdds={manualAdds}
              manualRemoves={manualRemoves}
              onToggleGroup={(g, active) => { if (active) setSelectedGroups(p => [...p, g]); else setSelectedGroups(p => p.filter(x => x !== g)); }}
              onAddManual={(email) => setManualAdds(p => [...p, email])}
              onRemoveManual={(email) => setManualRemoves(p => [...p, email])}
              onUndoRemove={handleUndoRemove}
              onResetManual={handleReset}
            />
          )}
          {activeTab === 'Directory' && (
            <DirectoryTab
              contacts={data.contacts}
              onAddToAssembler={handleAddToAssembler}
            />
          )}
          {activeTab === 'Radar' && <RadarTab />}
        </div>
      </main>
    </div>
  );
}
