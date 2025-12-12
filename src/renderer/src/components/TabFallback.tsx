
import React from 'react';

export const TabFallback = () => (
  <div style={{
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--color-text-tertiary)',
    fontSize: '13px'
  }}>
    <div className="spin" style={{
        width: '24px',
        height: '24px',
        border: '2px solid var(--color-border)',
        borderTopColor: 'var(--color-accent-blue)',
        borderRadius: '50%'
    }} />
    <style>{`
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `}</style>
  </div>
);
