import React, { useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact } from '@shared/ipc';
import { TactileButton } from '../components/TactileButton';

type Props = {
  contacts: Contact[];
  onAddToAssembler: (contact: Contact) => void;
};

export const DirectoryTab: React.FC<Props> = ({ contacts, onAddToAssembler }) => {
  const [search, setSearch] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());

  const filtered = contacts.filter(c =>
    !search || c._searchString.includes(search.toLowerCase())
  );

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const contact = filtered[index];
    const added = recentlyAdded.has(contact.email);

    const handleAdd = () => {
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
      <div style={{
        ...style,
        padding: '0 8px'
      }}>
        <div
          className="contact-card"
          style={{
            height: '62px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            background: 'var(--color-glass)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--color-glass-hover)';
            e.currentTarget.style.borderColor = 'var(--text-tertiary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--color-glass)';
            e.currentTarget.style.borderColor = 'var(--color-border)';
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {contact.name}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                {contact.email}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {contact.department || 'Unknown Dept'}
            </div>
          </div>

          <TactileButton
            variant={added ? 'primary' : 'secondary'}
            onClick={handleAdd}
            active={added}
            style={{
              padding: '6px 16px',
              fontSize: '11px',
              minWidth: '80px'
            }}
          >
            {added ? 'ADDED' : 'ADD +'}
          </TactileButton>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>

      {/* Search Header */}
      <div style={{ position: 'relative' }}>
        <input
          placeholder="Filter directory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{
            width: '100%',
            fontSize: '16px',
            padding: '16px 24px',
            paddingLeft: '48px',
            background: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            outline: 'none',
            fontFamily: 'var(--font-sans)',
            fontWeight: 400
          }}
        />
        <div style={{
          position: 'absolute',
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--text-tertiary)'
        }}>
          🔍
        </div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1, margin: '0 -8px' }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={72} // Height + Gap
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
        {filtered.length === 0 && (
          <div style={{
            height: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            fontStyle: 'italic'
          }}>
            No results found.
          </div>
        )}
      </div>
    </div>
  );
};
