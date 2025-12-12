import React, { useState, memo, useRef, useEffect, useMemo, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Contact, GroupMap } from '@shared/ipc';
import { useDebounce } from '../hooks/useDebounce';
import { useGroupMaps } from '../hooks/useGroupMaps';
import { ContactCard } from '../components/ContactCard';
import { AddContactModal } from '../components/AddContactModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ToolbarButton } from '../components/ToolbarButton';
import { Input } from '../components/Input';
import { TactileButton } from '../components/TactileButton';
import { ContextMenu } from '../components/ContextMenu';
import { ResizableHeader } from '../components/ResizableHeader';

type Props = {
  contacts: Contact[];
  groups: GroupMap;
  onAddToAssembler: (contact: Contact) => void;
};

// Default Column Widths (px)
const DEFAULT_WIDTHS = {
    name: 250,
    title: 150,
    email: 200,
    phone: 150,
    groups: 150
};

const DEFAULT_ORDER: (keyof typeof DEFAULT_WIDTHS)[] = ['name', 'title', 'email', 'phone', 'groups'];

type SortConfig = {
    key: keyof typeof DEFAULT_WIDTHS;
    direction: 'asc' | 'desc';
};

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
        cursor: 'grab',
        touchAction: 'none'
    } as React.CSSProperties;

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {children}
        </div>
    );
};

const GroupSelector = ({ contact, groups, onClose }: { contact: Contact, groups: GroupMap, onClose: () => void }) => {
  const [membership, setMembership] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const mem: Record<string, boolean> = {};
    const contactEmail = contact.email.toLowerCase();
    Object.entries(groups).forEach(([gName, emails]) => {
      mem[gName] = emails.some(e => e.toLowerCase() === contactEmail);
    });
    setMembership(mem);
  }, [contact, groups]);

  const toggleGroup = async (group: string, current: boolean) => {
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

const VirtualRow = memo(({ index, style, data }: ListChildComponentProps<{
  filtered: Contact[],
  recentlyAdded: Set<string>,
  onAdd: (contact: Contact) => void,
  groups: GroupMap,
  groupMap: Map<string, string[]>,
  onContextMenu: (e: React.MouseEvent, contact: Contact) => void,
  columnWidths: typeof DEFAULT_WIDTHS,
  columnOrder: (keyof typeof DEFAULT_WIDTHS)[]
}>) => {
  const { filtered, recentlyAdded, onAdd, groups, groupMap, onContextMenu, columnWidths, columnOrder } = data;

  const [showGroups, setShowGroups] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  if (index >= filtered.length) return <div style={style} />;

  const contact = filtered[index];
  const added = recentlyAdded.has(contact.email);
  const membership = groupMap.get(contact.email.toLowerCase()) || [];

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd(contact);
  };

  const actionButtons = (
    <div ref={wrapperRef} style={{ display: 'flex', gap: '8px', position: 'relative', alignItems: 'center' }}>
      <TactileButton
        onClick={(e) => { e.stopPropagation(); setShowGroups(!showGroups); }}
        style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
        active={showGroups}
      >
        GROUPS
      </TactileButton>

      {showGroups && (
         <GroupSelector contact={contact} groups={groups} onClose={() => setShowGroups(false)} />
      )}

      <TactileButton
        onClick={handleAdd}
        style={{
          padding: '2px 8px',
          fontSize: '11px',
          height: '24px',
          borderColor: added ? 'var(--color-accent-green)' : undefined,
          color: added ? 'var(--color-accent-green)' : undefined,
          background: added ? 'rgba(16, 185, 129, 0.1)' : undefined
        }}
      >
        {added ? 'ADDED' : 'ADD'}
      </TactileButton>
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
          columnWidths={columnWidths}
          columnOrder={columnOrder}
        />
    </div>
  );
});

export const DirectoryTab: React.FC<Props> = ({ contacts, groups, onAddToAssembler }) => {
  const { showToast } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

  // Use state for base widths (pixels), but scale them on render if needed
  const [baseWidths, setBaseWidths] = useState(() => {
      try {
          const saved = localStorage.getItem('relay-directory-columns');
          const parsed = saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
          return { ...DEFAULT_WIDTHS, ...parsed };
      } catch (e) {
          return DEFAULT_WIDTHS;
      }
  });

  // Track scaling
  const [listWidth, setListWidth] = useState(0);

  const scaledWidths = useMemo(() => {
      if (!listWidth) return baseWidths;

      const totalBaseWidth = Object.values(baseWidths).reduce((a, b) => (a as number) + (b as number), 0) as number;
      // Account for actions column (80px) and gap/padding (~32px)
      const availableWidth = listWidth - 80 - 32;

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
          const saved = localStorage.getItem('relay-directory-order');
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
      // When user manually resizes, we update the BASE width.
      // We reverse the scale to save "true" preference.

      let newBase = width;
      if (listWidth) {
           const totalBaseWidth = Object.values(baseWidths).reduce((a, b) => (a as number) + (b as number), 0) as number;
           const availableWidth = listWidth - 80 - 32;
           // Apply reverse scaling logic always since we scale both up and down now
           if (availableWidth > 0) {
              const scale = availableWidth / totalBaseWidth;
              newBase = width / scale;
           }
      }

      const newWidths = { ...baseWidths, [key]: newBase };
      setBaseWidths(newWidths);
      localStorage.setItem('relay-directory-columns', JSON.stringify(newWidths));
  };

  const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
          setColumnOrder((items) => {
              const oldIndex = items.indexOf(active.id as keyof typeof DEFAULT_WIDTHS);
              const newIndex = items.indexOf(over.id as keyof typeof DEFAULT_WIDTHS);
              const newOrder = arrayMove(items, oldIndex, newIndex);
              localStorage.setItem('relay-directory-order', JSON.stringify(newOrder));
              return newOrder;
          });
      }
  };

  const handleSort = (key: keyof typeof DEFAULT_WIDTHS) => {
      setSortConfig(current => {
          if (current.key === key) {
              return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          }
          return { key, direction: 'asc' };
      });
  };

  const [optimisticAdds, setOptimisticAdds] = useState<Contact[]>([]);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Map<string, Partial<Contact>>>(new Map());
  const [optimisticDeletes, setOptimisticDeletes] = useState<Set<string>>(new Set());

  const [contextMenu, setContextMenu] = useState<{x: number, y: number, contact: Contact} | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<Contact | null>(null);

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

  const { groupMap, groupStringMap } = useGroupMaps(groups);

  useEffect(() => {
      if (contextMenu) {
          const handler = () => setContextMenu(null);
          window.addEventListener('click', handler);
          return () => window.removeEventListener('click', handler);
      }
      return;
  }, [contextMenu]);

  const filtered = useMemo(() => {
      let res = effectiveContacts.filter(c =>
        !debouncedSearch || c._searchString.includes(debouncedSearch.toLowerCase())
      );

      return res.sort((a, b) => {
          const key = sortConfig.key;
          const dir = sortConfig.direction === 'asc' ? 1 : -1;

          if (key === 'groups') {
              const strA = groupStringMap.get(a.email.toLowerCase()) || '';
              const strB = groupStringMap.get(b.email.toLowerCase()) || '';
              return strA.localeCompare(strB) * dir;
          }

          const valA = (a[key as keyof Contact] || '').toString().toLowerCase();
          const valB = (b[key as keyof Contact] || '').toString().toLowerCase();

          return valA.localeCompare(valB) * dir;
      });
  }, [effectiveContacts, debouncedSearch, sortConfig, groupStringMap]);

  const handleAddWrapper = useCallback((contact: Contact) => {
    onAddToAssembler(contact);
    setRecentlyAdded(prev => new Set(prev).add(contact.email));
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(contact.email);
        return newSet;
      });
    }, 2000);
  }, [onAddToAssembler]);

  const handleCreateContact = async (contact: Partial<Contact>) => {
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
        setOptimisticAdds(prev => prev.filter(c => c.email !== contact.email));
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

  const onContextMenu = useCallback((e: React.MouseEvent, contact: Contact) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, contact });
  }, []);

  const itemData = useMemo(() => ({
    filtered,
    recentlyAdded,
    onAdd: handleAddWrapper,
    groups,
    groupMap,
    onContextMenu,
    columnWidths: scaledWidths, // Pass scaled widths
    columnOrder
  }), [filtered, recentlyAdded, handleAddWrapper, groups, groupMap, onContextMenu, scaledWidths, columnOrder]);

  const LABELS: Record<keyof typeof DEFAULT_WIDTHS, string> = {
      name: 'Name',
      title: 'Job Title',
      email: 'Email',
      phone: 'Phone',
      groups: 'Groups'
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
      background: 'var(--color-bg-app)'
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
        <ToolbarButton
          label="ADD CONTACT"
          onClick={() => setIsAddModalOpen(true)}
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
             <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                 {columnOrder.map(key => (
                     <DraggableHeader key={key} id={key}>
                         <ResizableHeader
                            label={LABELS[key]}
                            width={scaledWidths[key]}
                            sortKey={key}
                            currentSort={sortConfig}
                            onSort={handleSort}
                            onResize={(w) => handleResize(key, w)}
                         />
                     </DraggableHeader>
                 ))}
             </SortableContext>
         </DndContext>
         <div style={{ width: '80px', textAlign: 'right', flexShrink: 0 }}>Actions</div>
      </div>

      {/* Virtualized List */}
      <div style={{ flex: 1 }}>
        <AutoSizer onResize={({ width }) => setListWidth(width)}>
          {({ height, width }) => (
            <List
              height={height}
              itemCount={filtered.length}
              itemSize={50}
              width={width}
              itemData={itemData}
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
                <TactileButton onClick={() => setDeleteConfirmation(null)}>Cancel</TactileButton>
                <TactileButton onClick={handleDeleteContact} variant="danger">Delete Contact</TactileButton>
            </div>
        </div>
      </Modal>

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
