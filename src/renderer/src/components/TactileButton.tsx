import React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger';
  active?: boolean;
};

export const TactileButton: React.FC<Props> = ({
  children,
  variant = 'primary',
  active = false,
  className = '',
  style,
  ...props
}) => {
  const baseStyles: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '2px',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    fontWeight: 600,
    transition: 'all 0.1s ease-out',
    border: '1px solid transparent',
    position: 'relative',
    top: 0,
    ...style
  };

  const variants = {
    primary: {
      background: active ? 'var(--accent-active)' : 'var(--accent-primary)',
      color: 'var(--bg-app)',
      boxShadow: active
        ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
        : '0 2px 0 rgba(0,0,0,0.5)',
      transform: active ? 'translateY(2px)' : 'translateY(0)',
    },
    secondary: {
      background: 'var(--bg-panel)',
      color: active ? 'var(--accent-primary)' : 'var(--text-secondary)',
      border: `1px solid ${active ? 'var(--accent-primary)' : 'rgba(255,255,255,0.1)'}`,
      boxShadow: active
        ? 'inset 0 1px 2px rgba(0,0,0,0.5)'
        : '0 1px 0 rgba(0,0,0,0.5)',
      transform: active ? 'translateY(1px)' : 'translateY(0)',
    },
    danger: {
      background: 'var(--color-danger)',
      color: '#fff',
      boxShadow: active
        ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
        : '0 2px 0 rgba(0,0,0,0.5)',
    }
  };

  return (
    <button
      style={{ ...baseStyles, ...variants[variant] }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};
