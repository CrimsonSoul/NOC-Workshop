import React, { useState, memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact } from '@shared/ipc';
import { ContactCard } from '../components/ContactCard';

type Props = {
  contacts: Contact[];
  onAddToAssembler: (contact: Contact) => void;
};

// Extracted Row Component for performance
const ContactRow = memo(({ index, style, data }: ListChildComponentProps<{
  filtered: Contact[],
  recentlyAdded: Set<string>,
  onAdd: (contact: Contact) => void
}>) => {
  const { filtered, recentlyAdded, onAdd } = data;
  const contact = filtered[index];
  const added = recentlyAdded.has(contact.email);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(contact);
  };

  const actionButton = (
    <button
      onClick={handleAdd}
      style={{
        padding: '6px 16px', // Pill shape padding
        borderRadius: '20px', // Pill shape
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
  );

  return (
    <ContactCard
      style={style}
      name={contact.name}
      email={contact.email}
      title={contact.title}
      phone={contact.phone}
      action={actionButton}
    />
  );
});

export const DirectoryTab: React.FC<Props> = ({ contacts, onAddToAssembler }) => {
  const [search, setSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

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

      {/* Search Header */}
      <div style={{
        padding: '16px',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
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
            outline: 'none',
            padding: '8px 0'
          }}
        />
        {filtered.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)' }}>
            {filtered.length} matches
          </div>
        )}
      </div>

      {/* Header Row - Updated to match ContactCard layout roughly */}
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
        <div style={{ width: '62px' }}></div> {/* Avatar space (42px + 20px mr) */}
        <div style={{ flex: 1.2, paddingRight: '16px' }}>Name & Role</div>
        <div style={{ flex: 1.5, paddingRight: '16px' }}>Contact</div>
        <div style={{ minWidth: '80px', textAlign: 'center' }}>Action</div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={72} // Matched to ContactCard height
              width={width}
              itemData={{ filtered, recentlyAdded, onAdd: handleAddWrapper }}
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
    </div>
  );
};
