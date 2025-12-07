import React, { useRef, useState } from 'react';
import type { WebviewTag } from 'electron';

export const LiveTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const webviewRef = useRef<WebviewTag>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = () => {
    setIsLoading(true);
    webviewRef.current?.reloadIgnoringCache();
  };

  const handleLoadStop = () => {
    setIsLoading(false);
  };

  return (
    <div className="glass-panel" style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--color-bg-card)',
      border: 'var(--border-subtle)'
    }}>

      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <div style={{
             width: '8px',
             height: '8px',
             borderRadius: '50%',
             background: 'var(--color-accent-green)',
             boxShadow: '0 0 8px var(--color-accent-green)'
           }} />
           <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Live Signal</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-family-mono)' }}>
            SOURCE: INTRANET
          </span>
          <button
            onClick={handleRefresh}
            style={{
              background: 'transparent',
              border: 'var(--border-subtle)',
              borderRadius: '6px',
              padding: '6px 12px',
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
             <svg
               width="12"
               height="12"
               viewBox="0 0 24 24"
               fill="none"
               stroke="currentColor"
               strokeWidth="2"
               strokeLinecap="round"
               strokeLinejoin="round"
               className={isLoading ? 'spin' : ''}
               style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }}
             >
               <path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
             </svg>
             {isLoading ? 'Refreshing' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Webview Container */}
      <div style={{ flex: 1, position: 'relative', background: '#000' }}>
        <webview
          ref={webviewRef}
          src={url}
          allowpopups="true"
          onDidStopLoading={handleLoadStop}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white' // Webviews often assume white bg
          }}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
