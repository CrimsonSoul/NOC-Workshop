import React from 'react';

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  icon?: React.ReactNode;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ style, icon, className, ...props }, ref) => {
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {icon && (
        <div style={{
          position: 'absolute',
          left: '10px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--color-text-tertiary)',
          pointerEvents: 'none',
          display: 'flex',
          alignItems: 'center'
        }}>
          {icon}
        </div>
      )}
      <input
        ref={ref}
        style={{
          width: '100%',
          background: 'var(--color-bg-surface)', // Slightly lighter than app bg for inputs
          border: '1px solid var(--border-subtle)',
          borderRadius: '6px',
          padding: '8px 12px',
          paddingLeft: icon ? '32px' : '12px',
          fontSize: '13px',
          color: 'var(--color-text-primary)',
          outline: 'none',
          fontFamily: 'var(--font-family-base)',
          transition: 'all 0.15s ease',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
          ...style
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
          e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-accent-blue-dim)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-subtle)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
          props.onBlur?.(e);
        }}
        {...props}
      />
    </div>
  );
});

Input.displayName = 'Input';
