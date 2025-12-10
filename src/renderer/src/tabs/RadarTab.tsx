import React, { useRef, useState } from 'react';
import type { WebviewTag } from 'electron';

export const RadarTab: React.FC = () => {
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
           <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Live</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={handleRefresh}
            className="tactile-button"
            style={{
               gap: '6px',
               width: 'auto'
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

      {/* Webview Container with Padding */}
      <div style={{ flex: 1, position: 'relative', background: 'transparent', padding: '16px' }}>
        <div style={{
            width: '100%',
            height: '100%',
            borderRadius: '8px',
            overflow: 'hidden',
            border: 'var(--border-subtle)', // Optional: inner border for the webview frame
            background: '#000'
        }}>
            <webview
            ref={webviewRef}
            src={url}
            allowpopups="true"
            onDidStopLoading={handleLoadStop}
            style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: 'white'
            }}
            />
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
