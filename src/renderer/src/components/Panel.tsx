import React from 'react';

type Props = {
  title?: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export const Panel: React.FC<Props> = ({ title, children, className = '', style }) => {
  return (
    <div
      className={className}
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid rgba(255,255,255,0.05)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        ...style
      }}
    >
      {title && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          fontFamily: 'var(--font-serif)',
          fontSize: '18px',
          color: 'var(--accent-primary)',
          letterSpacing: '0.02em'
        }}>
          {title}
        </div>
      )}
      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {children}
      </div>
    </div>
  );
};
