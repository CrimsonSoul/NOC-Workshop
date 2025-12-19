import React, { useMemo, useState, memo, useRef, useEffect, useCallback } from 'react';
import { GroupMap, Contact } from '@shared/ipc';
import { useDebounce } from '../hooks/useDebounce';
import { useGroupMaps } from '../hooks/useGroupMaps';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { ContactCard } from '../components/ContactCard';
import { AddContactModal } from '../components/AddContactModal';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { ToolbarButton } from '../components/ToolbarButton';
import { Input } from '../components/Input';
import { TactileButton } from '../components/TactileButton';
import { SidebarItem } from '../components/SidebarItem';
import { ContextMenu } from '../components/ContextMenu';

type Props = {
    groups: GroupMap;
    contacts: Contact[];
    selectedGroups: string[];
    manualAdds: string[];
    manualRemoves: string[];
    onToggleGroup: (group: string) => void;
    onAddManual: (email: string) => void;
    onRemoveManual: (email: string) => void;
    onUndoRemove: () => void;
    onResetManual: () => void;
};

type SortConfig = {
    key: 'name' | 'title' | 'email' | 'phone' | 'groups';
    direction: 'asc' | 'desc';
};

// Row component for virtualization
const VirtualRow = memo(({ index, style, data }: ListChildComponentProps<{
    log: { email: string, source: string }[],
    contactMap: Map<string, Contact>,
    groupMap: Map<string, string[]>,
    onRemoveManual: (email: string) => void,
    onAddToContacts: (email: string) => void,
    onContextMenu: (e: React.MouseEvent, email: string, isUnknown: boolean) => void
}>) => {
    const { log, contactMap, groupMap, onRemoveManual, onAddToContacts, onContextMenu } = data;
    const { email, source } = log[index];
    const contact = contactMap.get(email.toLowerCase());
    const name = contact ? contact.name : email.split('@')[0];
    const title = contact?.title;
    const phone = contact?.phone;
    const membership = groupMap.get(email.toLowerCase()) || [];
    const isUnknown = !contact;

    return (
        <div style={style} onContextMenu={(e) => onContextMenu(e, email, isUnknown)}>
            <ContactCard
                key={email}
                name={name}
                email={email}
                title={title}
                phone={phone}
                groups={membership}
                sourceLabel={source === 'manual' ? 'MANUAL' : undefined}
                style={{ height: '100%' }}
            />
        </div>
    );
});

const SortableHeader = ({
    label,
    sortKey,
    currentSort,
    onSort,
    flex,
    width,
    align = 'left',
    paddingLeft
}: {
    label: string,
    sortKey?: SortConfig['key'],
    currentSort: SortConfig,
    onSort: (key: SortConfig['key']) => void,
    flex?: number | string,
    width?: string,
    align?: 'left' | 'right',
    paddingLeft?: string
}) => {
    const isSorted = sortKey && currentSort.key === sortKey;

    return (
        <div
            style={{
                flex: flex,
                width: width,
                textAlign: align,
                paddingLeft: paddingLeft,
                cursor: sortKey ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                userSelect: 'none'
            }}
            onClick={() => sortKey && onSort(sortKey)}
        >
            {label}
            {isSorted && (
                <span style={{ fontSize: '10px', color: 'var(--color-text-primary)' }}>
                    {currentSort.direction === 'asc' ? '▲' : '▼'}
                </span>
            )}
        </div>
    );
};

export const AssemblerTab: React.FC<Props> = ({ groups, contacts, selectedGroups, manualAdds, manualRemoves, onToggleGroup, onAddManual, onRemoveManual, onUndoRemove, onResetManual }) => {
    const { showToast } = useToast();
    const [adhocInput, setAdhocInput] = useState('');
    const debouncedAdhocInput = useDebounce(adhocInput, 300);
    const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
    const [pendingEmail, setPendingEmail] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const suggestionWrapperRef = useRef<HTMLDivElement>(null);

    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');

    const [groupToDelete, setGroupToDelete] = useState<string | null>(null);

    // Group Context Menu State
    const [groupContextMenu, setGroupContextMenu] = useState<{ x: number, y: number, group: string } | null>(null);
    const [groupToRename, setGroupToRename] = useState<string | null>(null);
    const [renamedGroupName, setRenamedGroupName] = useState('');
    const [renameConflict, setRenameConflict] = useState<string | null>(null);

    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'asc' });

    const [isBridgeReminderOpen, setIsBridgeReminderOpen] = useState(false);

    // Group Sidebar State
    const [isGroupSidebarCollapsed, setIsGroupSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('assembler_sidebar_collapsed');
        return saved ? JSON.parse(saved) : true;
    });

    useEffect(() => {
        localStorage.setItem('assembler_sidebar_collapsed', JSON.stringify(isGroupSidebarCollapsed));
    }, [isGroupSidebarCollapsed]);

    // Optimized contact lookup map
    const contactMap = useMemo(() => {
        const map = new Map<string, Contact>();
        contacts.forEach(c => map.set(c.email.toLowerCase(), c));
        return map;
    }, [contacts]);

    const { groupMap, groupStringMap } = useGroupMaps(groups);

    // Suggestions Logic
    const suggestions = useMemo(() => {
        // Bolt: Use debounced input to prevent filtering on every keystroke
        if (!debouncedAdhocInput || !showSuggestions) return [];
        const lower = debouncedAdhocInput.toLowerCase();
        // Simple filter: match name or email, limit to 5
        return contacts
            .filter(c => c._searchString.includes(lower))
            .slice(0, 5);
    }, [debouncedAdhocInput, showSuggestions, contacts]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (suggestionWrapperRef.current && !suggestionWrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);


    const log = useMemo(() => {
        const fromGroups = selectedGroups.flatMap(g => groups[g] || []);
        const union = new Set([...fromGroups, ...manualAdds]);
        manualRemoves.forEach(r => union.delete(r));
        let result = Array.from(union).map(email => ({
            email,
            source: manualAdds.includes(email) ? 'manual' : 'group'
        }));

        return result.sort((a, b) => {
            const contactA = contactMap.get(a.email.toLowerCase());
            const contactB = contactMap.get(b.email.toLowerCase());
            const dir = sortConfig.direction === 'asc' ? 1 : -1;

            if (sortConfig.key === 'groups') {
                // Bolt: Use pre-calculated joined strings for O(1) access
                const strA = groupStringMap.get(a.email.toLowerCase()) || '';
                const strB = groupStringMap.get(b.email.toLowerCase()) || '';
                return strA.localeCompare(strB) * dir;
            }

            let valA = '';
            let valB = '';

            if (sortConfig.key === 'name') {
                valA = (contactA?.name || a.email.split('@')[0]).toLowerCase();
                valB = (contactB?.name || b.email.split('@')[0]).toLowerCase();
            } else if (sortConfig.key === 'title') {
                valA = (contactA?.title || '').toLowerCase();
                valB = (contactB?.title || '').toLowerCase();
            } else if (sortConfig.key === 'email') {
                valA = a.email.toLowerCase();
                valB = b.email.toLowerCase();
            } else if (sortConfig.key === 'phone') {
                valA = (contactA?.phone || '').toLowerCase();
                valB = (contactB?.phone || '').toLowerCase();
            }

            return valA.localeCompare(valB) * dir;
        });
    }, [groups, selectedGroups, manualAdds, manualRemoves, contactMap, sortConfig, groupStringMap]);

    const handleSort = (key: SortConfig['key']) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(log.map(m => m.email).join('; '));
        showToast('Copied to clipboard', 'success');
    };

    const executeDraftBridge = () => {
        const date = new Date();
        const dateStr = `${date.getMonth() + 1}/${date.getDate()} -`;
        const attendees = log.map(m => m.email).join(',');
        // Use URLSearchParams for proper URL encoding to prevent injection
        const params = new URLSearchParams({
            subject: dateStr,
            attendees: attendees
        });
        const url = `https://teams.microsoft.com/l/meeting/new?${params.toString()}`;
        window.api?.openExternal(url);
        window.api?.logBridge(selectedGroups);
        showToast('Bridge drafted', 'success');
    };

    const handleDraftBridge = () => {
        setIsBridgeReminderOpen(true);
    };

    const handleQuickAdd = (emailOverride?: string) => {
        const email = emailOverride || adhocInput.trim();
        if (!email) return;

        // Check if exists
        if (contactMap.has(email.toLowerCase())) {
            onAddManual(email);
            setAdhocInput('');
            setShowSuggestions(false);
            showToast(`Added ${email}`, 'success');
        } else {
            // Add as manual entry directly
            onAddManual(email);
            setAdhocInput('');
            setShowSuggestions(false);
            showToast(`Added ${email}`, 'success');
        }
    };

    const handleAddToContacts = useCallback((email: string) => {
        setPendingEmail(email);
        setIsAddContactModalOpen(true);
    }, []);

    const [compositionContextMenu, setCompositionContextMenu] = useState<{ x: number, y: number, email: string, isUnknown: boolean } | null>(null);

    const handleCompositionContextMenu = useCallback((e: React.MouseEvent, email: string, isUnknown: boolean) => {
        e.preventDefault();
        setCompositionContextMenu({ x: e.clientX, y: e.clientY, email, isUnknown });
    }, []);

    useEffect(() => {
        if (compositionContextMenu) {
            const handler = () => setCompositionContextMenu(null);
            window.addEventListener('click', handler);
            return () => window.removeEventListener('click', handler);
        }
    }, [compositionContextMenu]);

    const itemData = useMemo(() => ({
        log,
        contactMap,
        groupMap,
        onRemoveManual,
        onAddToContacts: handleAddToContacts,
        onContextMenu: handleCompositionContextMenu
    }), [log, contactMap, groupMap, onRemoveManual, handleAddToContacts, handleCompositionContextMenu]);

    const handleContactSaved = async (contact: Partial<Contact>) => {
        // Save to backend
        const success = await window.api?.addContact(contact);

        if (success) {
            // Add to manual list immediately (optimistic, but safe since we just saved it)
            if (contact.email) {
                onAddManual(contact.email);
            }
            setAdhocInput(''); // Clear input
            showToast('Contact created successfully', 'success');
        } else {
            showToast('Failed to create contact', 'error');
        }
    };

    const handleCreateGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newGroupName) return;
        const success = await window.api?.addGroup(newGroupName);
        if (success) {
            setIsGroupModalOpen(false);
            setNewGroupName('');
            showToast(`Group "${newGroupName}" created`, 'success');
        } else {
            showToast('Failed to create group', 'error');
        }
    };

    // Bolt: Memoize sorted group keys to prevent re-sorting on every render
    const sortedGroupKeys = useMemo(() => Object.keys(groups).sort(), [groups]);

    // Bolt: Stable callback for toggling groups to prevent SidebarItem re-renders
    const handleGroupToggle = onToggleGroup;

    // Bolt: Stable callback for context menu to prevent SidebarItem re-renders
    const handleGroupContextMenu = useCallback((e: React.MouseEvent, group: string) => {
        e.preventDefault();
        setGroupContextMenu({ x: e.clientX, y: e.clientY, group });
    }, []);

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: isGroupSidebarCollapsed ? '24px 1fr' : '240px 1fr',
            gap: '0px',
            height: '100%',
            alignItems: 'start',
            transition: 'grid-template-columns 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            overflow: 'hidden'
        }}>

            {/* Sidebar Controls - Compact */}
            {/* Sidebar Controls - Compact */}
            <div style={{
                display: 'flex',
                padding: '0',
                borderRight: 'var(--border-subtle)',
                height: '100%',
                position: 'relative',
                background: 'rgba(255, 255, 255, 0.01)',
                transition: 'all var(--transition-base)'
            }}>
                {!isGroupSidebarCollapsed ? (
                    <>
                        <div style={{ display: 'flex', height: '100%', width: '100%' }}>
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                overflowX: 'hidden',
                                padding: '16px 20px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                alignItems: 'flex-start' // Ensure things stay left-aligned
                            }}>
                                {/* Quick Add Section */}
                                <div ref={suggestionWrapperRef} style={{ position: 'relative', marginBottom: '16px' }}>
                                    <div style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginBottom: '8px'
                                    }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>QUICK ADD</div>
                                    </div>
                                    <Input
                                        placeholder="Add by email..."
                                        value={adhocInput}
                                        style={{
                                            fontSize: '14px',
                                            padding: '8px 12px',
                                            height: '36px'
                                        }}
                                        onChange={(e) => {
                                            setAdhocInput(e.target.value);
                                            setShowSuggestions(true);
                                        }}
                                        onFocus={() => setShowSuggestions(true)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                handleQuickAdd();
                                                e.currentTarget.blur();
                                            }
                                        }}
                                    />

                                    {/* Suggestions Dropdown */}
                                    {showSuggestions && suggestions.length > 0 && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            marginTop: '4px',
                                            background: 'var(--color-bg-surface)',
                                            border: 'var(--border-subtle)',
                                            borderRadius: '6px',
                                            zIndex: 100,
                                            boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                                            overflow: 'hidden'
                                        }}>
                                            {suggestions.map(c => (
                                                <div
                                                    key={c.email}
                                                    onClick={() => handleQuickAdd(c.email)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        color: 'var(--color-text-primary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px'
                                                    }}
                                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <div style={{
                                                        width: '24px', height: '24px', borderRadius: '4px',
                                                        background: 'rgba(59, 130, 246, 0.2)', color: '#3B82F6',
                                                        fontSize: '11px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {c.name ? c.name[0].toUpperCase() : c.email[0].toUpperCase()}
                                                    </div>
                                                    <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {c.name || c.email}
                                                        {c.name && <span style={{ color: 'var(--color-text-tertiary)', marginLeft: '6px', fontSize: '12px' }}>{c.email}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Groups Selection */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, marginTop: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', padding: '0 4px' }}>
                                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>GROUPS</div>
                                        <div
                                            onClick={() => setIsGroupModalOpen(true)}
                                            style={{
                                                color: 'var(--color-text-tertiary)',
                                                cursor: 'pointer',
                                                padding: '4px',
                                                borderRadius: '4px',
                                                background: 'transparent',
                                                transition: 'all var(--transition-fast)',
                                                width: '20px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center'
                                            }}
                                            onMouseEnter={e => {
                                                e.currentTarget.style.color = 'var(--color-text-primary)';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
                                            }}
                                            onMouseLeave={e => {
                                                e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                                e.currentTarget.style.background = 'transparent';
                                            }}
                                            title="Create Group"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="12" y1="5" x2="12" y2="19" />
                                                <line x1="5" y1="12" x2="19" y2="12" />
                                            </svg>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        {sortedGroupKeys.map(g => {
                                            const isSelected = selectedGroups.includes(g);
                                            return (
                                                <SidebarItem
                                                    key={g}
                                                    label={g}
                                                    count={groups[g].length}
                                                    active={isSelected}
                                                    onClick={handleGroupToggle}
                                                    onContextMenu={handleGroupContextMenu}
                                                />
                                            );
                                        })}
                                        {sortedGroupKeys.length === 0 && (
                                            <div style={{ color: 'var(--color-text-tertiary)', fontSize: '13px', fontStyle: 'italic', paddingLeft: '4px' }}>
                                                No groups.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Full Height Vertical Toggle Strip */}
                            <div
                                onClick={() => setIsGroupSidebarCollapsed(true)}
                                style={{
                                    width: '24px',
                                    height: '100%',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderLeft: '1px solid rgba(255,255,255,0.03)',
                                    transition: 'all var(--transition-fast)',
                                    color: 'var(--color-text-tertiary)',
                                    flexShrink: 0
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                    e.currentTarget.style.color = 'var(--color-text-primary)';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = 'var(--color-text-tertiary)';
                                }}
                                title="Collapse Sidebar"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="15 18 9 12 15 6" />
                                </svg>
                            </div>
                        </div>
                    </>
                ) : (
                    // Collapsed State
                    <div
                        onClick={() => setIsGroupSidebarCollapsed(false)}
                        style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            width: '24px',
                            transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        title="Expand Sidebar"
                    >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(180deg)' }}>
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </div>
                )}
            </div>

            {/* Main Log Area - Table Layout */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                overflow: 'hidden',
                background: 'var(--color-bg-app)', // Seamless with sidebar
                paddingLeft: '8px' // Reduced padding for better card fit
            }}>

                {/* Toolbar - Compact */}
                <div style={{
                    padding: '10px 12px',
                    borderBottom: 'var(--border-subtle)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>Composition</h2>
                        <span style={{ fontSize: '14px', color: 'var(--color-text-tertiary)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '10px' }}>
                            {log.length}
                        </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                        {manualRemoves.length > 0 && (
                            <ToolbarButton label="UNDO" onClick={onUndoRemove} />
                        )}
                        <ToolbarButton label="RESET" onClick={onResetManual} />
                        <ToolbarButton label="COPY" onClick={handleCopy} />
                        <ToolbarButton label="DRAFT BRIDGE" onClick={handleDraftBridge} primary />
                    </div>
                </div>

                {/* Header Row - Removed for Card Layout */}
                {/* We can add a Sort By dropdown here later if needed, but standard alphabetical is fine for now or we rely on the implicit sort */}

                {/* List */}
                <div style={{
                    flex: 1,
                    overflow: 'hidden', // AutoSizer handles scrolling
                    padding: '0 12px' // Give some room for card rounding
                }}>
                    {log.length === 0 ? (
                        <div style={{
                            height: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: '16px',
                            color: 'var(--color-text-tertiary)'
                        }}>
                            <div style={{ fontSize: '48px', opacity: 0.1 }}>∅</div>
                            <div>No recipients selected</div>
                        </div>
                    ) : (
                        <AutoSizer>
                            {({ height, width }) => (
                                <List
                                    height={height}
                                    itemCount={log.length}
                                    itemSize={100}
                                    width={width}
                                    itemData={itemData}
                                >
                                    {VirtualRow}
                                </List>
                            )}
                        </AutoSizer>
                    )}
                </div>
            </div>

            <AddContactModal
                isOpen={isAddContactModalOpen}
                onClose={() => setIsAddContactModalOpen(false)}
                initialEmail={pendingEmail}
                onSave={handleContactSaved}
            />

            {/* Bridge Reminder Modal */}
            <Modal
                isOpen={isBridgeReminderOpen}
                onClose={() => setIsBridgeReminderOpen(false)}
                title="Meeting Recording"
                width="400px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        Please ensure meeting recording is enabled.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <TactileButton
                            onClick={() => setIsBridgeReminderOpen(false)}
                        >
                            Cancel
                        </TactileButton>
                        <TactileButton
                            onClick={() => {
                                executeDraftBridge();
                                setIsBridgeReminderOpen(false);
                            }}
                            variant="primary"
                        >
                            I Understand
                        </TactileButton>
                    </div>
                </div>
            </Modal>

            {/* Simple Create Group Modal */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                title="Create Group"
                width="400px"
            >
                <form onSubmit={handleCreateGroup}>
                    <label style={{ display: 'block', fontSize: '14px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Group Name</label>
                    <Input
                        autoFocus
                        value={newGroupName}
                        onChange={e => setNewGroupName(e.target.value)}
                        placeholder="e.g. Marketing"
                        required
                        style={{ marginBottom: '16px' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <TactileButton type="button" onClick={() => setIsGroupModalOpen(false)}>Cancel</TactileButton>
                        <TactileButton type="submit" variant="primary">Create</TactileButton>
                    </div>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                title="Delete Group"
                width="400px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        Are you sure you want to delete <span style={{ fontWeight: 600 }}>{groupToDelete}</span>?
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                        This will remove the group tag from all contacts. The contacts themselves will not be deleted.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <TactileButton
                            onClick={() => setGroupToDelete(null)}
                        >
                            Cancel
                        </TactileButton>
                        <TactileButton
                            onClick={async () => {
                                if (groupToDelete) {
                                    const success = await window.api?.removeGroup(groupToDelete);
                                    if (success) {
                                        if (selectedGroups.includes(groupToDelete)) {
                                            onToggleGroup(groupToDelete);
                                        }
                                        showToast(`Group "${groupToDelete}" deleted`, 'success');
                                    } else {
                                        showToast('Failed to delete group', 'error');
                                    }
                                }
                                setGroupToDelete(null);
                            }}
                            variant="danger"
                        >
                            Delete Group
                        </TactileButton>
                    </div>
                </div>
            </Modal>

            {/* Rename Group Modal */}
            <Modal
                isOpen={!!groupToRename}
                onClose={() => {
                    setGroupToRename(null);
                    setRenameConflict(null);
                }}
                title="Rename Group"
                width="400px"
            >
                {renameConflict ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                            Group <span style={{ fontWeight: 600 }}>{renameConflict}</span> already exists.
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                            Do you want to merge <span style={{ fontWeight: 600 }}>{groupToRename}</span> into <span style={{ fontWeight: 600 }}>{renameConflict}</span>? All contacts will be moved.
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                            <TactileButton
                                onClick={() => setRenameConflict(null)}
                            >
                                Cancel
                            </TactileButton>
                            <TactileButton
                                onClick={async () => {
                                    if (groupToRename && renameConflict) {
                                        const success = await window.api?.renameGroup(groupToRename, renameConflict);
                                        if (success) {
                                            if (selectedGroups.includes(groupToRename)) {
                                                onToggleGroup(groupToRename);
                                            }
                                            if (!selectedGroups.includes(renameConflict)) {
                                                onToggleGroup(renameConflict);
                                            }
                                            showToast(`Merged "${groupToRename}" into "${renameConflict}"`, 'success');
                                        } else {
                                            showToast('Failed to merge groups', 'error');
                                        }
                                    }
                                    setGroupToRename(null);
                                    setRenameConflict(null);
                                }}
                                variant="primary"
                            >
                                Merge Groups
                            </TactileButton>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (groupToRename && renamedGroupName && renamedGroupName !== groupToRename) {
                            if (groups[renamedGroupName]) {
                                setRenameConflict(renamedGroupName);
                                return;
                            }

                            const success = await window.api?.renameGroup(groupToRename, renamedGroupName);
                            if (success) {
                                if (selectedGroups.includes(groupToRename)) {
                                    onToggleGroup(groupToRename);
                                    onToggleGroup(renamedGroupName);
                                }
                                showToast(`Renamed "${groupToRename}" to "${renamedGroupName}"`, 'success');
                            } else {
                                showToast('Failed to rename group', 'error');
                            }
                        }
                        setGroupToRename(null);
                    }}>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>Group Name</label>
                        <Input
                            autoFocus
                            value={renamedGroupName}
                            onChange={e => setRenamedGroupName(e.target.value)}
                            required
                            style={{ marginBottom: '16px' }}
                        />
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <TactileButton type="button" onClick={() => setGroupToRename(null)}>Cancel</TactileButton>
                            <TactileButton type="submit" variant="primary">Save</TactileButton>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Group Context Menu */}
            {groupContextMenu && (
                <ContextMenu
                    x={groupContextMenu.x}
                    y={groupContextMenu.y}
                    onClose={() => setGroupContextMenu(null)}
                    items={[
                        {
                            label: 'Rename',
                            onClick: () => {
                                setGroupToRename(groupContextMenu.group);
                                setRenamedGroupName(groupContextMenu.group);
                            },
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        },
                        {
                            label: 'Delete Group',
                            onClick: () => setGroupToDelete(groupContextMenu.group),
                            danger: true,
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                        }
                    ]}
                />
            )}

            {/* Composition List Context Menu */}
            {compositionContextMenu && (
                <ContextMenu
                    x={compositionContextMenu.x}
                    y={compositionContextMenu.y}
                    onClose={() => setCompositionContextMenu(null)}
                    items={[
                        ...(compositionContextMenu.isUnknown ? [{
                            label: 'Save to Contacts',
                            onClick: () => {
                                handleAddToContacts(compositionContextMenu.email);
                                setCompositionContextMenu(null);
                            },
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M16 11h6m-3-3v6"></path></svg>
                        }] : []),
                        {
                            label: 'Remove from List',
                            onClick: () => {
                                onRemoveManual(compositionContextMenu.email);
                                setCompositionContextMenu(null);
                            },
                            danger: true,
                            icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        }
                    ]}
                />
            )}

        </div>
    );
};
