import React, { useState } from 'react';
import { AuthRequest } from '@shared/ipc';
import { TactileButton, Input } from './index';

type Props = {
  request: AuthRequest;
  onClose: () => void;
  onSubmit: (u: string, p: string) => void;
};

export const AuthModal: React.FC<Props> = ({ request, onClose, onSubmit }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        width: '400px',
        background: 'var(--bg-panel)',
        border: '1px solid var(--accent-primary)',
        boxShadow: '0 0 30px rgba(0,0,0,0.8)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '20px',
            color: 'var(--accent-primary)',
            letterSpacing: '0.05em',
            marginBottom: '8px'
          }}>
            SECURITY CLEARANCE
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            ACCESS RESTRICTED: {request.host}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Input
            label="Agent ID"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <Input
            label="Passcode"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <TactileButton
            variant="danger"
            onClick={onClose}
            style={{ flex: 1 }}
          >
            Abort
          </TactileButton>
          <TactileButton
            variant="primary"
            onClick={() => onSubmit(username, password)}
            style={{ flex: 1 }}
          >
            Authenticate
          </TactileButton>
        </div>
      </div>
    </div>
  );
};
