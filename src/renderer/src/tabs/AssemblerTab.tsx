import React, { useMemo, useState } from 'react';
import { GroupMap } from '@shared/ipc';
import { TactileButton } from '../components/TactileButton';

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
    const url = `https://teams.microsoft.com/l/meeting/new?subject=${dateStr}&attendees=${attendees}`;
    window.api.openExternal(url);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '32px', height: '100%', alignItems: 'start', minHeight: 0 }}>

      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Groups Selection */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '14px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Groups</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{Object.keys(groups).length} Loaded</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(groups).map(g => {
              const isSelected = selectedGroups.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => onToggleGroup(g, !isSelected)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '13px',
                    background: isSelected ? 'rgba(0, 242, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${isSelected ? 'var(--accent-primary)' : 'var(--color-border)'}`,
                    color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.borderColor = 'var(--text-secondary)' }}
                  onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.borderColor = 'var(--color-border)' }}
                >
                  {g}
                </button>
              );
            })}
            {Object.keys(groups).length === 0 && (
              <div style={{ color: 'var(--text-tertiary)', fontSize: '13px', fontStyle: 'italic' }}>
                No groups found.
              </div>
            )}
          </div>
        </div>

        {/* Manual Add */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '14px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>Quick Add</h3>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Enter email address..."
              value={adhocInput}
              onChange={(e) => setAdhocInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && adhocInput) { onAddManual(adhocInput); setAdhocInput(''); } }}
              style={{
                width: '100%',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--color-border)',
                padding: '12px',
                paddingRight: '40px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-mono)'
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--accent-primary)',
                opacity: adhocInput ? 1 : 0.3,
                pointerEvents: 'none'
              }}
            >
              ↵
            </div>
          </div>
        </div>
      </div>

      {/* Main Log Area */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

        {/* Toolbar */}
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--color-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.2)'
        }}>
          <div>
            <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)' }}>Assembler Log</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '4px' }}>
              {log.length} RECIPIENTS SELECTED
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <TactileButton onClick={onResetManual} variant="secondary" style={{ fontSize: '12px' }}>Reset</TactileButton>
            {manualRemoves.length > 0 && (
              <TactileButton onClick={onUndoRemove} variant="secondary" style={{ fontSize: '12px' }}>Undo</TactileButton>
            )}
            <TactileButton onClick={handleCopy} variant="secondary" active={copied}>
              {copied ? 'Copied' : 'Copy'}
            </TactileButton>
            <TactileButton onClick={handleDraftBridge} variant="primary">
              Draft Bridge
            </TactileButton>
          </div>
        </div>

        {/* List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '0'
        }}>
          {log.length === 0 ? (
            <div style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--text-tertiary)'
            }}>
              <div style={{ fontSize: '48px', opacity: 0.2 }}>∅</div>
              <div>No recipients selected</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {log.map(({ email, source }) => (
                  <tr key={email} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '12px 24px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-primary)' }}>
                      {email}
                    </td>
                    <td style={{ padding: '12px 24px', width: '100px', textAlign: 'right' }}>
                      {source === 'manual' && (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(112, 0, 255, 0.2)',
                          color: '#b380ff',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid rgba(112, 0, 255, 0.3)'
                        }}>
                          MANUAL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 24px', width: '40px' }}>
                      <button
                        onClick={() => onRemoveManual(email)}
                        style={{
                          color: 'var(--text-tertiary)',
                          fontSize: '16px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.color = 'var(--accent-danger)';
                          e.currentTarget.style.background = 'rgba(255, 0, 85, 0.1)';
                          e.currentTarget.style.borderRadius = '4px';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.color = 'var(--text-tertiary)';
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
