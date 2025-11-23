import React, { useState, useEffect } from 'react';
import { TactileButton } from './components/TactileButton';
import { AssemblerTab } from './tabs/AssemblerTab';
import { DirectoryTab } from './tabs/DirectoryTab';
import { RadarTab } from './tabs/RadarTab';
import { AuthModal } from './components/AuthModal';
import { AppData, Contact, GroupMap, AuthRequest } from '@shared/ipc';

// -- Header Components --
const RotatingCode = () => {
  const [code, setCode] = useState('000000');

  useEffect(() => {
    const interval = setInterval(() => {
      // Logic: crypto.getRandomValues
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      const newCode = (array[0] % 1000000).toString().padStart(6, '0');
      setCode(newCode);
    }, 2000); // Rotate every 2s

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '24px',
      color: 'var(--accent-primary)',
      background: '#111',
      padding: '4px 12px',
      border: '1px solid #333',
      letterSpacing: '0.1em',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      height: '40px'
    }}>
      {code.split('').map((char, i) => (
        <span key={i} style={{ display: 'inline-block', width: '1ch', textAlign: 'center' }}>{char}</span>
      ))}
    </div>
  );
};

const OfflineClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ textAlign: 'right', lineHeight: '1.2' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', color: 'var(--text-primary)' }}>
        {time.toLocaleTimeString([], { hour12: false })}
      </div>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '12px', color: 'var(--text-secondary)' }}>
        {time.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>
    </div>
  );
};

// -- Main App --
export default function App() {
  const [activeTab, setActiveTab] = useState<'Assembler' | 'Directory' | 'Radar'>('Assembler');
  const [data, setData] = useState<AppData>({ groups: {}, contacts: [], lastUpdated: 0 });
  const [authRequest, setAuthRequest] = useState<AuthRequest | null>(null);

  // Global State for "The Set" (Assembler)
  // We lift this up so Directory can add to it.
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [manualAdds, setManualAdds] = useState<string[]>([]);
  const [manualRemoves, setManualRemoves] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to Data
    window.api.subscribeToData((newData) => {
      console.log('Renderer received data:', newData);
      setData(newData);
    });

    // Subscribe to Auth
    window.api.onAuthRequested((req) => {
      setAuthRequest(req);
    });
  }, []);

  const handleAddToAssembler = (contact: Contact) => {
    if (!manualAdds.includes(contact.email)) {
      setManualAdds(prev => [...prev, contact.email]);
    }
  };

  return (
    <div className="app-shell" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        height: '80px',
        background: 'var(--bg-app)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        position: 'relative'
      }}>
        {/* Left: Branding */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em'
          }}>
            OPERATOR’S<br />ATELIER
          </div>
        </div>

        {/* Center: Rotating Code */}
        <RotatingCode />

        {/* Right: Clock */}
        <OfflineClock />

        {/* Progress Bar (Visual only) */}
        <div className="progress-line" style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: '2px',
          background: 'var(--accent-primary)',
          width: '100%',
          animation: 'progress 10s linear infinite'
        }} />
      </header>

      {/* Tabs / Mode Selector */}
      <div style={{
        padding: '24px 32px 0',
        display: 'flex',
        gap: '4px',
        borderBottom: '1px solid rgba(255,255,255,0.05)'
      }}>
        {(['Assembler', 'Directory', 'Radar'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 24px',
              background: activeTab === tab ? 'var(--bg-panel)' : 'transparent',
              border: activeTab === tab ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              borderBottom: 'none',
              borderRadius: '4px 4px 0 0',
              color: activeTab === tab ? 'var(--accent-primary)' : 'var(--text-secondary)',
              fontFamily: 'var(--font-serif)',
              fontSize: '16px',
              position: 'relative',
              top: '1px',
              transition: 'all 0.2s ease'
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <main style={{ flex: 1, overflow: 'hidden', padding: '24px 32px', position: 'relative' }}>
        {activeTab === 'Assembler' && (
          <AssemblerTab
            groups={data.groups}
            selectedGroups={selectedGroups}
            manualAdds={manualAdds}
            manualRemoves={manualRemoves}
            onToggleGroup={(g, active) => {
              if (active) setSelectedGroups(p => [...p, g]);
              else setSelectedGroups(p => p.filter(x => x !== g));
            }}
            onAddManual={(email) => setManualAdds(p => [...p, email])}
            onRemoveManual={(email) => setManualRemoves(p => [...p, email])}
            onResetManual={() => {
              setManualRemoves([]);
              setManualAdds([]); // Maybe? Prompt says "clears on Reset"
            }}
          />
        )}

        {activeTab === 'Directory' && (
          <DirectoryTab
            contacts={data.contacts}
            onAddToAssembler={handleAddToAssembler}
          />
        )}

        {activeTab === 'Radar' && (
          <RadarTab />
        )}
      </main>

      {/* Auth Modal Overlay */}
      {authRequest && (
        <AuthModal
          request={authRequest}
          onClose={() => {
            window.api.cancelAuth();
            setAuthRequest(null);
          }}
          onSubmit={(u, p) => {
            window.api.submitAuth(u, p);
            setAuthRequest(null);
          }}
        />
      )}

      <style>{`
        @keyframes progress {
          0% { width: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
