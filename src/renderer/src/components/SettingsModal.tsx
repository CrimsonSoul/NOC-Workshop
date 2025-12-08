import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { TactileButton } from './TactileButton';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  isSyncing: boolean;
  onSync: () => void;
  onImportGroups: () => void;
  onImportContacts: () => void;
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
    onImportContacts
}) => {
  // Force re-render of path when modal opens or folder changes
  const [pathKey, setPathKey] = useState(0);

  useEffect(() => {
      if (isOpen) setPathKey(p => p + 1);
  }, [isOpen]);

  const handleChangeFolder = async () => {
      await window.api?.changeDataFolder();
      setPathKey(p => p + 1);
  };

  const handleResetFolder = async () => {
      await window.api?.resetDataFolder();
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
                    <TactileButton onClick={onImportGroups}>Import Groups...</TactileButton>
                    <TactileButton onClick={onImportContacts}>Import Contacts...</TactileButton>
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
