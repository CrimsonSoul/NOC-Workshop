import React, { useState, useMemo, useEffect } from 'react';
import { OnCallEntry, Contact, GroupMap } from '@shared/ipc';
import { TactileButton } from './TactileButton';
import { Modal } from './Modal';
import { Input } from './Input';
import { ContextMenu } from './ContextMenu';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { getColorForString } from '../utils/colors';

interface SortableTeamCardProps {
    team: string;
    entry: OnCallEntry | undefined;
    primaryContact: Contact | undefined;
    backupContact: Contact | undefined;
    setEditingTeam: (team: string) => void;
    setRenamingTeam: (val: { old: string, new: string }) => void;
    onRemoveTeam: (team: string) => void;
    setMenu: (menu: { x: number, y: number, items: any[] } | null) => void;
}

interface OnCallPanelProps {
    onCall: OnCallEntry[];
    contacts: Contact[];
    groups: GroupMap;
    onUpdate: (entry: OnCallEntry) => void;
    onRemoveTeam: (team: string) => void;
    onRenameTeam: (oldName: string, newName: string) => void;
    onAddTeam: (name: string) => void;
}

const SortableTeamCard = ({
    team,
    entry,
    primaryContact,
    backupContact,
    setEditingTeam,
    setRenamingTeam,
    onRemoveTeam,
    setMenu
}: SortableTeamCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: team });

    const colorScheme = getColorForString(team);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        minWidth: '260px',
        maxWidth: '260px', // constrain width for horizontal layout
        flex: '0 0 auto'
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
        >
            <div
                style={{
                    height: '100%',
                    minHeight: '130px', // Ensure enough height for all content
                    padding: '16px 16px 16px 20px', // More left padding for accent strip
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    cursor: 'grab', // Changed to grab for draggable
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    position: 'relative'
                    // Note: overflow:hidden removed to prevent content clipping
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onClick={() => setEditingTeam(team)}
                onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                            { label: 'Edit Assignments', onClick: () => setEditingTeam(team) },
                            { label: 'Rename Team', onClick: () => setRenamingTeam({ old: team, new: team }) },
                            { label: 'Remove Team', danger: true, onClick: () => { if (confirm(`Remove ${team}?`)) onRemoveTeam(team); } }
                        ]
                    });
                }}
            >
                {/* Accent Strip */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: colorScheme.text, // Use the unique color
                    opacity: 0.8
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div
                        style={{
                            fontSize: '12px',
                            fontWeight: 800,
                            color: colorScheme.text, // Dynamic color for team name
                            letterSpacing: '0.08em',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                        }}
                        title={team.toUpperCase()}
                    >
                        {team.toUpperCase()}
                    </div>
                    {/* Drag Handle Icon (optional visual cue) */}
                    <div style={{ color: 'var(--color-text-tertiary)', opacity: 0.5, flexShrink: 0 }}>
                        ⋮⋮
                    </div>
                </div>

                <div
                    style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 700, opacity: 0.6, flexShrink: 0 }}>PRI</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', overflow: 'hidden', minWidth: 0 }}>
                            <span
                                style={{ fontSize: '16px', fontWeight: 700, color: entry?.primary ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                                title={primaryContact?.name || entry?.primary || 'UNASSIGNED'}
                            >
                                {primaryContact?.name || entry?.primary || 'UNASSIGNED'}
                            </span>
                            {primaryContact?.phone && (
                                <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 600, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                    {primaryContact.phone}
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 700, opacity: 0.6, flexShrink: 0 }}>BAK</span>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', overflow: 'hidden', minWidth: 0 }}>
                            <span
                                style={{ fontSize: '13px', fontWeight: 600, color: entry?.backup ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}
                                title={backupContact?.name || entry?.backup || 'UNASSIGNED'}
                            >
                                {backupContact?.name || entry?.backup || 'UNASSIGNED'}
                            </span>
                            {backupContact?.phone && (
                                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                                    {backupContact.phone}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    return `${monday.toLocaleDateString(undefined, options)} - ${sunday.toLocaleDateString(undefined, options)}, ${sunday.getFullYear()}`;
};

export const OnCallPanel: React.FC<OnCallPanelProps> = ({

    onCall,
    contacts,
    groups,
    onUpdate,
    onRemoveTeam,
    onRenameTeam,
    onAddTeam
}) => {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [editingTeam, setEditingTeam] = useState<string | null>(null);
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [renamingTeam, setRenamingTeam] = useState<{ old: string, new: string } | null>(null);
    const [localOnCall, setLocalOnCall] = useState<OnCallEntry[]>(onCall);
    const [menu, setMenu] = useState<{ x: number, y: number, items: any[] } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Sync local state when props change
    useEffect(() => {
        setLocalOnCall(onCall);
    }, [onCall]);

    const filteredContacts = useMemo(() => {
        if (!searchQuery.trim()) return contacts.slice(0, 50);
        const low = searchQuery.toLowerCase();
        return contacts.filter(c => c._searchString.includes(low));
    }, [contacts, searchQuery]);


    const handleUpdate = (team: string, type: 'primary' | 'backup', email: string) => {
        const existing = localOnCall.find(e => e.team === team) || { team, primary: '', backup: '' };
        const updated = {
            ...existing,
            [type]: email
        };

        // Optimistic update
        setLocalOnCall(prev => prev.map(e => e.team === team ? updated : e).concat(prev.find(e => e.team === team) ? [] : [updated]));

        onUpdate(updated);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setLocalOnCall((items) => {
                const oldIndex = items.findIndex(item => item.team === active.id);
                const newIndex = items.findIndex(item => item.team === over.id);
                const newOrder = arrayMove(items, oldIndex, newIndex);

                // Persist new order
                if (window.api?.saveAllOnCall) {
                    window.api.saveAllOnCall(newOrder);
                }

                return newOrder;
            });
        }
    };

    const currentEntry = localOnCall.find(e => e.team === editingTeam);
    const weekRange = useMemo(() => getWeekRange(), []);

    // NOTE: Removed .sort() to respect manual ordering
    const teams = useMemo(() => localOnCall.map(e => e.team), [localOnCall]);


    return (
        <div style={{
            borderTop: 'var(--border-subtle)',
            background: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            height: isCollapsed ? '24px' : '200px',
            overflow: 'hidden',
            position: 'relative',
            boxShadow: isCollapsed ? 'none' : '0 -4px 20px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
        }}>



            {/* Header / Toggle */}
            <div
                onClick={() => setIsCollapsed(!isCollapsed)}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    const chevron = e.currentTarget.querySelector('.chevron-icon') as HTMLElement;
                    if (chevron) chevron.style.color = 'var(--color-text-primary)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    const chevron = e.currentTarget.querySelector('.chevron-icon') as HTMLElement;
                    if (chevron) chevron.style.color = 'var(--color-text-tertiary)';
                }}
                style={{
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderBottom: isCollapsed ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease'
                }}
                title={isCollapsed ? "Expand Panel" : "Collapse Panel"}
            >

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div
                        style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '0.05em',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        ON-CALL STATUS
                    </div>


                    <div style={{ fontSize: '9px', color: 'var(--color-text-tertiary)', fontWeight: 500, letterSpacing: '0.05em', opacity: 0.8 }}>
                        {weekRange}
                    </div>

                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                        className="chevron-icon"
                        style={{
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '4px',
                            transition: 'all var(--transition-fast)',
                            color: 'var(--color-text-tertiary)'
                        }}
                    >
                        <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: isCollapsed ? 'rotate(90deg)' : 'rotate(270deg)'
                            }}
                        >
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </div>
                </div>



            </div>

            <div
                onContextMenu={(e) => {
                    e.preventDefault();
                    setMenu({
                        x: e.clientX,
                        y: e.clientY,
                        items: [
                            { label: 'Add New Team', onClick: () => setIsAddingTeam(true) }
                        ]
                    });
                }}
                style={{
                    flex: 1,
                    padding: '20px',
                    gap: '24px',
                    overflowX: 'auto',
                    alignItems: 'stretch',
                    display: isCollapsed ? 'none' : 'flex',
                    opacity: isCollapsed ? 0 : 1,
                    pointerEvents: isCollapsed ? 'none' : 'auto',
                    transition: 'opacity 0.3s'
                }}
            >



                {teams.length === 0 && !isCollapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', color: 'var(--color-text-tertiary)', fontSize: '12px', fontStyle: 'italic' }}>
                        No teams defined. Use "+ ADD TEAM" to start.
                    </div>
                )}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={teams}
                        strategy={horizontalListSortingStrategy}
                    >
                        {teams.map(team => {
                            const entry = localOnCall.find(e => e.team === team);
                            const primaryContact = contacts.find(c => c.email === entry?.primary);
                            const backupContact = contacts.find(c => c.email === entry?.backup);

                            return (
                                <SortableTeamCard
                                    key={team}
                                    team={team}
                                    entry={entry}
                                    primaryContact={primaryContact}
                                    backupContact={backupContact}
                                    setEditingTeam={setEditingTeam}
                                    setRenamingTeam={setRenamingTeam}
                                    onRemoveTeam={onRemoveTeam}
                                    setMenu={setMenu}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Rename Team Modal */}
            <Modal
                isOpen={!!renamingTeam}
                onClose={() => setRenamingTeam(null)}
                title="Rename Team"
                width="400px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                        value={renamingTeam?.new || ''}
                        onChange={e => setRenamingTeam(prev => prev ? { ...prev, new: e.target.value } : null)}
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <TactileButton variant="secondary" onClick={() => setRenamingTeam(null)}>Cancel</TactileButton>
                        <TactileButton
                            variant="primary"
                            onClick={() => {
                                if (renamingTeam) {
                                    onRenameTeam(renamingTeam.old, renamingTeam.new);
                                    setRenamingTeam(null);
                                }
                            }}
                        >
                            Rename
                        </TactileButton>
                    </div>
                </div>
            </Modal>

            {/* Add Team Modal */}
            <Modal
                isOpen={isAddingTeam}
                onClose={() => setIsAddingTeam(false)}
                title="Add New On-Call Team"
                width="400px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                        placeholder="Team Name (e.g. SRE, Support)"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && newTeamName.trim()) {
                                onAddTeam(newTeamName.trim());
                                setNewTeamName('');
                                setIsAddingTeam(false);
                            }
                        }}
                        autoFocus
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <TactileButton variant="secondary" onClick={() => setIsAddingTeam(false)}>Cancel</TactileButton>
                        <TactileButton
                            variant="primary"
                            onClick={() => {
                                if (newTeamName.trim()) {
                                    onAddTeam(newTeamName.trim());
                                    setNewTeamName('');
                                    setIsAddingTeam(false);
                                }
                            }}
                        >
                            Add Team
                        </TactileButton>
                    </div>
                </div>
            </Modal>

            {/* Assignment Modal */}
            <Modal
                isOpen={!!editingTeam}
                onClose={() => setEditingTeam(null)}
                title={`On-Call: ${editingTeam}`}
                width="600px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '600px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', marginBottom: '8px', letterSpacing: '0.05em' }}>SEARCH CONTACTS</label>
                        <Input
                            placeholder="Type to search all contacts..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', flex: 1, overflow: 'hidden' }}>
                        {/* Primary Assignment */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>PRIMARY</label>
                            <div style={{ fontSize: '16px', fontWeight: 700, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--color-accent-blue)' }}>
                                {contacts.find(c => c.email === currentEntry?.primary)?.name || 'NONE'}
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
                                {filteredContacts.map(c => (
                                    <TactileButton
                                        key={c.email}
                                        onClick={() => handleUpdate(editingTeam!, 'primary', c.email)}
                                        style={{
                                            justifyContent: 'flex-start',
                                            padding: '10px 14px',
                                            height: 'auto',
                                            minHeight: '52px',
                                            border: currentEntry?.primary === c.email ? '1px solid var(--color-accent-blue)' : '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        variant={currentEntry?.primary === c.email ? 'primary' : 'secondary'}
                                    >
                                        <div style={{ textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                            <div
                                                style={{ fontWeight: 600, fontSize: '14px', color: currentEntry?.primary === c.email ? 'white' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                title={c.name || c.email}
                                            >
                                                {c.name || c.email}
                                            </div>
                                            {c.title && <div style={{ fontSize: '12px', opacity: 0.8, color: currentEntry?.primary === c.email ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</div>}
                                            <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace', color: currentEntry?.primary === c.email ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.email}>{c.email}</div>
                                        </div>
                                    </TactileButton>
                                ))}
                            </div>

                        </div>

                        {/* Backup Assignment */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-tertiary)', letterSpacing: '0.05em' }}>BACKUP</label>
                            <div style={{ fontSize: '16px', fontWeight: 700, padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', color: 'var(--color-text-secondary)' }}>
                                {contacts.find(c => c.email === currentEntry?.backup)?.name || currentEntry?.backup || 'NONE'}
                            </div>
                            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '8px' }}>
                                {filteredContacts.map(c => (
                                    <TactileButton
                                        key={c.email}
                                        onClick={() => handleUpdate(editingTeam!, 'backup', c.email)}
                                        style={{
                                            justifyContent: 'flex-start',
                                            padding: '10px 14px',
                                            height: 'auto',
                                            minHeight: '52px',
                                            border: currentEntry?.backup === c.email ? '1px solid var(--color-accent-blue)' : '1px solid rgba(255,255,255,0.05)'
                                        }}
                                        variant={currentEntry?.backup === c.email ? 'primary' : 'secondary'}
                                    >
                                        <div style={{ textAlign: 'left', width: '100%', display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                            <div
                                                style={{ fontWeight: 600, fontSize: '14px', color: currentEntry?.backup === c.email ? 'white' : 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                                title={c.name || c.email}
                                            >
                                                {c.name || c.email}
                                            </div>
                                            {c.title && <div style={{ fontSize: '12px', opacity: 0.8, color: currentEntry?.backup === c.email ? 'rgba(255,255,255,0.9)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</div>}
                                            <div style={{ fontSize: '11px', opacity: 0.5, fontFamily: 'monospace', color: currentEntry?.backup === c.email ? 'rgba(255,255,255,0.7)' : 'var(--color-text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.email}>{c.email}</div>
                                        </div>
                                    </TactileButton>
                                ))}
                            </div>

                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                        <TactileButton variant="primary" style={{ padding: '8px 24px' }} onClick={() => setEditingTeam(null)}>Done</TactileButton>
                    </div>
                </div>
            </Modal>

            {menu && (
                <ContextMenu
                    x={menu.x}
                    y={menu.y}
                    items={menu.items}
                    onClose={() => setMenu(null)}
                />
            )}
        </div>

    );
};
