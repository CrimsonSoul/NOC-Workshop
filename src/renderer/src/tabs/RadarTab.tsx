import React, { useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import { ToolbarButton } from '../components/ToolbarButton';
import { CollapsibleHeader } from '../components/CollapsibleHeader';

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
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px 24px 24px',
      background: 'var(--color-bg-app)',
      overflow: 'hidden'
    }}>

      {/* Header */}
      <CollapsibleHeader
        title="Dispatcher Radar"
        subtitle="Live CW intra-web monitoring"
        isCollapsed={true}
      >
        <ToolbarButton
          onClick={handleRefresh}
          label={isLoading ? 'REFRESHING' : 'REFRESH'}
          style={{ padding: '8px 16px', fontSize: '11px' }}
          icon={
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
              <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          }
        />
      </CollapsibleHeader>

      {/* Webview Container - Full Bleed */}
      <div style={{
        flex: 1,
        position: 'relative',
        background: 'black',
        overflow: 'hidden',
        borderRadius: '12px',
        border: 'var(--border-subtle)'
      }}>
        <webview
          ref={webviewRef}
          src={url}
          onDidStopLoading={handleLoadStop}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            background: 'white'
          }}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};
