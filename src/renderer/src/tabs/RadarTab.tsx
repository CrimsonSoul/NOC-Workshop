import React, { useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import { TactileButton } from '../components';

export const RadarTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const webviewRef = useRef<WebviewTag>(null);

  const handleRefresh = () => {
    webviewRef.current?.reloadIgnoringCache();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <div style={{
          background: '#000',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 20px #000',
          padding: '2px',
          position: 'relative',
          overflow: 'hidden',
          height: '100%'
        }}>
          {/* Screen Glare / Vignette */}
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: '6px'
          }} />

          <webview
            ref={webviewRef}
            src={url}
            allowpopups
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              borderRadius: '6px',
              filter: 'contrast(1.1) saturate(0.9)'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <TactileButton variant="primary" onClick={handleRefresh}>
          Refresh Radar
        </TactileButton>
      </div>
    </div>
  );
};
