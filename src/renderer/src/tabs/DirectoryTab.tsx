import React, { useState } from 'react';
import { FixedSizeList as List } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Contact } from '@shared/ipc';
import { TactileButton, Input } from '../components';

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
        padding: '0 var(--space-md)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: 'var(--border-subtle)',
        background: index % 2 === 0 ? 'var(--color-charcoal-hover)' : 'transparent'
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '18px' }}>
            {contact.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '14px', color: 'var(--text-secondary)' }}>
            {contact.department} • {contact.email}
          </div>
        </div>
        <TactileButton
          variant={added ? 'primary' : 'secondary'}
          onClick={handleAdd}
          active={added}
          style={{ padding: '6px 14px', fontSize: '12px' }}
        >
          {added ? '✓  ADDED' : 'ADD +'}
        </TactileButton>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 'var(--space-lg)' }}>
        <Input
          placeholder="Search the directory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          style={{ fontSize: '24px', fontFamily: 'var(--font-serif)', padding: 'var(--space-md) 0' }}
        />
      </div>

      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={70}
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
        {filtered.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No personnel found matching that frequency.
          </div>
        )}
      </div>
    </div>
  );
};
