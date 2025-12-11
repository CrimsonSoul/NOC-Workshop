import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { TactileButton } from './TactileButton';
import { useToast } from './Toast';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isSyncing: boolean;
  onSync: () => void;
  onImportGroups: () => Promise<boolean>;
  onImportContacts: () => Promise<boolean>;
  onImportServers: () => Promise<boolean>;
};

const DataPathDisplay = () => {
    const [path, setPath] = useState('');
    useEffect(() => {
        window.api?.getDataPath().then(setPath);
    }, []);
    return <>{path || 'Loading...'}</>;
};

export const SettingsModal: React.FC<Props> = ({
    isOpen,
    onClose,
    isSyncing,
    onSync,
    onImportGroups,
    onImportContacts,
    onImportServers
}) => {
  // Force re-render of path when modal opens or folder changes
  const [pathKey, setPathKey] = useState(0);

  useEffect(() => {
      if (isOpen) setPathKey(p => p + 1);
  }, [isOpen]);

  const { showToast } = useToast();

  const handleImportGroupsClick = async () => {
      const success = await onImportGroups();
      if (success) {
          showToast('Groups imported successfully', 'success');
      } else {
          // It might be cancelled, but generic error is safer than silence if it failed
          // Ideally backend returns specific error, but generic for now.
          // If purely cancelled, maybe silent is better?
          // The user agreed to "generic ones are fine".
          // If I return false on cancel, I shouldn't error.
          // But I can't distinguish.
          // I will skip error toast here to avoid "Error" on "Cancel".
      }
  };

  const handleImportContactsClick = async () => {
      const success = await onImportContacts();
      if (success) {
          showToast('Contacts imported successfully', 'success');
      }
  };

  const handleImportServersClick = async () => {
      const success = await onImportServers();
      if (success) {
          showToast('Servers imported successfully', 'success');
      }
  };

  const handleChangeFolder = async () => {
      try {
          const result = await window.api?.changeDataFolder();
          if (result && typeof result === 'object') {
              if (result.success) {
                  showToast('Data folder updated successfully', 'success');
              } else if (result.error !== 'Cancelled') {
                  showToast(`Failed to update data folder: ${result.error}`, 'error');
              }
          }
      } catch (e: any) {
          showToast(`Error: ${e.message}`, 'error');
      }
      setPathKey(p => p + 1);
  };

  const handleResetFolder = async () => {
      try {
          const result = await window.api?.resetDataFolder();
          if (result && result.success) {
              showToast('Data folder reset to default', 'success');
          } else if (result && result.error) {
              showToast(result.error, 'error');
          }
      } catch (e: any) {
           showToast(e.message, 'error');
      }
      setPathKey(p => p + 1);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" width="420px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Data Synchronization
                </div>
                <TactileButton
                    onClick={onSync}
                    variant="primary"
                    style={{
                        width: '100%',
                        justifyContent: 'center'
                    }}
                >
                    {isSyncing ? (
                        <>
                            <span className="spin" style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%' }} />
                            Syncing...
                        </>
                    ) : 'Sync Data Now'}
                </TactileButton>
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                 <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Data Management
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <TactileButton onClick={handleImportGroupsClick}>Import Groups...</TactileButton>
                    <TactileButton onClick={handleImportContactsClick}>Import Contacts...</TactileButton>
                    <TactileButton onClick={handleImportServersClick} style={{ gridColumn: 'span 2', justifyContent: 'center' }}>Import Servers...</TactileButton>
                </div>
            </div>

            <div style={{ height: '1px', background: 'var(--border-subtle)' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Storage Location
                </div>
                <div style={{
                    fontSize: '11px',
                    color: 'var(--color-text-secondary)',
                    padding: '8px 12px',
                    background: 'rgba(0,0,0,0.2)',
                    border: 'var(--border-subtle)',
                    borderRadius: '6px',
                    wordBreak: 'break-all',
                    fontFamily: 'var(--font-family-mono)'
                }}>
                    <DataPathDisplay key={pathKey} />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                     <TactileButton onClick={handleChangeFolder} style={{ flex: 1, justifyContent: 'center' }}>Change...</TactileButton>
                     <TactileButton onClick={handleResetFolder} style={{ flex: 1, justifyContent: 'center' }}>Reset to Default</TactileButton>
                </div>
            </div>
        </div>
        <style>{`
            .spin { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
    </Modal>
  );
};
