import React, { useMemo, useState } from 'react';
import { Panel, ToggleSwitch, TactileButton, Input } from '../components';
import { GroupMap } from '@shared/ipc';

type Props = {
  groups: GroupMap;
  selectedGroups: string[];
  manualAdds: string[];
  manualRemoves: string[];
  onToggleGroup: (group: string, active: boolean) => void;
  onAddManual: (email: string) => void;
  onRemoveManual: (email: string) => void;
  onUndoRemove: () => void;
  onResetManual: () => void;
};

export const AssemblerTab: React.FC<Props> = ({ groups, selectedGroups, manualAdds, manualRemoves, onToggleGroup, onAddManual, onRemoveManual, onUndoRemove, onResetManual }) => {
  const [adhocInput, setAdhocInput] = useState('');
  const [copied, setCopied] = useState(false);

  const log = useMemo(() => {
    const fromGroups = selectedGroups.flatMap(g => groups[g] || []);
    const union = new Set([...fromGroups, ...manualAdds]);
    manualRemoves.forEach(r => union.delete(r));
    return Array.from(union).sort().map(email => ({
      email,
      source: manualAdds.includes(email) ? 'manual' : 'group'
    }));
  }, [groups, selectedGroups, manualAdds, manualRemoves]);

  const handleCopy = () => {
    navigator.clipboard.writeText(log.map(m => m.email).join('; '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDraftBridge = () => {
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} -`;
    const attendees = log.map(m => m.email).join(',');
    const url = `https://teams.microsoft.com/l/meeting/new?subject=${dateStr} NOC Briefing&attendees=${attendees}`;
    window.api.openExternal(url);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: '100%', alignItems: 'start' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Panel title="Groups">
          <div style={{ padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(groups).map(g => {
              const isSelected = selectedGroups.includes(g);
              return (
                <div
                  key={g}
                  onClick={() => onToggleGroup(g, !isSelected)}
                  style={{
                    background: isSelected ? 'var(--accent-primary)' : 'var(--bg-app)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'rgba(255,255,255,0.2)'}`,
                    padding: '6px 12px',
                    fontSize: '13px',
                    color: isSelected ? '#000' : 'var(--accent-primary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: isSelected ? 600 : 400,
                    boxShadow: isSelected ? '0 0 8px rgba(255, 215, 0, 0.3)' : 'none'
                  }}
                >
                  {g}
                </div>
              );
            })}
            {Object.keys(groups).length === 0 && (
              <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No groups loaded. Check groups.csv (or an .xlsx alternative).
              </div>
            )}
          </div>
        </Panel>
        <Panel title="Ad-Hoc">
          <div style={{ padding: '12px' }}>
            <Input
              label="Add Email"
              placeholder="operator@agency.net"
              value={adhocInput}
              onChange={(e) => setAdhocInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && adhocInput) { onAddManual(adhocInput); setAdhocInput(''); } }}
            />
          </div>
        </Panel>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--text-primary)' }}>{`Log (${log.length})`}</div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <TactileButton onClick={onResetManual} variant="secondary">Reset</TactileButton>
            {manualRemoves.length > 0 && <TactileButton onClick={onUndoRemove} variant="secondary">Undo Remove</TactileButton>}
            <TactileButton onClick={handleDraftBridge} variant="primary">Create Bridge</TactileButton>
            <TactileButton onClick={handleCopy} active={copied}>{copied ? 'STAMPED' : 'Copy List'}</TactileButton>
          </div>
        </div>

        <div style={{
          flex: 1,
          background: 'rgba(0,0,0,0.3)',
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-mono)',
          padding: '24px',
          overflow: 'auto',
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative'
        }}>
          <div style={{
            borderBottom: '1px solid rgba(255,215,0,0.2)',
            paddingBottom: '12px',
            marginBottom: '16px',
            textAlign: 'center',
            color: 'var(--accent-primary)',
            fontSize: '11px',
            letterSpacing: '0.05em',
            fontFamily: 'var(--font-serif)'
          }}>
            OFFICIAL LOG
            <div style={{ color: 'var(--text-secondary)', fontSize: '10px', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleString().toUpperCase()}
            </div>
          </div>
          {log.map(({ email, source }) => (
            <div key={email} style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 0',
              borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{email}</span>
                {source === 'manual' && (
                  <span style={{
                    fontSize: '9px',
                    border: '1px solid var(--accent-primary)',
                    padding: '1px 4px',
                    color: 'var(--accent-primary)'
                  }}>
                    ADHOC
                  </span>
                )}
              </div>
              <span
                style={{
                  cursor: 'pointer',
                  color: 'var(--accent-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  opacity: 0.7,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                onClick={() => onRemoveManual(email)}
                title="Remove"
              >
                [×]
              </span>
            </div>
          ))}
          {log.length === 0 && (
            <div style={{
              textAlign: 'center',
              marginTop: '40px',
              color: 'var(--text-secondary)',
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              No entries in log
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
