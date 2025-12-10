import React, { useMemo, useState, memo, useRef, useEffect } from 'react';
import { GroupMap, Contact } from '@shared/ipc';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ContactCard } from '../components/ContactCard';
import { AddContactModal } from '../components/AddContactModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ToolbarButton } from '../components/ToolbarButton';
import { Input } from '../components/Input';
import { SidebarItem } from '../components/SidebarItem';
import { ContextMenu } from '../components/ContextMenu';

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

type SortConfig = {
    key: 'name' | 'title' | 'email' | 'phone' | 'groups';
    direction: 'asc' | 'desc';
};

// Row component for virtualization
const VirtualRow = memo(({ index, style, data }: ListChildComponentProps<{
  log: { email: string, source: string }[],
  contactMap: Map<string, Contact>,
  emailToGroups: Map<string, string[]>,
  onRemoveManual: (email: string) => void,
  onAddToContacts: (email: string) => void
}>) => {
  const { log, contactMap, emailToGroups, onRemoveManual, onAddToContacts } = data;
  const { email, source } = log[index];
  const contact = contactMap.get(email.toLowerCase());
  const name = contact ? contact.name : email.split('@')[0];
  const title = contact?.title;
  const phone = contact?.phone;
  const membership = emailToGroups.get(email.toLowerCase()) || [];
  const isUnknown = !contact;

  return (
    <div style={style}>
      <ContactCard
        key={email}
        name={name}
        email={email}
        title={title}
        phone={phone}
        groups={membership}
        sourceLabel={source === 'manual' ? 'MANUAL' : undefined}
        style={{ paddingLeft: '32px', paddingRight: '32px', height: '100%' }} // Match toolbar padding
        action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isUnknown && (
                    <button
                        onClick={() => onAddToContacts(email)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--color-text-secondary)',
                            borderRadius: '4px',
                            padding: '2px 8px',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap'
                        }}
                        className="hover-bg"
                        title="Add to Contacts"
                    >
                        SAVE
                    </button>
                )}
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
                  opacity: 0.7,
                  transition: 'all 0.2s',
                  borderRadius: '4px'
                }}
                className="hover-bg"
                title="Remove from List"
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#EF4444';
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--color-text-tertiary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
          </div>
        }
      />
    </div>
  );
});

const SortableHeader = ({
    label,
    sortKey,
    currentSort,
    onSort,
    flex,
    width,
    align = 'left',
    paddingLeft
}: {
    label: string,
    sortKey?: SortConfig['key'],
    currentSort: SortConfig,
    onSort: (key: SortConfig['key']) => void,
    flex?: number | string,
    width?: string,
    align?: 'left' | 'right',
    paddingLeft?: string
}) => {
    const isSorted = sortKey && currentSort.key === sortKey;

    return (
        <div
            style={{
                flex: flex,
                width: width,
                textAlign: align,
                paddingLeft: paddingLeft,
                cursor: sortKey ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
            }}
            onClick={() => sortKey && onSort(sortKey)}
        >
            {label}
            {isSorted && (
                <span style={{ fontSize: '10px', color: 'var(--color-text-primary)' }}>
                    {currentSort.direction === 'asc' ? '▲' : '▼'}
                </span>
            )}
        </div>
    );
};

export const AssemblerTab: React.FC<Props> = ({ groups, contacts, selectedGroups, manualAdds, manualRemoves, onToggleGroup, onAddManual, onRemoveManual, onUndoRemove, onResetManual }) => {
  const { showToast } = useToast();
  const [adhocInput, setAdhocInput] = useState('');
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionWrapperRef = useRef<HTMLDivElement>(null);

  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

  // Group Context Menu State
  const [groupContextMenu, setGroupContextMenu] = useState<{ x: number, y: number, group: string } | null>(null);
  const [groupToRename, setGroupToRename] = useState<string | null>(null);
  const [renamedGroupName, setRenamedGroupName] = useState('');
  const [renameConflict, setRenameConflict] = useState<string | null>(null);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

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

  // Suggestions Logic
  const suggestions = useMemo(() => {
    if (!adhocInput || !showSuggestions) return [];
    const lower = adhocInput.toLowerCase();
    // Simple filter: match name or email, limit to 5
    return contacts
        .filter(c => c._searchString.includes(lower))
        .slice(0, 5);
  }, [adhocInput, showSuggestions, contacts]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (suggestionWrapperRef.current && !suggestionWrapperRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const log = useMemo(() => {
    const fromGroups = selectedGroups.flatMap(g => groups[g] || []);
    const union = new Set([...fromGroups, ...manualAdds]);
    manualRemoves.forEach(r => union.delete(r));
    let result = Array.from(union).map(email => ({
      email,
      source: manualAdds.includes(email) ? 'manual' : 'group'
    }));

    return result.sort((a, b) => {
        const contactA = contactMap.get(a.email.toLowerCase());
        const contactB = contactMap.get(b.email.toLowerCase());
        const dir = sortConfig.direction === 'asc' ? 1 : -1;

        if (sortConfig.key === 'groups') {
             const groupsA = emailToGroups.get(a.email.toLowerCase()) || [];
             const groupsB = emailToGroups.get(b.email.toLowerCase()) || [];
             const strA = groupsA.sort().join(', ');
             const strB = groupsB.sort().join(', ');
             return strA.localeCompare(strB) * dir;
        }

        let valA = '';
        let valB = '';

        if (sortConfig.key === 'name') {
             valA = (contactA?.name || a.email.split('@')[0]).toLowerCase();
             valB = (contactB?.name || b.email.split('@')[0]).toLowerCase();
        } else if (sortConfig.key === 'title') {
             valA = (contactA?.title || '').toLowerCase();
             valB = (contactB?.title || '').toLowerCase();
        } else if (sortConfig.key === 'email') {
             valA = a.email.toLowerCase();
             valB = b.email.toLowerCase();
        } else if (sortConfig.key === 'phone') {
             valA = (contactA?.phone || '').toLowerCase();
             valB = (contactB?.phone || '').toLowerCase();
        }

        return valA.localeCompare(valB) * dir;
    });
  }, [groups, selectedGroups, manualAdds, manualRemoves, contactMap, sortConfig, emailToGroups]);

  const handleSort = (key: SortConfig['key']) => {
       setSortConfig(current => {
          if (current.key === key) {
              return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          }
          return { key, direction: 'asc' };
      });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(log.map(m => m.email).join('; '));
    showToast('Copied to clipboard', 'success');
  };

  const handleDraftBridge = () => {
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} -`;
    const attendees = log.map(m => m.email).join(',');
    const url = `https://teams.microsoft.com/l/meeting/new?subject=${dateStr}&attendees=${attendees}`;
    window.api?.openExternal(url);
    window.api?.logBridge(selectedGroups);
    showToast('Bridge drafted', 'success');
  };

  const handleQuickAdd = (emailOverride?: string) => {
    const email = emailOverride || adhocInput.trim();
    if (!email) return;

    // Check if exists
    if (contactMap.has(email.toLowerCase())) {
        onAddManual(email);
        setAdhocInput('');
        setShowSuggestions(false);
        showToast(`Added ${email}`, 'success');
    } else {
        // Add as manual entry directly
        onAddManual(email);
        setAdhocInput('');
        setShowSuggestions(false);
        showToast(`Added ${email}`, 'success');
    }
  };

  const handleAddToContacts = (email: string) => {
      setPendingEmail(email);
      setIsAddContactModalOpen(true);
  };

  const handleContactSaved = async (contact: Partial<Contact>) => {
      // Save to backend
      const success = await window.api?.addContact(contact);

      if (success) {
          // Add to manual list immediately (optimistic, but safe since we just saved it)
          if (contact.email) {
              onAddManual(contact.email);
          }
          setAdhocInput(''); // Clear input
          showToast('Contact created successfully', 'success');
      } else {
          showToast('Failed to create contact', 'error');
      }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;
    const success = await window.api?.addGroup(newGroupName);
    if (success) {
        setIsGroupModalOpen(false);
        setNewGroupName('');
        showToast(`Group "${newGroupName}" created`, 'success');
    } else {
        showToast('Failed to create group', 'error');
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '0px', height: '100%', alignItems: 'start' }}>

      {/* Sidebar Controls - Clean, no glass panel wrapper */}
      <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          padding: '24px',
          borderRight: 'var(--border-subtle)',
          height: '100%',
          overflowY: 'auto'
      }}>

        {/* Quick Add */}
        <div ref={suggestionWrapperRef} style={{ position: 'relative' }}>
             <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', marginBottom: '8px', paddingLeft: '4px' }}>QUICK ADD</div>
             <Input
                placeholder="Add by email..."
                value={adhocInput}
                onChange={(e) => {
                    setAdhocInput(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleQuickAdd();
                        e.currentTarget.blur();
                    }
                }}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>}
             />

             {/* Suggestions Dropdown */}
             {showSuggestions && suggestions.length > 0 && (
                 <div style={{
                     position: 'absolute',
                     top: '100%',
                     left: 0,
                     right: 0,
                     marginTop: '4px',
                     background: 'var(--color-bg-surface)',
                     border: 'var(--border-subtle)',
                     borderRadius: '6px',
                     zIndex: 100,
                     boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                     overflow: 'hidden'
                 }}>
                     {suggestions.map(c => (
                         <div
                            key={c.email}
                            onClick={() => handleQuickAdd(c.email)}
                            style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                color: 'var(--color-text-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                         >
                             <div style={{
                                 width: '18px', height: '18px', borderRadius: '4px',
                                 background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6',
                                 fontSize: '9px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                             }}>
                                 {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                             </div>
                             <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                 {c.name || c.email}
                                 {c.name && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '6px', fontSize: '11px' }}>{c.email}</span>}
                             </div>
                         </div>
                     ))}
                 </div>
             )}
        </div>

        {/* Groups Selection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)' }}>GROUPS</div>
            <button
               onClick={() => setIsGroupModalOpen(true)}
               style={{
                   background: 'transparent',
                   border: 'none',
                   color: 'var(--color-text-tertiary)',
                   cursor: 'pointer',
                   padding: '4px',
                   borderRadius: '4px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
               }}
               className="hover-bg"
               title="Create Group"
            >
               <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {Object.keys(groups).sort().map(g => {
              const isSelected = selectedGroups.includes(g);
              return (
                <SidebarItem
                    key={g}
                    label={g}
                    count={groups[g].length}
                    active={isSelected}
                    onClick={() => onToggleGroup(g, !isSelected)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        setGroupContextMenu({ x: e.clientX, y: e.clientY, group: g });
                    }}
                />
              );
            })}
            {Object.keys(groups).length === 0 && (
              <div style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', fontStyle: 'italic', paddingLeft: '4px' }}>
                No groups.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Log Area - Table Layout */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        background: 'var(--color-bg-app)', // Seamless with sidebar
      }}>

        {/* Toolbar */}
        <div style={{
          padding: '16px 32px',
          borderBottom: 'var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Composition</h2>
             <span style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>
                {log.length}
             </span>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            {manualRemoves.length > 0 && (
               <ToolbarButton label="Undo" onClick={onUndoRemove} />
            )}
            <ToolbarButton label="Reset" onClick={onResetManual} />
            <ToolbarButton label="Copy" onClick={handleCopy} />
            <ToolbarButton label="Draft Bridge" onClick={handleDraftBridge} primary />
          </div>
        </div>

        {/* Header Row */}
        <div style={{
            display: 'flex',
            padding: '10px 32px', // Match side padding of content
            borderBottom: 'var(--border-subtle)',
            background: 'rgba(255,255,255,0.02)',
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--color-text-tertiary)',
            gap: '16px',
            paddingRight: '48px' // Account for scrollbar/padding
        }}>
            <SortableHeader label="Name" sortKey="name" currentSort={sortConfig} onSort={handleSort} flex={1.5} paddingLeft="40px" />
            <SortableHeader label="Job Title" sortKey="title" currentSort={sortConfig} onSort={handleSort} flex={1} />
            <SortableHeader label="Email" sortKey="email" currentSort={sortConfig} onSort={handleSort} flex={1.2} />
            <SortableHeader label="Phone" sortKey="phone" currentSort={sortConfig} onSort={handleSort} flex={1} />
            <SortableHeader label="Groups" sortKey="groups" currentSort={sortConfig} onSort={handleSort} flex={1} />
            <div style={{ width: '80px', textAlign: 'right' }}>Actions</div>
        </div>

        {/* List */}
        <div style={{
          flex: 1,
          overflow: 'hidden', // AutoSizer handles scrolling
          padding: '0' // Content has its own padding
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
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={log.length}
                  itemSize={50}
                  width={width}
                  itemData={{ log, contactMap, emailToGroups, onRemoveManual, onAddToContacts: handleAddToContacts }}
                >
                  {VirtualRow}
                </List>
              )}
            </AutoSizer>
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
              <Input
                  autoFocus
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="e.g. Marketing"
                  required
                  style={{ marginBottom: '16px' }}
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
                            const success = await window.api?.removeGroup(groupToDelete);
                            if (success) {
                                 if (selectedGroups.includes(groupToDelete)) {
                                     onToggleGroup(groupToDelete, false);
                                 }
                                 showToast(`Group "${groupToDelete}" deleted`, 'success');
                            } else {
                                showToast('Failed to delete group', 'error');
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
                                const success = await window.api?.renameGroup(groupToRename, renameConflict);
                                if (success) {
                                    if (selectedGroups.includes(groupToRename)) {
                                        onToggleGroup(groupToRename, false);
                                        onToggleGroup(renameConflict, true);
                                    }
                                    showToast(`Merged "${groupToRename}" into "${renameConflict}"`, 'success');
                                } else {
                                    showToast('Failed to merge groups', 'error');
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
              if (groupToRename && renamedGroupName && renamedGroupName !== groupToRename) {
                  if (groups[renamedGroupName]) {
                      setRenameConflict(renamedGroupName);
                      return;
                  }

                  const success = await window.api?.renameGroup(groupToRename, renamedGroupName);
                  if (success) {
                      if (selectedGroups.includes(groupToRename)) {
                           onToggleGroup(groupToRename, false);
                           onToggleGroup(renamedGroupName, true);
                      }
                      showToast(`Renamed "${groupToRename}" to "${renamedGroupName}"`, 'success');
                  } else {
                      showToast('Failed to rename group', 'error');
                  }
              }
              setGroupToRename(null);
          }}>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Group Name</label>
              <Input
                  autoFocus
                  value={renamedGroupName}
                  onChange={e => setRenamedGroupName(e.target.value)}
                  required
                  style={{ marginBottom: '16px' }}
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
           <ContextMenu
               x={groupContextMenu.x}
               y={groupContextMenu.y}
               onClose={() => setGroupContextMenu(null)}
               items={[
                   {
                       label: 'Rename',
                       onClick: () => {
                           setGroupToRename(groupContextMenu.group);
                           setRenamedGroupName(groupContextMenu.group);
                       },
                       icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                   },
                   {
                       label: 'Delete Group',
                       onClick: () => setGroupToDelete(groupContextMenu.group),
                       danger: true,
                       icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                   }
               ]}
           />
       )}

    </div>
  );
};
