import React, { useState, useRef, useEffect } from 'react';
import { TactileButton } from './TactileButton';

type SettingsMenuProps = {
  onOpenGroups: () => void;
  onOpenContacts: () => void;
  onImportGroups: () => void;
  onImportContacts: () => void;
};

export const SettingsMenu = ({
  onOpenGroups,
  onOpenContacts,
  onImportGroups,
  onImportContacts
}: SettingsMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="settings-menu-container" ref={menuRef} style={{ position: 'relative' }}>
      <TactileButton
        onClick={() => setIsOpen(!isOpen)}
        variant="secondary"
        className={`toolbar-button ${isOpen ? 'is-active' : ''}`}
        style={{ padding: '10px 14px', fontSize: '12px' }}
      >
        Settings
      </TactileButton>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '240px',
          background: '#1a1d24',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '4px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          <div style={{ padding: '8px 0' }}>
            <div style={{
              padding: '8px 16px 4px',
              fontSize: '10px',
              fontFamily: 'var(--font-serif)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Groups
            </div>
            <button
              className="menu-item"
              onClick={() => handleAction(onOpenGroups)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Open File
            </button>
            <button
              className="menu-item"
              onClick={() => handleAction(onImportGroups)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Import File...
            </button>

            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

            <div style={{
              padding: '4px 16px 4px',
              fontSize: '10px',
              fontFamily: 'var(--font-serif)',
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Contacts
            </div>
            <button
              className="menu-item"
              onClick={() => handleAction(onOpenContacts)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Open File
            </button>
            <button
              className="menu-item"
              onClick={() => handleAction(onImportContacts)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 16px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              Import File...
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
