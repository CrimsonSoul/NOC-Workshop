import React, { useState } from 'react';

export const WindowControls = () => {
  const [isMaximized, setIsMaximized] = useState(false); // We can't easily track this without more IPC, but for now just toggle intent is fine.
  // Actually, for just the button click, we don't strictly need the state unless we want to change the icon (Restore vs Maximize).
  // Standard practice is to toggle.

  const handleMinimize = () => window.api?.windowMinimize();
  const handleMaximize = () => {
      window.api?.windowMaximize();
      setIsMaximized(!isMaximized);
  };
  const handleClose = () => window.api?.windowClose();

  const btnStyle: React.CSSProperties = {
      width: '46px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: '#9ca3af', // gray-400
      cursor: 'default', // standard for window controls
      transition: 'background 0.2s, color 0.2s',
      WebkitAppRegion: 'no-drag' as any
  };

  return (
    <div style={{
        display: 'flex',
        height: '32px',
        WebkitAppRegion: 'no-drag' as any,
        zIndex: 10000
    }}>
        <button
            onClick={handleMinimize}
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            title="Minimize"
        >
            <svg width="10" height="1" viewBox="0 0 10 1"><path d="M0 0h10v1H0z" fill="currentColor"/></svg>
        </button>
        <button
            onClick={handleMaximize}
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            title="Maximize"
        >
             <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor"/></svg>
        </button>
        <button
            onClick={handleClose}
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = '#E81123'; e.currentTarget.style.color = '#FFF'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9ca3af'; }}
            title="Close"
        >
             <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.05 0L0 1.05 3.95 5 0 8.95 1.05 10 5 6.05 8.95 10 10 8.95 6.05 5 10 1.05 8.95 0 5 3.95z" fill="currentColor"/></svg>
        </button>
    </div>
  );
};
