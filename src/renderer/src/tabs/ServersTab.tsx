import React, { useState, useMemo } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List } from 'react-window';
import { Server, Contact } from '@shared/ipc';
import { Input } from '../components/Input';
import { ContextMenu } from '../components/ContextMenu';
import { AddServerModal } from '../components/AddServerModal';
import { TactileButton } from '../components/TactileButton';
import { ToolbarButton } from '../components/ToolbarButton';

interface ServersTabProps {
  servers: Server[];
  contacts: Contact[];
}

type SortField = keyof Server;
type SortOrder = 'asc' | 'desc';

export const ServersTab: React.FC<ServersTabProps> = ({ servers, contacts }) => {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, server: Server } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | undefined>(undefined);

  // Column config
  const COLUMNS: { id: SortField, label: string, width: string | number }[] = [
      { id: 'name', label: 'Name', width: '15%' },
      { id: 'businessArea', label: 'Business Area', width: '12%' },
      { id: 'lob', label: 'LOB', width: '10%' },
      { id: 'comment', label: 'Comment', width: '15%' },
      { id: 'owner', label: 'Owner', width: '15%' },
      { id: 'contact', label: 'IT Contact', width: '15%' },
      { id: 'osType', label: 'OS Type', width: '8%' },
      { id: 'os', label: 'OS', width: '10%' },
  ];

  // Helper to resolve email to contact
  const resolveContact = (email: string) => {
      if (!email) return null;
      const match = contacts.find(c => c.email.toLowerCase() === email.toLowerCase());
      return match || { name: email, email: email, phone: '', title: '' }; // Fallback to email as name if not found
  };

  const filteredServers = useMemo(() => {
    let result = servers;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s => s._searchString.includes(q));
    }
    return result.sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [servers, search, sortField, sortOrder]);

  const handleHeaderClick = (field: SortField) => {
      if (sortField === field) {
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortOrder('asc');
      }
  };

  const handleContextMenu = (e: React.MouseEvent, server: Server) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, server });
  };

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

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const server = filteredServers[index];

    // Render cells
    const renderCell = (colId: SortField) => {
        const val = server[colId];
        if (colId === 'owner' || colId === 'contact') {
            const email = val as string;
            const contact = resolveContact(email);
            if (!contact) return <span style={{ opacity: 0.3 }}>-</span>;

            // If it's a resolved contact, show name (and maybe a tooltip or small avatar indicator if we had one)
            // For now just name, or email if name missing
            const display = (contact as any).name || contact.email;
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }} title={email}>
                   {/* Simple circle avatar placeholder */}
                   <div style={{
                       width: 16, height: 16, borderRadius: '50%',
                       background: 'var(--color-accent-blue)', color: 'white',
                       fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                       flexShrink: 0
                   }}>
                       {display.charAt(0).toUpperCase()}
                   </div>
                   <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                       {display}
                   </span>
                </div>
            );
        }
        return <span title={val as string}>{val as string}</span>;
    };

    return (
      <div
        style={{ ...style, display: 'flex', alignItems: 'center', borderBottom: 'var(--border-subtle)', padding: '0 16px' }}
        onContextMenu={(e) => handleContextMenu(e, server)}
        className="hover-bg"
      >
        {COLUMNS.map(col => (
             <div key={col.id} style={{ width: col.width, paddingRight: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                 {renderCell(col.id)}
             </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-app)' }}>
      {/* Toolbar */}
      <div style={{
          height: '60px', borderBottom: 'var(--border-subtle)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', padding: '0 24px'
      }}>
        <div style={{ width: '320px' }}>
             <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search servers..."
                icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                }
             />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <ToolbarButton
                onClick={() => { setEditingServer(undefined); setIsAddModalOpen(true); }}
                icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>}
            >
                ADD SERVER
            </ToolbarButton>
        </div>
      </div>

      {/* Header */}
      <div style={{
          height: '40px', borderBottom: 'var(--border-subtle)', display: 'flex',
          alignItems: 'center', padding: '0 16px', fontSize: '12px',
          fontWeight: 600, color: 'var(--color-text-tertiary)', background: 'rgba(255,255,255,0.01)'
      }}>
          {COLUMNS.map(col => (
               <div
                 key={col.id}
                 style={{ width: col.width, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                 onClick={() => handleHeaderClick(col.id)}
               >
                   {col.label}
                   {sortField === col.id && (
                       <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                   )}
               </div>
          ))}
      </div>

      {/* List */}
      <div style={{ flex: 1 }}>
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={filteredServers.length}
              itemSize={48}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={() => setContextMenu(null)}
            items={[
                { label: 'Edit Server', onClick: handleEdit },
                { label: 'Delete Server', onClick: handleDelete, danger: true }
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
