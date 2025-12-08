import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';

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
    <Modal isOpen={isOpen} onClose={onClose} title="Settings" width="400px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
            onClick={onSync}
            className="tactile-button"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                justifyContent: 'center',
                borderColor: isSyncing ? 'var(--color-accent-blue)' : 'var(--border-subtle)',
                color: isSyncing ? 'var(--color-accent-blue)' : 'var(--color-text-primary)'
            }}
            >
            {isSyncing ? (
                <>
                    <span style={{ width: '12px', height: '12px', border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    Syncing...
                </>
            ) : 'Sync Data'}
            </button>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

            <button className="tactile-button" onClick={onImportGroups}>Import Groups...</button>
            <button className="tactile-button" onClick={onImportContacts}>Import Contacts...</button>

            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '8px 0' }} />

            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '4px' }}>Data Storage</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '8px', wordBreak: 'break-all', fontFamily: 'var(--font-family-mono)' }}>
                <DataPathDisplay key={pathKey} />
            </div>

            <button className="tactile-button" onClick={handleChangeFolder}>Change Folder...</button>
            <button className="tactile-button" onClick={handleResetFolder}>Reset to Default</button>
        </div>
    </Modal>
  );
};
