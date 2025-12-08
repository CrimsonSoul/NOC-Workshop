import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GroupMap, Contact } from '@shared/ipc';
import { ContactCard } from '../components/ContactCard';
import { AddContactModal } from '../components/AddContactModal';
import { Modal } from '../components/Modal';
import { getColorForString } from '../utils/colors';

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

const GroupContextMenu = ({ x, y, onRename, onDelete, onClose }: { x: number, y: number, onRename: () => void, onDelete: () => void, onClose: () => void }) => {
    return createPortal(
        <>
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
            <div
                style={{
                    position: 'fixed',
                    top: y,
                    left: x,
                    background: 'var(--color-bg-card)',
                    border: 'var(--border-subtle)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 99999,
                    padding: '4px',
                    minWidth: '120px'
                }}
                onClick={e => e.stopPropagation()}
            >
                <div
                    onClick={() => { onRename(); onClose(); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-primary)', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    Rename Group
                </div>
                <div
                    onClick={() => { onDelete(); onClose(); }}
                    style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '13px', color: '#EF4444', borderRadius: '4px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    Delete Group
                </div>
            </div>
        </>,
        document.body
    );
}

export const AssemblerTab: React.FC<Props> = ({ groups, contacts, selectedGroups, manualAdds, manualRemoves, onToggleGroup, onAddManual, onRemoveManual, onUndoRemove, onResetManual }) => {
  const [adhocInput, setAdhocInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Group Context Menu State
  const [groupContextMenu, setGroupContextMenu] = useState<{ x: number, y: number, group: string } | null>(null);
  const [groupToRename, setGroupToRename] = useState<string | null>(null);
  const [renamedGroupName, setRenamedGroupName] = useState('');
  const [renameConflict, setRenameConflict] = useState<string | null>(null);

  // Close context menu on scroll or resize
  useEffect(() => {
     const handler = () => setGroupContextMenu(null);
     window.addEventListener('resize', handler);
     window.addEventListener('scroll', handler, true);
     return () => {
         window.removeEventListener('resize', handler);
         window.removeEventListener('scroll', handler, true);
     }
  }, []);

  // Optimized contact lookup map
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach(c => map.set(c.email.toLowerCase(), c));
    return map;
  }, [contacts]);

  const emailToGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(groups).forEach(([groupName, emails]) => {
      emails.forEach((email) => {
        const key = email.toLowerCase();
        const existing = map.get(key) || [];
        map.set(key, [...existing, groupName]);
      });
    });
    return map;
  }, [groups]);

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

  const handleQuickAdd = () => {
    if (!adhocInput) return;
    const email = adhocInput.trim();
    if (!email) return;

    // Check if exists
    if (contactMap.has(email.toLowerCase())) {
        onAddManual(email);
        setAdhocInput('');
    } else {
        // Open Modal
        setPendingEmail(email);
        setIsAddContactModalOpen(true);
    }
  };

  const handleContactSaved = async (contact: Partial<Contact>) => {
      // Save to backend
      await window.api?.addContact(contact);

      // Add to manual list immediately (optimistic, but safe since we just saved it)
      if (contact.email) {
          onAddManual(contact.email);
      }
      setAdhocInput(''); // Clear input
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    await window.api?.addGroup(newGroupName);
    setIsGroupModalOpen(false);
    setNewGroupName('');
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 320px) 1fr', gap: '24px', height: '100%', alignItems: 'start' }}>

      {/* Sidebar Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

        {/* Groups Selection */}
        <div className="glass-panel animate-slide-up" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '12px', animationDelay: '0ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Groups</h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                 <span style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>{Object.keys(groups).length}</span>
                 <button
                   onClick={() => setIsGroupModalOpen(true)}
                   style={{
                       background: 'transparent',
                       border: 'var(--border-subtle)',
                       borderRadius: '20px',
                       color: 'var(--color-text-secondary)',
                       cursor: 'pointer',
                       padding: '6px 12px',
                       fontSize: '12px',
                       fontWeight: 500,
                       display: 'flex',
                       alignItems: 'center',
                       gap: '6px',
                       transition: 'all 0.15s ease'
                   }}
                   title="Create Group"
                   onMouseEnter={(e) => {
                     e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                     e.currentTarget.style.color = 'var(--color-text-primary)';
                   }}
                   onMouseLeave={(e) => {
                     e.currentTarget.style.background = 'transparent';
                     e.currentTarget.style.color = 'var(--color-text-secondary)';
                   }}
                 >
                    <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span>
                    New group
                 </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.keys(groups).map(g => {
              const isSelected = selectedGroups.includes(g);
              const color = getColorForString(g);
              return (
                <div
                  key={g}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  onMouseEnter={e => {
                    const btn = e.currentTarget.querySelector('.delete-btn');
                    if (btn) (btn as HTMLElement).style.opacity = '1';
                  }}
                  onMouseLeave={e => {
                    const btn = e.currentTarget.querySelector('.delete-btn');
                    if (btn) (btn as HTMLElement).style.opacity = '0';
                  }}
                >
                  <button
                    onClick={() => onToggleGroup(g, !isSelected)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setGroupContextMenu({ x: e.clientX, y: e.clientY, group: g });
                    }}
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
                </div>
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
              onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAdd(); }}
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
            {manualRemoves.length > 0 && (
               <ToolbarButton label="Undo" onClick={onUndoRemove} />
            )}
            <ToolbarButton label="Reset" onClick={onResetManual} />
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
                    const membership = emailToGroups.get(email.toLowerCase()) || [];

                    return (
                        <ContactCard
                            key={email}
                            name={name}
                            email={email}
                            title={title}
                            phone={phone}
                            groups={membership}
                            sourceLabel={source === 'manual' ? 'MANUAL' : undefined}
                            className="animate-fade-in"
                            action={
                                <button
                                    onClick={() => onRemoveManual(email)}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'var(--color-text-tertiary)',
                                        width: '24px',
                                        height: '24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        opacity: 0.5,
                                        transition: 'all 0.2s',
                                        borderRadius: '4px'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.opacity = '1';
                                        e.currentTarget.style.color = '#EF4444';
                                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.opacity = '0.5';
                                        e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                    title="Remove from List"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <line x1="18" y1="6" x2="6" y2="18"></line>
                                      <line x1="6" y1="6" x2="18" y2="18"></line>
                                    </svg>
                                </button>
                            }
                        />
                    );
                })}
             </div>
          )}
        </div>
      </div>

      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        initialEmail={pendingEmail}
        onSave={handleContactSaved}
      />

      {/* Simple Create Group Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Create Group"
        width="400px"
      >
          <form onSubmit={handleCreateGroup}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Group Name</label>
              <input
                  autoFocus
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: 'var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      marginBottom: '16px'
                  }}
                  placeholder="e.g. Marketing"
                  required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setIsGroupModalOpen(false)} className="tactile-button">Cancel</button>
                  <button type="submit" className="tactile-button" style={{ background: 'var(--color-accent-blue)', borderColor: 'transparent', color: '#FFF' }}>Create</button>
              </div>
          </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!groupToDelete}
        onClose={() => setGroupToDelete(null)}
        title="Delete Group"
        width="400px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                Are you sure you want to delete <span style={{ fontWeight: 600 }}>{groupToDelete}</span>?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                This will remove the group tag from all contacts. The contacts themselves will not be deleted.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                    onClick={() => setGroupToDelete(null)}
                    className="tactile-button"
                >
                    Cancel
                </button>
                <button
                    onClick={async () => {
                        if (groupToDelete) {
                            await window.api?.removeGroup(groupToDelete);
                            // Deselect if selected
                             if (selectedGroups.includes(groupToDelete)) {
                                 onToggleGroup(groupToDelete, false);
                             }
                        }
                        setGroupToDelete(null);
                    }}
                    className="tactile-button"
                    style={{ background: '#EF4444', borderColor: 'transparent', color: '#FFF' }}
                >
                    Delete Group
                </button>
            </div>
        </div>
      </Modal>

       {/* Rename Group Modal */}
      <Modal
          isOpen={!!groupToRename}
          onClose={() => {
              setGroupToRename(null);
              setRenameConflict(null);
          }}
          title="Rename Group"
          width="400px"
      >
        {renameConflict ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                 <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                    Group <span style={{ fontWeight: 600 }}>{renameConflict}</span> already exists.
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                    Do you want to merge <span style={{ fontWeight: 600 }}>{groupToRename}</span> into <span style={{ fontWeight: 600 }}>{renameConflict}</span>? All contacts will be moved.
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                    <button
                        onClick={() => setRenameConflict(null)}
                        className="tactile-button"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={async () => {
                            if (groupToRename && renameConflict) {
                                await window.api?.renameGroup(groupToRename, renameConflict);
                                if (selectedGroups.includes(groupToRename)) {
                                    onToggleGroup(groupToRename, false);
                                    onToggleGroup(renameConflict, true);
                                }
                            }
                            setGroupToRename(null);
                            setRenameConflict(null);
                        }}
                        className="tactile-button"
                        style={{ background: 'var(--color-accent-blue)', borderColor: 'transparent', color: '#FFF' }}
                    >
                        Merge Groups
                    </button>
                </div>
            </div>
        ) : (
          <form onSubmit={async (e) => {
              e.preventDefault();
              console.log('Submitting rename:', { groupToRename, renamedGroupName, groupsKeys: Object.keys(groups) });
              if (groupToRename && renamedGroupName && renamedGroupName !== groupToRename) {
                  // Check conflict
                  if (groups[renamedGroupName]) {
                      console.log('Conflict detected for:', renamedGroupName);
                      setRenameConflict(renamedGroupName);
                      return;
                  }

                  await window.api?.renameGroup(groupToRename, renamedGroupName);
                  // Update selection if needed
                  if (selectedGroups.includes(groupToRename)) {
                       onToggleGroup(groupToRename, false);
                       onToggleGroup(renamedGroupName, true);
                  }
              }
              setGroupToRename(null);
          }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Group Name</label>
              <input
                  autoFocus
                  value={renamedGroupName}
                  onChange={e => setRenamedGroupName(e.target.value)}
                  style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(255,255,255,0.03)',
                      border: 'var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--color-text-primary)',
                      marginBottom: '16px'
                  }}
                  required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button type="button" onClick={() => setGroupToRename(null)} className="tactile-button">Cancel</button>
                  <button type="submit" className="tactile-button" style={{ background: 'var(--color-accent-blue)', borderColor: 'transparent', color: '#FFF' }}>Save</button>
              </div>
          </form>
        )}
      </Modal>

       {/* Group Context Menu */}
       {groupContextMenu && (
           <GroupContextMenu
               x={groupContextMenu.x}
               y={groupContextMenu.y}
               onRename={() => {
                   setGroupToRename(groupContextMenu.group);
                   setRenamedGroupName(groupContextMenu.group);
               }}
               onDelete={() => setGroupToDelete(groupContextMenu.group)}
               onClose={() => setGroupContextMenu(null)}
           />
       )}

    </div>
  );
};
