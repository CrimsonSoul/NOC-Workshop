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

  const filtered = contacts.filter(c =>
    !search || c._searchString.includes(search.toLowerCase())
  );

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const contact = filtered[index];
    const [added, setAdded] = useState(false);

    const handleAdd = () => {
      onAddToAssembler(contact);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    };

    return (
      <div style={{
        ...style,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        background: index % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent'
      }}>
        <div>
          <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '16px' }}>
            {contact.name}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {contact.department} • {contact.email}
          </div>
        </div>
        <TactileButton
          variant={added ? 'primary' : 'secondary'}
          onClick={handleAdd}
          style={{ padding: '4px 12px', fontSize: '11px' }}
        >
          {added ? 'ADDED' : 'ADD +'}
        </TactileButton>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '16px' }}>
        <input
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            borderBottom: '2px solid var(--text-secondary)',
            fontSize: '32px',
            fontFamily: 'var(--font-serif)',
            color: 'var(--text-primary)',
            padding: '12px 0'
          }}
          placeholder="Search the directory..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
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
