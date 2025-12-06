import React, { useMemo, useState } from 'react';
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
    const url = `https://teams.microsoft.com/l/meeting/new?subject=${dateStr}&attendees=${attendees}`;
    window.api.openExternal(url);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '100%', alignItems: 'start' }}>

      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Groups Selection */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Groups</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{Object.keys(groups).length}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(groups).map(g => {
              const isSelected = selectedGroups.includes(g);
              return (
                <button
                  key={g}
                  onClick={() => onToggleGroup(g, !isSelected)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    background: isSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    border: `1px solid ${isSelected ? 'var(--color-accent-blue)' : 'var(--border-subtle)'}`,
                    color: isSelected ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
                    transition: 'all 0.15s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => { if(!isSelected) e.currentTarget.style.borderColor = 'var(--color-text-secondary)' }}
                  onMouseLeave={(e) => { if(!isSelected) e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
                >
                  {g}
                </button>
              );
            })}
            {Object.keys(groups).length === 0 && (
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', fontStyle: 'italic' }}>
                No groups found.
              </div>
            )}
          </div>
        </div>

        {/* Manual Add - Zero Friction Input */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Quick Add</h3>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Enter email address..."
              value={adhocInput}
              onChange={(e) => setAdhocInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && adhocInput) { onAddManual(adhocInput); setAdhocInput(''); } }}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--border-subtle)',
                padding: '12px 0',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-family-mono)',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderBottomColor = 'var(--color-accent-blue)'}
              onBlur={(e) => e.currentTarget.style.borderBottomColor = 'var(--border-subtle)'}
            />
            {adhocInput && (
               <div
               style={{
                 position: 'absolute',
                 right: '0',
                 top: '50%',
                 transform: 'translateY(-50%)',
                 color: 'var(--color-accent-blue)',
                 fontSize: '12px',
                 fontWeight: 600,
                 pointerEvents: 'none'
               }}
             >
               ENTER
             </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Log Area - Card */}
      <div className="glass-panel" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'var(--color-bg-card)',
        border: 'var(--border-subtle)'
      }}>

        {/* Toolbar */}
        <div style={{
          padding: '24px',
          borderBottom: 'var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Composition</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', marginTop: '4px' }}>
              {log.length} recipients selected
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onResetManual}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-tertiary)',
                cursor: 'pointer',
                fontSize: '13px'
              }}>Reset</button>
            {manualRemoves.length > 0 && (
              <button
                onClick={onUndoRemove}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--color-text-tertiary)',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}>Undo</button>
            )}
            <button
              onClick={handleCopy}
              style={{
                background: 'transparent',
                border: 'var(--border-subtle)',
                borderRadius: '6px',
                padding: '6px 12px',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              onClick={handleDraftBridge}
              style={{
                background: 'var(--color-accent-blue)',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 16px',
                color: 'white',
                fontWeight: 500,
                cursor: 'pointer',
                fontSize: '13px',
                boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
              }}
            >
              Draft Bridge
            </button>
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
              color: 'var(--color-text-tertiary)'
            }}>
              <div style={{ fontSize: '48px', opacity: 0.1 }}>∅</div>
              <div>No recipients selected</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {log.map(({ email, source }) => (
                  <tr key={email} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.2s' }} className="hover-bg">
                    <td style={{ padding: '12px 24px', fontFamily: 'var(--font-family-mono)', fontSize: '13px', color: 'var(--color-text-primary)' }}>
                      {email}
                    </td>
                    <td style={{ padding: '12px 24px', width: '100px', textAlign: 'right' }}>
                      {source === 'manual' && (
                        <span style={{
                          fontSize: '10px',
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#A78BFA',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontWeight: 500
                        }}>
                          MANUAL
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px 24px', width: '40px' }}>
                      <button
                        onClick={() => onRemoveManual(email)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--color-text-tertiary)',
                          fontSize: '18px',
                          padding: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          opacity: 0.5
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.color = '#EF4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.5';
                          e.currentTarget.style.color = 'var(--color-text-tertiary)';
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
