import React, { useState, memo, useRef, useEffect, useMemo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact, GroupMap } from '@shared/ipc';
import { ContactCard } from '../components/ContactCard'; // This is now the dense row
import { AddContactModal } from '../components/AddContactModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { Input } from '../components/Input';
import { ContextMenu } from '../components/ContextMenu';

type Props = {
  contacts: Contact[];
  groups: GroupMap; // Need groups to show selector
  onAddToAssembler: (contact: Contact) => void;
};

// --- Group Selector Popover ---
const GroupSelector = ({ contact, groups, onClose }: { contact: Contact, groups: GroupMap, onClose: () => void }) => {
  const [membership, setMembership] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mem: Record<string, boolean> = {};
    Object.entries(groups).forEach(([gName, emails]) => {
      mem[gName] = emails.includes(contact.email);
    });
    setMembership(mem);
  }, [contact, groups]);

  const toggleGroup = async (group: string, current: boolean) => {
    // Optimistic update
    setMembership(prev => ({ ...prev, [group]: !current }));

    if (current) {
      await window.api?.removeContactFromGroup(group, contact.email);
    } else {
      await window.api?.addContactToGroup(group, contact.email);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      width: '200px',
      background: 'var(--color-bg-surface)',
      border: 'var(--border-subtle)',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      zIndex: 100,
      padding: '8px',
      marginTop: '4px'
    }} onClick={e => e.stopPropagation()}>
       <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-tertiary)', padding: '4px 8px', marginBottom: '4px' }}>
          ADD TO GROUP
       </div>
       <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
          {Object.keys(groups).map(g => (
            <div key={g}
              onClick={() => toggleGroup(g, membership[g])}
              style={{
                padding: '6px 8px',
                fontSize: '13px',
                color: 'var(--color-text-primary)',
                borderRadius: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{
                width: '14px',
                height: '14px',
                borderRadius: '3px',
                border: membership[g] ? 'none' : '1px solid var(--color-text-tertiary)',
                background: membership[g] ? 'var(--color-accent-blue)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                 {membership[g] && <span style={{fontSize: '10px', color: '#FFF'}}>✓</span>}
              </div>
              {g}
            </div>
          ))}
          {Object.keys(groups).length === 0 && (
             <div style={{ padding: '8px', fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
               No groups available
             </div>
          )}
       </div>
       <div style={{ borderTop: 'var(--border-subtle)', marginTop: '8px', paddingTop: '8px' }}>
         <div
           onClick={onClose}
           style={{
             fontSize: '12px',
             color: 'var(--color-text-secondary)',
             textAlign: 'center',
             cursor: 'pointer',
             padding: '4px'
           }}
           onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text-primary)'}
           onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-secondary)'}
         >
           Close
         </div>
       </div>
    </div>
  );
};

// Extracted Row Component (react-window renderer)
const VirtualRow = memo(({ index, style, data }: ListChildComponentProps<{
  filtered: Contact[],
  recentlyAdded: Set<string>,
  onAdd: (contact: Contact) => void,
  groups: GroupMap,
  emailToGroups: Map<string, string[]>,
  onContextMenu: (e: React.MouseEvent, contact: Contact) => void
}>) => {
  const { filtered, recentlyAdded, onAdd, groups, emailToGroups, onContextMenu } = data;
  const contact = filtered[index];
  const added = recentlyAdded.has(contact.email);
  const [showGroups, setShowGroups] = useState(false);
  const membership = emailToGroups.get(contact.email.toLowerCase()) || [];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(contact);
  };

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!showGroups) return;
    const clickHandler = (e: MouseEvent) => {
       if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
          setShowGroups(false);
       }
    };
    document.addEventListener('click', clickHandler);
    return () => document.removeEventListener('click', clickHandler);
  }, [showGroups]);

  const actionButtons = (
    <div ref={wrapperRef} style={{ display: 'flex', gap: '8px', position: 'relative', alignItems: 'center' }}>
      {/* Group Button */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowGroups(!showGroups); }}
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
        title="Manage Groups"
        className="hover-bg"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
      </button>

      {showGroups && (
         <GroupSelector contact={contact} groups={groups} onClose={() => setShowGroups(false)} />
      )}

      {/* Add to List Button */}
      <button
        onClick={handleAdd}
        style={{
          background: added ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          border: added ? '1px solid var(--color-accent-green)' : '1px solid var(--border-subtle)',
          color: added ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
          borderRadius: '4px',
          padding: '2px 8px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        className={!added ? "hover-bg" : ""}
      >
        {added ? 'ADDED' : 'ADD'}
      </button>
    </div>
  );

  return (
    <div
        style={style}
        onContextMenu={(e) => onContextMenu(e, contact)}
    >
        <ContactCard
          name={contact.name}
          email={contact.email}
          title={contact.title}
          phone={contact.phone}
          groups={membership}
          action={actionButtons}
        />
    </div>
  );
});

export const DirectoryTab: React.FC<Props> = ({ contacts, groups, onAddToAssembler }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Optimistic State
  const [optimisticAdds, setOptimisticAdds] = useState<Contact[]>([]);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<Contact>>>(new Map());
  const [optimisticDeletes, setOptimisticDeletes] = useState<Set<string>>(new Set());

  // Edit/Delete State
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, contact: Contact} | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Contact | null>(null);

  // Sync state on real update
  useEffect(() => {
    setOptimisticAdds([]);
    setOptimisticUpdates(new Map());
    setOptimisticDeletes(new Set());
  }, [contacts]);

  const effectiveContacts = useMemo(() => {
      let result = [...contacts];
      result = result.filter(c => !optimisticDeletes.has(c.email));
      result = result.map(c => {
          const update = optimisticUpdates.get(c.email);
          if (update) return { ...c, ...update };
          return c;
      });
      result = [...optimisticAdds, ...result];
      const seen = new Set();
      const deduped: Contact[] = [];
      for (const c of result) {
          if (!seen.has(c.email)) {
              seen.add(c.email);
              deduped.push(c);
          }
      }
      return deduped;
  }, [contacts, optimisticAdds, optimisticUpdates, optimisticDeletes]);

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

  // Close context menu on click elsewhere
  useEffect(() => {
      if (contextMenu) {
          const handler = () => setContextMenu(null);
          window.addEventListener('click', handler);
          return () => window.removeEventListener('click', handler);
      }
      return;
  }, [contextMenu]);

  const filtered = contacts.filter(c =>
    !search || c._searchString.includes(search.toLowerCase())
  );

  const handleAddWrapper = (contact: Contact) => {
    onAddToAssembler(contact);
    setRecentlyAdded(prev => new Set(prev).add(contact.email));
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(contact.email);
        return newSet;
      });
    }, 2000);
  };

  const handleCreateContact = async (contact: Partial<Contact>) => {
    // Optimistic Add
    const newContact = {
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        title: contact.title || '',
        _searchString: (contact.name + contact.email + contact.title + contact.phone).toLowerCase(),
        avatar: undefined
    } as Contact;

    setOptimisticAdds(prev => [newContact, ...prev]);
    setIsAddModalOpen(false);

    const success = await window.api?.addContact(contact);
    if (!success) {
        setOptimisticAdds(prev => prev.filter(c => c.email !== contact.email)); // Revert
        showToast('Failed to create contact', 'error');
    }
  };

  const handleUpdateContact = async (updated: Partial<Contact>) => {
      if (updated.email) {
          setOptimisticUpdates(prev => new Map(prev).set(updated.email!, updated));
      }
      setEditingContact(null);

      const success = await window.api?.addContact(updated);
      if (!success) {
          if (updated.email) {
             setOptimisticUpdates(prev => {
                 const next = new Map(prev);
                 next.delete(updated.email!);
                 return next;
             });
          }
          showToast('Failed to update contact', 'error');
      }
  }

  const handleDeleteContact = async () => {
      if (deleteConfirmation) {
          const email = deleteConfirmation.email;
          setOptimisticDeletes(prev => new Set(prev).add(email));
          setDeleteConfirmation(null);

          const success = await window.api?.removeContact(email);
          if (!success) {
              setOptimisticDeletes(prev => {
                  const next = new Set(prev);
                  next.delete(email);
                  return next;
              });
              showToast('Failed to delete contact', 'error');
          }
      }
  };

  const onContextMenu = (e: React.MouseEvent, contact: Contact) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, contact });
  };

  return (
    <div className="glass-panel" style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      borderRadius: '12px',
      overflow: 'hidden',
      background: 'var(--color-bg-card)',
      border: 'var(--border-subtle)'
    }}>

      {/* Header / Actions */}
      <div style={{
        padding: '12px 16px',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Input
          placeholder="Search people..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>}
          style={{ width: '300px' }}
        />

        {filtered.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {filtered.length} matches
          </div>
        )}
         <div style={{flex:1}}></div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="tactile-button"
          style={{ background: 'var(--color-accent-blue)', borderColor: 'transparent', color: '#FFF' }}
        >
          Add Contact
        </button>
      </div>

      {/* Header Row - Matching ContactCard Columns */}
      <div style={{
        display: 'flex',
        padding: '10px 16px',
        borderBottom: 'var(--border-subtle)',
        background: 'rgba(255,255,255,0.02)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)',
        gap: '16px'
      }}>
        <div style={{ flex: 1.5, paddingLeft: '40px' }}>Name</div> {/* +40px for avatar space */}
        <div style={{ flex: 1 }}>Job Title</div>
        <div style={{ flex: 1.2 }}>Email</div>
        <div style={{ flex: 1 }}>Groups</div>
        <div style={{ width: '80px', textAlign: 'right' }}>Actions</div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={50} // Denser row height
              width={width}
              itemData={{ filtered, recentlyAdded, onAdd: handleAddWrapper, groups, emailToGroups, onContextMenu }}
            >
              {VirtualRow}
            </List>
          )}
        </AutoSizer>
        {filtered.length === 0 && (
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-tertiary)',
            fontStyle: 'italic',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '24px', opacity: 0.3 }}>∅</div>
            <div>No contacts found</div>
          </div>
        )}
      </div>

      <AddContactModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateContact}
      />

      <AddContactModal
        isOpen={!!editingContact}
        onClose={() => setEditingContact(null)}
        onSave={handleUpdateContact}
        editContact={editingContact || undefined}
      />

      <Modal
        isOpen={!!deleteConfirmation}
        onClose={() => setDeleteConfirmation(null)}
        title="Delete Contact"
        width="400px"
      >
           <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                Are you sure you want to delete <span style={{ fontWeight: 600 }}>{deleteConfirmation?.name || deleteConfirmation?.email}</span>?
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                This action cannot be undone.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                <button
                    onClick={() => setDeleteConfirmation(null)}
                    className="tactile-button"
                >
                    Cancel
                </button>
                <button
                    onClick={handleDeleteContact}
                    className="tactile-button"
                    style={{ background: '#EF4444', borderColor: 'transparent', color: '#FFF' }}
                >
                    Delete Contact
                </button>
            </div>
        </div>
      </Modal>

      {/* Context Menu */}
      {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
                {
                    label: 'Edit Contact',
                    onClick: () => setEditingContact(contextMenu.contact),
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                },
                {
                    label: 'Delete',
                    onClick: () => setDeleteConfirmation(contextMenu.contact),
                    danger: true,
                    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                }
            ]}
          />
      )}
    </div>
  );
};
