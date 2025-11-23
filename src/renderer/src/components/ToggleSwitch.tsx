import React from 'react';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export const ToggleSwitch: React.FC<Props> = ({ label, checked, onChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 12px',
        background: 'var(--bg-panel)',
        marginBottom: '2px',
        cursor: 'pointer',
        borderLeft: checked ? '4px solid var(--accent-active)' : '4px solid transparent',
        transition: 'all 0.2s ease'
      }}
      onClick={() => onChange(!checked)}
    >
      <span style={{
        fontFamily: 'var(--font-mono)',
        color: checked ? 'var(--text-primary)' : 'var(--text-secondary)',
        fontSize: '13px'
      }}>
        {label}
      </span>

      <div style={{
        width: '32px',
        height: '16px',
        background: checked ? 'var(--accent-active)' : '#333',
        borderRadius: '10px',
        position: 'relative',
        transition: 'background 0.2s'
      }}>
        <div style={{
          position: 'absolute',
          top: '2px',
          left: checked ? '18px' : '2px',
          width: '12px',
          height: '12px',
          background: '#fff',
          borderRadius: '50%',
          transition: 'left 0.2s cubic-bezier(0.4, 0.0, 0.2, 1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.3)'
        }} />
      </div>
    </div>
  );
};
