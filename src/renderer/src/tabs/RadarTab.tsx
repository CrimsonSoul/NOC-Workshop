import React, { useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import { TactileButton } from '../components/TactileButton';

export const RadarTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const webviewRef = useRef<WebviewTag>(null);

  const handleRefresh = () => {
    webviewRef.current?.reloadIgnoringCache();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div className="glass-panel" style={{ flex: 1, minHeight: 0, padding: '4px', overflow: 'hidden', position: 'relative' }}>

        {/* Loading/Empty State Placeholder if needed, but webview covers it */}

        <webview
          ref={webviewRef}
          src={url}
          allowpopups="true"
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            background: '#fff' // Webviews usually need a base bg
          }}
        />

        {/* Overlay for glass effect on edges if desired, but might block interaction.
            Keeping it clean for now.
        */}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
          SOURCE: INTRANET/RADAR
        </div>
        <TactileButton variant="secondary" onClick={handleRefresh}>
          Force Refresh
        </TactileButton>
      </div>
    </div>
  );
};
