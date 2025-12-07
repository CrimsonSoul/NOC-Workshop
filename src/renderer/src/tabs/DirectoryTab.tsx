import React, { useState, memo, useRef, useEffect } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact, GroupMap } from '@shared/ipc';
import { ContactCard } from '../components/ContactCard';
import { AddContactModal } from '../components/AddContactModal';

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
      background: 'var(--color-bg-card)',
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


// Extracted Row Component
const ContactRow = memo(({ index, style, data }: ListChildComponentProps<{
  filtered: Contact[],
  recentlyAdded: Set<string>,
  onAdd: (contact: Contact) => void,
  groups: GroupMap
}>) => {
  const { filtered, recentlyAdded, onAdd, groups } = data;
  const contact = filtered[index];
  const added = recentlyAdded.has(contact.email);
  const [showGroups, setShowGroups] = useState(false);

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
    <div ref={wrapperRef} style={{ display: 'flex', gap: '8px', position: 'relative' }}>
      {/* Group Button */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowGroups(!showGroups); }}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          border: '1px solid var(--border-subtle)',
          background: showGroups ? 'rgba(255,255,255,0.1)' : 'transparent',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
        title="Add to Group"
        onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-text-secondary)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
        }}
        onMouseLeave={e => {
           if (!showGroups) {
             e.currentTarget.style.borderColor = 'var(--border-subtle)';
             e.currentTarget.style.color = 'var(--color-text-secondary)';
           }
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
      </button>

      {showGroups && (
         <GroupSelector contact={contact} groups={groups} onClose={() => setShowGroups(false)} />
      )}

      {/* Add to List Button */}
      <button
        onClick={handleAdd}
        style={{
          padding: '6px 16px',
          borderRadius: '20px',
          border: added ? '1px solid var(--color-accent-green)' : '1px solid var(--border-subtle)',
          background: added ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
          color: added ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          minWidth: '80px',
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => {
          if (!added) {
            e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
            e.currentTarget.style.color = 'var(--color-accent-blue)';
            e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
          }
        }}
        onMouseLeave={(e) => {
          if (!added) {
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
            e.currentTarget.style.background = 'transparent';
          }
        }}
      >
        {added ? 'Added' : 'Add'}
      </button>
    </div>
  );

  return (
    <ContactCard
      style={style}
      name={contact.name}
      email={contact.email}
      title={contact.title}
      phone={contact.phone}
      action={actionButtons}
    />
  );
});

export const DirectoryTab: React.FC<Props> = ({ contacts, groups, onAddToAssembler }) => {
  const [search, setSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
    await window.api?.addContact(contact);
    // Reload will happen automatically via file watcher -> IPC -> React State
  };

  const handleImport = async () => {
    const success = await window.api?.importContactsWithMapping();
    if (success) {
      console.log('Import successful');
    }
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
        padding: '16px',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flex: 1,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
          borderRadius: '8px',
          padding: '8px 12px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input
            placeholder="Search network..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              fontSize: '14px',
              color: 'var(--color-text-primary)',
              outline: 'none'
            }}
          />
        </div>

        {filtered.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {filtered.length} matches
          </div>
        )}

        <div style={{ width: '1px', height: '20px', background: 'var(--border-subtle)' }}></div>

        <button
          onClick={handleImport}
          className="tactile-button"
          title="Import CSV"
          style={{ padding: '8px' }}
        >
           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="tactile-button"
          style={{ background: 'var(--color-accent-blue)', borderColor: 'transparent', color: '#FFF' }}
        >
          Add Contact
        </button>
      </div>

      {/* Header Row */}
      <div style={{
        display: 'flex',
        padding: '12px 24px',
        borderBottom: 'var(--border-subtle)',
        background: 'rgba(255,255,255,0.02)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)'
      }}>
        <div style={{ width: '62px' }}></div>
        <div style={{ flex: 1.2, paddingRight: '16px' }}>Name & Role</div>
        <div style={{ flex: 1.5, paddingRight: '16px' }}>Contact</div>
        <div style={{ minWidth: '120px', textAlign: 'center' }}>Actions</div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={72}
              width={width}
              itemData={{ filtered, recentlyAdded, onAdd: handleAddWrapper, groups }}
            >
              {ContactRow}
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
    </div>
  );
};
