import React, { useState } from 'react';
import { Panel, TactileButton } from '../components';

export const RadarTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const [key, setKey] = useState(0);

  const handleRefresh = () => setKey(k => k + 1);

  const handleAuthTest = () => {
    // Navigate to a site that forces basic auth
    setUrl('https://httpbin.org/basic-auth/user/passwd');
    handleRefresh();
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{
        flex: 1,
        background: '#000',
        borderRadius: '8px',
        boxShadow: 'inset 0 0 20px #000',
        padding: '2px', // bezel
        position: 'relative',
        overflow: 'hidden'
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

        <iframe
          key={key}
          src={url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '6px',
            filter: 'contrast(1.1) saturate(0.9)'
          }}
          onError={() => alert('Signal Lost')} // iframe onError is tricky, usually handled by checking load state
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
        <TactileButton variant="secondary" onClick={handleAuthTest}>
          Simulate Auth Challenge
        </TactileButton>
        <TactileButton variant="primary" onClick={handleRefresh}>
          Refresh Feed
        </TactileButton>
      </div>
    </div>
  );
};
