import React, { useEffect, useRef, useState } from 'react';
import type { WebviewTag } from 'electron';
import type { RadarSnapshot } from '@shared/ipc';
import { Panel, TactileButton } from '../components';

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp) return 'Awaiting telemetry...';
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

export const RadarTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const [key, setKey] = useState(0);
  const [telemetry, setTelemetry] = useState<RadarSnapshot | null>(null);
  const webviewRef = useRef<WebviewTag>(null);

  useEffect(() => {
    if (!window.api) return;

    window.api.subscribeToRadar((data) => {
      setTelemetry(data);
    });
  }, []);

  const handleRefresh = () => {
    setTelemetry(null);
    setKey(k => k + 1);
  };

  const handleAuthTest = () => {
    // Navigate to a site that forces basic auth
    setUrl('https://httpbin.org/basic-auth/user/passwd');
    handleRefresh();
  };

  const metrics = [
    { label: 'Ready Now', value: telemetry?.counters.ready },
    { label: 'Holding', value: telemetry?.counters.holding },
    { label: 'In Progress', value: telemetry?.counters.inProgress },
    { label: 'Waiting', value: telemetry?.counters.waiting }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', flex: 1, minHeight: 0 }}>
        <div style={{
          background: '#000',
          borderRadius: '8px',
          boxShadow: 'inset 0 0 20px #000',
          padding: '2px',
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

          <webview
            ref={webviewRef}
            key={key}
            src={url}
            preload={window.api?.radarPreloadPath}
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

        <Panel title="XCenter Telemetry" style={{ height: '100%' }}>
          <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: telemetry?.statusColor || 'linear-gradient(90deg, rgba(0,255,153,0.15), rgba(0,255,153,0.05))',
              border: '1px solid rgba(0,255,153,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '36px', borderRadius: '6px', background: telemetry?.statusColor || '#00ff99', opacity: 0.85 }} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '14px', color: 'var(--text-secondary)' }}>Status</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '18px', color: 'var(--text-primary)' }}>
                  {telemetry?.statusText || 'Awaiting telemetry...'}
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {formatTimestamp(telemetry?.lastUpdated)}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
              {metrics.map(metric => (
                <div
                  key={metric.label}
                  style={{
                    padding: '12px',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-secondary)', fontSize: '12px' }}>{metric.label}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-primary)', fontSize: '20px', marginTop: '6px' }}>
                    {metric.value ?? '—'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
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
