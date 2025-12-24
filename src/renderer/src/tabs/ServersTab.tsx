import React, { useState, useMemo, memo, useCallback } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { Server, Contact } from '@shared/ipc';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from '../components/Input';
import { ContextMenu } from '../components/ContextMenu';
import { AddServerModal } from '../components/AddServerModal';
import { ToolbarButton } from '../components/ToolbarButton';
import { TactileButton } from '../components/TactileButton';
import { ServerCard } from '../components/ServerCard';
import { CollapsibleHeader } from '../components/CollapsibleHeader';

interface ServersTabProps {
  servers: Server[];
  contacts: Contact[];
}

// Row Component Wrapper for react-window
const VirtualRow = memo(({ index, style, data }: ListChildComponentProps<{
  servers: Server[],
  contactLookup: Map<string, Contact>,
  onContextMenu: (e: React.MouseEvent, server: Server) => void
}>) => {
  const { servers, contactLookup, onContextMenu } = data;
  if (index >= servers.length) return null;

  const server = servers[index];

  return (
    <ServerCard
      style={style}
      server={server}
      contactLookup={contactLookup}
      onContextMenu={onContextMenu}
    />
  );
});

export const ServersTab: React.FC<ServersTabProps> = ({ servers, contacts }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, server: Server } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | undefined>(undefined);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  const contactLookup = useMemo(() => {
    const map = new Map<string, Contact>();
    for (const contact of contacts) {
      if (contact.email) map.set(contact.email.toLowerCase(), contact);
      if (contact.name) map.set(contact.name.toLowerCase(), contact);
    }
    return map;
  }, [contacts]);

  const filteredServers = useMemo(() => {
    let result = [...servers];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(s => s._searchString.includes(q));
    }
    return result.sort((a, b) => {
      const valA = (a.name || '').toLowerCase();
      const valB = (b.name || '').toLowerCase();
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [servers, debouncedSearch, sortOrder]);

  const handleContextMenu = useCallback((e: React.MouseEvent, server: Server) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, server });
  }, []);

  const itemData = useMemo(() => ({
    servers: filteredServers,
    contactLookup,
    onContextMenu: handleContextMenu
  }), [filteredServers, contactLookup, handleContextMenu]);

  const handleDelete = async () => {
    if (contextMenu) {
      await window.api.removeServer(contextMenu.server.name);
      setContextMenu(null);
    }
  };

  const handleEdit = () => {
    if (contextMenu) {
      setEditingServer(contextMenu.server);
      setIsAddModalOpen(true);
      setContextMenu(null);
    }
  };

  React.useEffect(() => {
    if (contextMenu) {
      const handler = () => setContextMenu(null);
      window.addEventListener('click', handler);
      return () => window.removeEventListener('click', handler);
    }
    return;
  }, [contextMenu]);

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      padding: '20px 24px 24px 24px',
      background: 'var(--color-bg-app)',
      overflow: 'hidden'
    }}>
      {/* Hero Header */}
      <CollapsibleHeader
        title="Infrastructure Hub"
        subtitle="Management and status of distributed node infrastructure"
        isCollapsed={isHeaderCollapsed}
      >
        <TactileButton
          onClick={() => { setEditingServer(undefined); setIsAddModalOpen(true); }}
          variant="primary"
          style={{ padding: isHeaderCollapsed ? '8px 16px' : '12px 24px', fontSize: '13px', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>}
        >
          ADD SERVER
        </TactileButton>
      </CollapsibleHeader>

      {/* Secondary Action Row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
      }}>
        <Input
          placeholder="Search infrastructure..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
          icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>}
          style={{ width: '340px' }}
        />
        {filteredServers.length > 0 && (
          <div style={{ fontSize: '13px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {filteredServers.length} matches
          </div>
        )}
        <div style={{ flex: 1 }}></div>

        {/* Sort Toggle */}
        <div
          onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
          style={{
            fontSize: '11px',
            fontWeight: 800,
            color: 'var(--color-text-tertiary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 12px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            transition: 'all 0.2s',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = 'var(--color-text-tertiary)';
          }}
        >
          SORT: NAME {sortOrder === 'asc' ? '↑' : '↓'}
        </div>
      </div>

      {/* List Container */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={filteredServers.length}
              itemSize={104} // Standardized card height + gap
              itemData={itemData}
              onScroll={({ scrollOffset }) => setIsHeaderCollapsed(scrollOffset > 30)}
            >
              {VirtualRow}
            </List>
          )}
        </AutoSizer>
        {filteredServers.length === 0 && (
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
            <div>No infrastructure found</div>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          items={[
            { label: 'Edit Server', onClick: handleEdit, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg> },
            { label: 'Delete Server', onClick: handleDelete, danger: true, icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg> }
          ]}
        />
      )}

      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        serverToEdit={editingServer}
      />
    </div>
  );
};
