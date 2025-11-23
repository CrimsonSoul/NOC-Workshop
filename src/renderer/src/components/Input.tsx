import React from 'react';

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Input: React.FC<Props> = ({ label, style, ...props }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
      {label && (
        <label style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase'
        }}>
          {label}
        </label>
      )}
      <input
        style={{
          background: '#111',
          border: '1px solid #333',
          padding: '8px 12px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          ...style
        }}
        {...props}
      />
    </div>
  );
};
