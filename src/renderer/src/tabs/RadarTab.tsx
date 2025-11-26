import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { IpcMessageEvent, WebviewTag } from 'electron';
import { TactileButton } from '../components';

export const RadarTab: React.FC = () => {
  const [url, setUrl] = useState('https://cw-intra-web/CWDashboard/Home/Radar');
  const [key, setKey] = useState(0);
  const [counterPayload, setCounterPayload] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const webviewRef = useRef<WebviewTag>(null);

  const preloadPath = useMemo(
    () => new URL('../../preload/radarWebview.mjs', import.meta.url).pathname,
    []
  );

  const partitionId = 'persist:radar-feed';

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    setCounterPayload(null);
    setKey(k => k + 1);
  };

  const handleAuthTest = () => {
    // Navigate to a site that forces basic auth
    setUrl('https://httpbin.org/basic-auth/user/passwd');
    handleRefresh();
  };

  useEffect(() => {
    const webview = webviewRef.current;

    if (!webview) return undefined;

    const handleDomReady = () => {
      setIsLoading(false);
      setError(null);
    };

    const handleIpcMessage = (event: IpcMessageEvent) => {
      if (event.channel === 'radar-counter') {
        setCounterPayload(event.args?.[0]);
      }
    };

    const handleDidFailLoad = (_event: Event & { errorDescription?: string }) => {
      setError('Signal Lost');
      setIsLoading(false);
    };

    const handleDidStartLoading = () => {
      setIsLoading(true);
      setError(null);
    };

    webview.addEventListener('dom-ready', handleDomReady);
    webview.addEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
    webview.addEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);
    webview.addEventListener('did-start-loading', handleDidStartLoading);

    return () => {
      webview.removeEventListener('dom-ready', handleDomReady);
      webview.removeEventListener('ipc-message', handleIpcMessage as unknown as EventListener);
      webview.removeEventListener('did-fail-load', handleDidFailLoad as unknown as EventListener);
      webview.removeEventListener('did-start-loading', handleDidStartLoading);
    };
  }, [key, url]);

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

        <webview
          key={key}
          ref={webviewRef}
          src={url}
          partition={partitionId}
          preload={preloadPath}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '6px',
            filter: 'contrast(1.1) saturate(0.9)'
          }}
        />

        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            padding: '6px 10px',
            borderRadius: '6px',
            background: 'rgba(11, 13, 18, 0.8)',
            color: '#9ae6ff',
            letterSpacing: '0.02em',
            fontSize: 12,
            zIndex: 15
          }}>
            Acquiring feed…
          </div>
        )}

        {error && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(255, 99, 99, 0.9)',
            color: '#0b0d12',
            fontWeight: 600,
            boxShadow: '0 0 10px rgba(255, 99, 99, 0.4)',
            zIndex: 15
          }}>
            {error}
          </div>
        )}

        {counterPayload !== null && !error && (
          <div style={{
            position: 'absolute',
            bottom: 12,
            right: 12,
            maxWidth: '45%',
            padding: '10px 12px',
            borderRadius: '6px',
            background: 'rgba(0, 0, 0, 0.75)',
            color: '#d3f5ff',
            fontSize: 12,
            lineHeight: 1.5,
            border: '1px solid rgba(78, 176, 255, 0.5)',
            boxShadow: '0 0 10px rgba(78, 176, 255, 0.4)',
            zIndex: 15
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Telemetry</div>
            <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(counterPayload, null, 2)}
            </pre>
          </div>
        )}
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
