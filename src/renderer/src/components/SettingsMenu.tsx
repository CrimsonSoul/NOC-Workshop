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
        active={isOpen}
      >
        Settings
      </TactileButton>

      {isOpen && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: '200px',
          background: '#0b0d12',
          border: '1px solid var(--color-border)',
          borderRadius: '8px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          zIndex: 100,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{ padding: '4px' }}>
            <div style={{
              padding: '8px 12px 4px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
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
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-glass-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Open File
            </button>
            <button
              className="menu-item"
              onClick={() => handleAction(onImportGroups)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-glass-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Import File...
            </button>

            <div style={{ height: '1px', background: 'var(--color-border)', margin: '4px 8px' }} />

            <div style={{
              padding: '4px 12px 4px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--text-tertiary)',
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
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-glass-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Open File
            </button>
            <button
              className="menu-item"
              onClick={() => handleAction(onImportContacts)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                borderRadius: '4px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-glass-hover)';
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
            >
              Import File...
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
