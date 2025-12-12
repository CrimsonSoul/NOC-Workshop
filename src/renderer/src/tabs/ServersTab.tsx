import React, { useState, useMemo, memo, useCallback } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Server, Contact } from '@shared/ipc';
import { useDebounce } from '../hooks/useDebounce';
import { Input } from '../components/Input';
import { ContextMenu } from '../components/ContextMenu';
import { AddServerModal } from '../components/AddServerModal';
import { ToolbarButton } from '../components/ToolbarButton';
import { ResizableHeader } from '../components/ResizableHeader';
import { getColorForString } from '../utils/colors';

interface ServersTabProps {
  servers: Server[];
  contacts: Contact[];
}

type SortField = keyof Server;
type SortOrder = 'asc' | 'desc';

// Default widths
const DEFAULT_WIDTHS = {
  name: 200,
  businessArea: 150,
  lob: 150,
  comment: 200,
  owner: 200,
  contact: 200,
  osType: 100
};

// Default Column Order
const DEFAULT_ORDER: (keyof typeof DEFAULT_WIDTHS)[] = [
    'name', 'businessArea', 'lob', 'comment', 'owner', 'contact', 'osType'
];

// OS Formatter
const formatOS = (val: string | undefined) => {
    if (!val) return '-';
    const lower = val.toLowerCase();
    if (lower.includes('win')) return 'W';
    if (lower.includes('lin')) return 'L';
    if (lower.includes('vmware') || lower.includes('esx')) return 'V';
    // Fallback: First letter capitalized
    const clean = val.trim();
    return clean ? clean.charAt(0).toUpperCase() : '-';
};

// Draggable Header Component
const DraggableHeader = ({ id, children }: { id: string, children: React.ReactNode }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        display: 'flex',
        alignItems: 'center',
        zIndex: isDragging ? 10 : 'auto',
        position: isDragging ? 'relative' : undefined,
        cursor: 'grab'
    } as React.CSSProperties;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

// Row Component
const ServerRow = memo(({ index, style, data }: ListChildComponentProps<{
  servers: Server[],
  contactLookup: Map<string, Contact>,
  columns: typeof DEFAULT_WIDTHS,
  columnOrder: (keyof typeof DEFAULT_WIDTHS)[],
  onContextMenu: (e: React.MouseEvent, server: Server) => void
}>) => {
  const { servers, contactLookup, columns, columnOrder, onContextMenu } = data;
  if (index >= servers.length) return null;

  const server = servers[index];

  const formatValue = (key: keyof typeof DEFAULT_WIDTHS, val: string | undefined) => {
      if (key === 'osType') {
          return formatOS(val);
      }
      if (!val) return '-';
      const s = String(val).trim();
      if (s === '' || s === '0' || s === '#N/A' || s.toLowerCase() === 'nan') return '-';
      return s;
  };

  const resolveContact = (val: string) => {
     if (!val) return null;
     const parts = val.split(';').map(p => p.trim()).filter(p => p);
    const resolvedParts = parts.map(part => {
        const lowerVal = part.toLowerCase();
        const found = contactLookup.get(lowerVal);
        return found ? found : { name: part, email: part };
     });

     return resolvedParts;
  };

  const renderCell = (key: keyof typeof DEFAULT_WIDTHS, width: number) => {
      const rawVal = server[key] || '';
      let content: React.ReactNode = formatValue(key, rawVal);

      if ((key === 'owner' || key === 'contact') && rawVal && content !== '-') {
          const resolvedList = resolveContact(rawVal);

          if (resolvedList && resolvedList.length > 0) {
              const primary = resolvedList[0];
              const displayName = primary.name || primary.email; // Fallback
              const avatarLetter = displayName.charAt(0).toUpperCase();
              const color = getColorForString(displayName);

              // If multiple, join names
              const allNames = resolvedList.map(c => c.name || c.email).join('; ');

              content = (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          background: color, color: '#18181b',
                          fontSize: '10px', fontWeight: 600,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0
                      }}>
                          {avatarLetter}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                           <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: '1.2' }} title={allNames}>
                               {allNames}
                           </span>
                      </div>
                  </div>
              );
          }
      }

      return (
          <div key={key} style={{
              width,
              paddingRight: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '13px',
              color: 'var(--color-text-primary)'
          }}>
              {content}
          </div>
      );
  };

  return (
      <div
        style={{ ...style, display: 'flex', alignItems: 'center', borderBottom: 'var(--border-subtle)', padding: '0 16px', gap: '16px' }}
        onContextMenu={(e) => onContextMenu(e, server)}
        className="contact-row hover-bg"
      >
          {columnOrder.map(key => renderCell(key, columns[key]))}
      </div>
  );
});

export const ServersTab: React.FC<ServersTabProps> = ({ servers, contacts }) => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, server: Server } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingServer, setEditingServer] = useState<Server | undefined>(undefined);

  // Column Widths State (Base pixels)
  const [baseWidths, setBaseWidths] = useState(() => {
      try {
          const saved = localStorage.getItem('relay-servers-columns');
          const parsed = saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
          return { ...DEFAULT_WIDTHS, ...parsed };
      } catch (e) {
          return DEFAULT_WIDTHS;
      }
  });

  const [listWidth, setListWidth] = useState(0);

  const scaledWidths = useMemo(() => {
      if (!listWidth) return baseWidths;

      const totalBaseWidth = Object.values(baseWidths).reduce((a, b) => (a as number) + (b as number), 0) as number;
      // Account for actions/gaps if any (none in ServersTab currently besides standard padding? Row has gap 16px. No actions col)
      // Actually, standard padding: 16px left + 16px right = 32px.
      // Gap between cols: 0 (cols have paddingRight).
      // Let's assume just horizontal padding.
      const availableWidth = listWidth - 32;

      if (availableWidth <= 0) return baseWidths;

      const scale = availableWidth / totalBaseWidth;
      const scaled = { ...baseWidths };
      (Object.keys(scaled) as (keyof typeof DEFAULT_WIDTHS)[]).forEach(k => {
          scaled[k] = Math.floor(baseWidths[k] * scale);
      });
      return scaled;
  }, [baseWidths, listWidth]);


  const [columnOrder, setColumnOrder] = useState<(keyof typeof DEFAULT_WIDTHS)[]>(() => {
      try {
          const saved = localStorage.getItem('relay-servers-order');
          const parsed = saved ? JSON.parse(saved) : DEFAULT_ORDER;
          if (Array.isArray(parsed) && parsed.length === DEFAULT_ORDER.length) return parsed;
          return DEFAULT_ORDER;
      } catch {
          return DEFAULT_ORDER;
      }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleResize = (key: keyof typeof DEFAULT_WIDTHS, width: number) => {
      let newBase = width;
      if (listWidth) {
           const totalBaseWidth = Object.values(baseWidths).reduce((a, b) => (a as number) + (b as number), 0) as number;
           const availableWidth = listWidth - 32;
           // Apply reverse scaling logic always
           if (availableWidth > 0) {
              const scale = availableWidth / totalBaseWidth;
              newBase = width / scale;
           }
      }

      const newWidths = { ...baseWidths, [key]: newBase };
      setBaseWidths(newWidths);
      localStorage.setItem('relay-servers-columns', JSON.stringify(newWidths));
  };

  const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
          setColumnOrder((items) => {
              const oldIndex = items.indexOf(active.id as keyof typeof DEFAULT_WIDTHS);
              const newIndex = items.indexOf(over.id as keyof typeof DEFAULT_WIDTHS);
              const newOrder = arrayMove(items, oldIndex, newIndex);
              localStorage.setItem('relay-servers-order', JSON.stringify(newOrder));
              return newOrder;
          });
      }
  };

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
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
    });
  }, [servers, debouncedSearch, sortField, sortOrder]);

  const handleHeaderSort = (field: any) => {
      if (sortField === field) {
          setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field as SortField);
          setSortOrder('asc');
      }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent, server: Server) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, server });
  }, []);

  const itemData = useMemo(() => ({
    servers: filteredServers,
    contactLookup,
    columns: scaledWidths, // Pass scaled
    columnOrder,
    onContextMenu: handleContextMenu
  }), [filteredServers, contactLookup, scaledWidths, columnOrder, handleContextMenu]);

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

  const LABELS: Record<keyof typeof DEFAULT_WIDTHS, string> = {
      name: 'Name',
      businessArea: 'Business Area',
      lob: 'LOB',
      comment: 'Comment',
      owner: 'Owner',
      contact: 'IT Contact',
      osType: 'OS Type'
  };


  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--color-bg-app)' }}>
      {/* Header / Actions - Matching DirectoryTab Style */}
      <div style={{
        padding: '12px 16px',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search servers..."
          icon={
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          }
          style={{ width: '300px' }}
        />
        {filteredServers.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', whiteSpace: 'nowrap' }}>
            {filteredServers.length} matches
          </div>
        )}
        <div style={{ flex: 1 }}></div>
        <ToolbarButton
            label="ADD SERVER"
            onClick={() => { setEditingServer(undefined); setIsAddModalOpen(true); }}
            primary
        />
      </div>

      {/* Header Row */}
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
          gap: '16px',
          overflow: 'hidden'
      }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
              <SortableContext
                items={columnOrder}
                strategy={horizontalListSortingStrategy}
              >
                  {columnOrder.map(key => (
                      <DraggableHeader key={key} id={key}>
                          <ResizableHeader
                            label={LABELS[key]}
                            width={scaledWidths[key]}
                            sortKey={key}
                            currentSort={{ key: sortField, direction: sortOrder }}
                            onSort={handleHeaderSort}
                            onResize={w => handleResize(key, w)}
                          />
                      </DraggableHeader>
                  ))}
              </SortableContext>
          </DndContext>
      </div>

      {/* List */}
      <div style={{ flex: 1 }}>
        <AutoSizer onResize={({ width }) => setListWidth(width)}>
          {({ height, width }) => (
            <List
              height={height}
              width={width}
              itemCount={filteredServers.length}
              itemSize={50} // Denser row
              itemData={itemData}
            >
              {ServerRow}
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
