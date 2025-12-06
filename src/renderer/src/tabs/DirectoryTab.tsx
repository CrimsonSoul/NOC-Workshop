import React, { useState, memo } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact } from '@shared/ipc';

type Props = {
  contacts: Contact[];
  onAddToAssembler: (contact: Contact) => void;
};

// Avatar placeholder generator
const getAvatarColor = (name: string) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
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
  const avatarColor = getAvatarColor(contact.name);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(contact);
  };

  return (
    <div style={{
      ...style,
      padding: '0'
    }}>
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          background: 'transparent',
          borderBottom: 'var(--border-subtle)',
          transition: 'background 0.15s',
          cursor: 'default'
        }}
        className="directory-row"
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent';
        }}
      >
        {/* Avatar */}
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: `rgba(${parseInt(avatarColor.slice(1,3), 16)}, ${parseInt(avatarColor.slice(3,5), 16)}, ${parseInt(avatarColor.slice(5,7), 16)}, 0.2)`,
          color: avatarColor,
          border: `1px solid ${avatarColor}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 600,
          marginRight: '16px',
          flexShrink: 0
        }}>
          {getInitials(contact.name)}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {contact.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.title || contact.department || 'No Title'}
          </div>
        </div>

        {/* Email */}
        <div style={{
          flex: 1,
          minWidth: 0,
          fontSize: '13px',
          fontFamily: 'var(--font-family-mono)',
          color: 'var(--color-text-secondary)',
          opacity: 0.8
        }}>
          {contact.email}
        </div>

        {/* Action */}
        <button
          onClick={handleAdd}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: added ? '1px solid var(--color-accent-green)' : '1px solid var(--border-subtle)',
            background: added ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
            color: added ? 'var(--color-accent-green)' : 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            minWidth: '70px',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onMouseEnter={(e) => {
            if (!added) {
              e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
              e.currentTarget.style.color = 'var(--color-accent-blue)';
            }
          }}
          onMouseLeave={(e) => {
            if (!added) {
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }
          }}
        >
          {added ? 'Added' : 'Add'}
        </button>
      </div>
    </div>
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

      {/* Header Row */}
      <div style={{
        display: 'flex',
        padding: '12px 16px',
        borderBottom: 'var(--border-subtle)',
        background: 'rgba(255,255,255,0.02)',
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'var(--color-text-tertiary)'
      }}>
        <div style={{ width: '52px' }}></div> {/* Avatar space */}
        <div style={{ flex: 1 }}>Name & Role</div>
        <div style={{ flex: 1 }}>Contact</div>
        <div style={{ width: '70px', textAlign: 'center' }}>Action</div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={64} // Row height
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
