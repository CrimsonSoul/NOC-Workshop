import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { SettingsMenu } from './components/SettingsMenu';
import { AssemblerTab } from './tabs/AssemblerTab';
import { DirectoryTab } from './tabs/DirectoryTab';
import { RadarTab } from './tabs/RadarTab';
import { BrainTab } from './tabs/BrainTab';
import { AppData, Contact } from '@shared/ipc';

type Tab = 'Studio' | 'Network' | 'Vault' | 'Pulse';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Studio');
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

  const handleOpenGroupsFile = () => window.api?.openGroupsFile();
  const handleOpenContactsFile = () => window.api?.openContactsFile();
  const handleImportGroups = async () => await window.api?.importGroupsFile();
  const handleImportContacts = async () => await window.api?.importContactsFile();

  useEffect(() => {
    if (!window.api) return;
    window.api.subscribeToData((newData) => {
      setData(newData);
      if (isReloadingRef.current) settleReloadIndicator();
    });
    window.api.onReloadStart(() => {
      reloadStartRef.current = performance.now();
      setIsReloading(true);
    });
    window.api.onReloadComplete(() => {
      if (isReloadingRef.current) settleReloadIndicator();
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

  // Logic to show settings menu.
  // The Sidebar has a settings button. We can either show a modal or a popover.
  // The existing SettingsMenu is a button that opens a dropdown.
  // We can render it invisible but triggered, or refactor it.
  // For now, let's keep it simple: clicking settings in sidebar triggers the native menu actions directly or opens a simple modal.
  // Actually, let's just use the SettingsMenu component but trigger it programmatically or place it in the sidebar?
  // The Sidebar component has a `onOpenSettings`.
  // Let's make a simple state for "Settings Open".
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{
      display: 'flex',
      width: '100vw',
      height: '100vh',
      background: 'var(--color-bg-app)',
      color: 'var(--color-text-primary)',
      overflow: 'hidden'
    }}>
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      {/* Main Content Area */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Breadcrumb / Header Area */}
        <header style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          borderBottom: 'var(--border-subtle)',
          flexShrink: 0
        }}>
           <div style={{ display: 'flex', flexDirection: 'column' }}>
             <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
               Workspace / {activeTab}
             </span>
             <span style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
               {activeTab === 'Studio' && 'Data Composition'}
               {activeTab === 'Network' && 'Contact Directory'}
               {activeTab === 'Vault' && 'Knowledge Base'}
               {activeTab === 'Pulse' && 'Signal Monitor'}
             </span>
           </div>

           {/* Actions Area */}
           <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {isReloading && (
                <span style={{ fontSize: '12px', color: 'var(--color-accent-blue)', fontWeight: 500 }}>
                  Syncing...
                </span>
              )}
           </div>
        </header>

        {/* Content View */}
        <div style={{
          flex: 1,
          padding: '24px 32px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}>
          {activeTab === 'Studio' && (
            <div className="animate-fade-in">
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
            </div>
          )}
          {activeTab === 'Network' && (
             <div className="animate-fade-in" style={{ height: '100%' }}>
              <DirectoryTab
                contacts={data.contacts}
                onAddToAssembler={handleAddToAssembler}
              />
            </div>
          )}
          {activeTab === 'Vault' && (
             <div className="animate-fade-in">
               <BrainTab />
             </div>
          )}
          {activeTab === 'Pulse' && (
            <div className="animate-fade-in" style={{ height: '100%' }}>
              <RadarTab />
            </div>
          )}
        </div>
      </main>

      {/* Hidden Settings Menu (Triggered via state or ref) - Quick hack to reuse logic */}
      {settingsOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }} onClick={() => setSettingsOpen(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--color-bg-card)',
            border: 'var(--border-subtle)',
            borderRadius: '12px',
            padding: '24px',
            minWidth: '300px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '16px' }}>Settings</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="tactile-button" onClick={handleOpenGroupsFile}>Open Groups CSV</button>
              <button className="tactile-button" onClick={handleOpenContactsFile}>Open Contacts CSV</button>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />
              <button className="tactile-button" onClick={handleImportGroups}>Import Groups...</button>
              <button className="tactile-button" onClick={handleImportContacts}>Import Contacts...</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
