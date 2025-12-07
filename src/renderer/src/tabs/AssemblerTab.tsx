import React, { useMemo, useState } from 'react';
import { GroupMap, Contact } from '@shared/ipc';
import { ContactCard } from '../components/ContactCard';

type Props = {
  groups: GroupMap;
  contacts: Contact[];
  selectedGroups: string[];
  manualAdds: string[];
  manualRemoves: string[];
  onToggleGroup: (group: string, active: boolean) => void;
  onAddManual: (email: string) => void;
  onRemoveManual: (email: string) => void;
  onUndoRemove: () => void;
  onResetManual: () => void;
};

// --- Color Utils ---
const PALETTE = [
  { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgba(239, 68, 68, 0.4)', text: '#FCA5A5', fill: '#EF4444' }, // Red
  { bg: 'rgba(249, 115, 22, 0.2)', border: 'rgba(249, 115, 22, 0.4)', text: '#FDBA74', fill: '#F97316' }, // Orange
  { bg: 'rgba(245, 158, 11, 0.2)', border: 'rgba(245, 158, 11, 0.4)', text: '#FCD34D', fill: '#F59E0B' }, // Amber
  { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgba(16, 185, 129, 0.4)', text: '#6EE7B7', fill: '#10B981' }, // Emerald
  { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgba(59, 130, 246, 0.4)', text: '#93C5FD', fill: '#3B82F6' }, // Blue
  { bg: 'rgba(99, 102, 241, 0.2)', border: 'rgba(99, 102, 241, 0.4)', text: '#A5B4FC', fill: '#6366F1' }, // Indigo
  { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgba(139, 92, 246, 0.4)', text: '#C4B5FD', fill: '#8B5CF6' }, // Violet
  { bg: 'rgba(236, 72, 153, 0.2)', border: 'rgba(236, 72, 153, 0.4)', text: '#F9A8D4', fill: '#EC4899' }, // Pink
];

const getColorForString = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
};

const ToolbarButton = ({ onClick, label, primary = false, active = false }: { onClick: () => void, label: string, primary?: boolean, active?: boolean }) => {
    return (
        <button
            onClick={onClick}
            style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: primary ? 'none' : '1px solid var(--border-subtle)',
                background: primary ? 'var(--color-accent-blue)' : (active ? 'rgba(255,255,255,0.1)' : 'transparent'),
                color: primary ? '#FFFFFF' : (active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)'),
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: primary ? '0 4px 12px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onMouseEnter={(e) => {
                if (!primary) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = 'var(--color-text-primary)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                } else {
                    e.currentTarget.style.background = '#2563EB'; // Darker blue
                }
            }}
            onMouseLeave={(e) => {
                if (!primary) {
                     e.currentTarget.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent';
                     e.currentTarget.style.color = active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)';
                     e.currentTarget.style.borderColor = 'var(--border-subtle)';
                } else {
                    e.currentTarget.style.background = 'var(--color-accent-blue)';
                }
            }}
        >
            {label}
        </button>
    )
}

export const AssemblerTab: React.FC<Props> = ({ groups, contacts, selectedGroups, manualAdds, manualRemoves, onToggleGroup, onAddManual, onRemoveManual, onUndoRemove, onResetManual }) => {
  const [adhocInput, setAdhocInput] = useState('');
  const [copied, setCopied] = useState(false);

  // Optimized contact lookup map
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach(c => map.set(c.email.toLowerCase(), c));
    return map;
  }, [contacts]);

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
    window.api?.openExternal(url);
    window.api?.logBridge(selectedGroups);
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px', height: '100%', alignItems: 'start' }}>

      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Groups Selection */}
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '12px', animationDelay: '0ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Groups</h3>
            <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{Object.keys(groups).length}</span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(groups).map(g => {
              const isSelected = selectedGroups.includes(g);
              const color = getColorForString(g);
              return (
                <button
                  key={g}
                  onClick={() => onToggleGroup(g, !isSelected)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '20px', // Chip style
                    fontSize: '12px',
                    fontWeight: 500,
                    background: isSelected ? color.fill : 'transparent',
                    border: `1px solid ${isSelected ? color.fill : color.border}`,
                    color: isSelected ? '#FFFFFF' : color.text,
                    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                    cursor: 'pointer',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.background = color.bg;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  {isSelected && <span style={{ fontSize: '14px', lineHeight: 0 }}>✓</span>}
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
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '12px', animationDelay: '100ms' }}>
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
                background: 'var(--color-bg-app)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '12px 16px',
                fontSize: '14px',
                color: 'var(--color-text-primary)',
                outline: 'none',
                fontFamily: 'var(--font-family-base)',
                transition: 'all 0.2s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px var(--color-accent-blue-dim)';
              }}
              onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
              }}
            />
            {adhocInput && (
               <div
               style={{
                 position: 'absolute',
                 right: '12px',
                 top: '50%',
                 transform: 'translateY(-50%)',
                 color: 'var(--color-accent-blue)',
                 fontSize: '10px',
                 fontWeight: 700,
                 background: 'rgba(59, 130, 246, 0.1)',
                 padding: '2px 6px',
                 borderRadius: '4px',
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
      <div className="glass-panel animate-slide-up" style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        borderRadius: '12px',
        background: 'var(--color-bg-card)',
        border: 'var(--border-subtle)',
        animationDelay: '200ms'
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
            <ToolbarButton label="Reset" onClick={onResetManual} />
            {manualRemoves.length > 0 && (
               <ToolbarButton label="Undo" onClick={onUndoRemove} />
            )}
            <ToolbarButton label={copied ? 'Copied' : 'Copy'} onClick={handleCopy} active={copied} />
            <ToolbarButton label="Draft Bridge" onClick={handleDraftBridge} primary />
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
             <div style={{ display: 'flex', flexDirection: 'column' }}>
                {log.map(({ email, source }) => {
                    const contact = contactMap.get(email.toLowerCase());
                    const name = contact ? contact.name : email.split('@')[0]; // Fallback to part of email
                    const title = contact?.title;
                    const phone = contact?.phone;

                    return (
                        <ContactCard
                            key={email}
                            name={name}
                            email={email}
                            title={title}
                            phone={phone}
                            sourceLabel={source === 'manual' ? 'MANUAL' : undefined}
                            className="animate-fade-in"
                            action={
                                <button
                                    onClick={() => onRemoveManual(email)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-tertiary)',
                                        fontSize: '18px',
                                        padding: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        opacity: 0.5,
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.color = '#EF4444';
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                        e.currentTarget.style.borderRadius = '50%';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = '0.5';
                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    ×
                                </button>
                            }
                        />
                    );
                })}
             </div>
          )}
        </div>
      </div>
    </div>
  );
};
