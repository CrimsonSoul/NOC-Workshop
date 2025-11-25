import React, { useState, useEffect, useRef, useCallback } from 'react';
import { TactileButton } from './components/TactileButton';
import { AssemblerTab } from './tabs/AssemblerTab';
import { DirectoryTab } from './tabs/DirectoryTab';
import { RadarTab } from './tabs/RadarTab';
import { AuthModal } from './components/AuthModal';
import { AppData, Contact, AuthRequest } from '@shared/ipc';

const WorldClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (tz: string) => {
    return time.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '12px', textAlign: 'right' }}>
        {[
          { label: 'PT', tz: 'America/Los_Angeles' },
          { label: 'MT', tz: 'America/Denver' },
          { label: 'ET', tz: 'America/New_York' }
        ].map(({ label, tz }) => (
          <div key={label}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)' }}>{formatTime(tz)}</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>{label}</div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'right', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '24px', color: 'var(--text-primary)', lineHeight: 1 }}>{formatTime('America/Chicago')}</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '4px' }}>CENTRAL</div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'Assembler' | 'Directory' | 'Radar'>('Assembler');
  const [data, setData] = useState<AppData>({ groups: {}, contacts: [], lastUpdated: 0 });
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);
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

  const handleOpenGroupsFile = () => {
    window.api?.openGroupsFile();
  };

  const handleOpenContactsFile = () => {
    window.api?.openContactsFile();
  };

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

    window.api.onAuthRequested((req) => {
      setAuthRequest(req);
    });
    return () => {
      if (glowTimeout.current) {
        clearTimeout(glowTimeout.current);
      }
      if (reloadTimeoutRef.current) {
        clearTimeout(reloadTimeoutRef.current);
      }
    };
  }, [settleReloadIndicator]);

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Awaiting sync';
    const date = new Date(lastUpdated);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

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
    <div className="app-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ height: '80px', background: 'var(--bg-app)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            NOC<br />WORKSHOP
          </div>
        </div>
        <WorldClock />
      </header>

      <div style={{ background: '#1a1d24', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', padding: '0 24px', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
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

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <TactileButton
            className="toolbar-button"
            variant="secondary"
            onClick={handleOpenGroupsFile}
            style={{ padding: '10px 14px', fontSize: '12px' }}
          >
            Open groups file
          </TactileButton>
          <TactileButton
            className="toolbar-button"
            variant="secondary"
            onClick={handleOpenContactsFile}
            style={{ padding: '10px 14px', fontSize: '12px' }}
          >
            Open contacts file
          </TactileButton>
          <TactileButton
            onClick={handleRefresh}
            variant="secondary"
            active={isReloading}
            disabled={isReloading}
            className={`toolbar-button refresh-button ${isReloading ? 'is-reloading' : ''}`}
            style={{ padding: '10px 14px', fontSize: '12px' }}
          >
            {isReloading && (
              <span className="button-spinner" aria-hidden />
            )}
            {isReloading ? 'Refreshing...' : 'Refresh data'}
          </TactileButton>
        </div>
      </div>

      <main style={{ flex: 1, overflow: 'hidden', padding: '24px', position: 'relative' }}>
        {activeTab === 'Assembler' && (
          <AssemblerTab groups={data.groups} selectedGroups={selectedGroups} manualAdds={manualAdds} manualRemoves={manualRemoves}
            onToggleGroup={(g, active) => { if (active) setSelectedGroups(p => [...p, g]); else setSelectedGroups(p => p.filter(x => x !== g)); }}
            onAddManual={(email) => setManualAdds(p => [...p, email])}
            onRemoveManual={(email) => setManualRemoves(p => [...p, email])}
            onUndoRemove={handleUndoRemove}
            onResetManual={handleReset}
          />
        )}
        {activeTab === 'Directory' && <DirectoryTab contacts={data.contacts} onAddToAssembler={handleAddToAssembler} />}
        {activeTab === 'Radar' && <RadarTab />}
      </main>

      {authRequest && (
        <AuthModal request={authRequest}
          onClose={() => { window.api.cancelAuth(); setAuthRequest(null); }}
          onSubmit={(u, p) => { window.api.submitAuth(u, p); setAuthRequest(null); }}
        />
      )}

    </div>
  );
}
