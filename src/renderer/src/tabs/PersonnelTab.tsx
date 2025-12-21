import React, { useState, useMemo, useEffect } from 'react';
import { OnCallRow, Contact, GroupMap } from '@shared/ipc';
import { formatPhoneNumber } from '../utils/phone';
import { TactileButton } from '../components/TactileButton';
import { Modal } from '../components/Modal';
import { MaintainTeamModal } from '../components/MaintainTeamModal';
import { Input } from '../components/Input';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';
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
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getColorForString } from '../utils/colors';
import { useToast } from '../components/Toast';
import { v4 as uuidv4 } from 'uuid';

// --- Types ---

interface TeamCardProps {
    team: string;
    rows: OnCallRow[];
    contacts: Contact[];
    onUpdateRows: (team: string, rows: OnCallRow[]) => void;
    onRenameTeam: (oldName: string, newName: string) => void;
    onRemoveTeam: (team: string) => void;
    setMenu: (menu: { x: number, y: number, items: ContextMenuItem[] } | null) => void;
}

interface SortableRowProps {
    row: OnCallRow;
    contacts: Contact[];
    onUpdate: (updated: OnCallRow) => void;
    onRemove: () => void;
}

// --- Components ---

const SortableTeamCard = ({
    team,
    rows,
    contacts,
    onUpdateRows,
    onRenameTeam,
    onRemoveTeam,
    setMenu
}: TeamCardProps) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: team });

    const colorScheme = getColorForString(team);
    const [isEditing, setIsEditing] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
    };

    // Derived state for rows to ensure they are stable
    const teamRows = useMemo(() => rows || [], [rows]);

    return (
        <>
            <div
                ref={setNodeRef}
                style={style}
                {...attributes}
                {...listeners}
            >
                <div
                    style={{
                        padding: '16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        minHeight: '200px'
                    }}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenu({
                            x: e.clientX,
                            y: e.clientY,
                            items: [
                                { label: 'Edit Team', onClick: () => setIsEditing(true) },
                                { label: 'Rename Team', onClick: () => onRenameTeam(team, team) },
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
                        width: '6px',
                        background: colorScheme.text,
                        opacity: 0.9
                    }} />

                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: '12px' }}>
                        <div
                            style={{
                                fontSize: '20px',
                                fontWeight: 900,
                                color: colorScheme.text,
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase'
                            }}
                        >
                            {team}
                        </div>
                    </div>


                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '16px' }}>
                        {teamRows.map(row => (
                            <div key={row.id} style={{
                                display: 'grid',
                                gridTemplateColumns: '60px 1fr 150px 90px',
                                gap: '16px',
                                alignItems: 'center',
                                padding: '6px 0',
                            }}>
                                <div style={{
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    alignSelf: 'center',
                                    opacity: 0.8
                                }} title={row.role}>
                                    {(() => {
                                        const r = row.role.toLowerCase();
                                        if (r.includes('primary')) return 'PRI';
                                        if (r.includes('secondary')) return 'SEC';
                                        if (r.includes('backup')) return 'BKP';
                                        if (r.includes('shadow')) return 'SHD';
                                        if (r.includes('escalation')) return 'ESC';
                                        return row.role.substring(0, 3).toUpperCase();
                                    })()}
                                </div>
                                <div style={{
                                    color: row.name ? 'var(--color-text-primary)' : 'var(--color-text-quaternary)',
                                    fontSize: '20px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: 1.2
                                }} title={row.name}>
                                    {row.name || '—'}
                                </div>
                                <div style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: '17px',
                                    fontFamily: 'var(--font-mono)',
                                    textAlign: 'right',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    fontWeight: 500
                                }} title={row.contact}>
                                    {formatPhoneNumber(row.contact)}
                                </div>
                                <div style={{
                                    color: 'var(--color-text-tertiary)',
                                    fontSize: '14px',
                                    textAlign: 'center',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    padding: row.timeWindow ? '4px 8px' : '0',
                                    borderRadius: '4px',
                                    background: row.timeWindow ? 'rgba(255,255,255,0.05)' : 'transparent',
                                    opacity: row.timeWindow ? 0.9 : 0
                                }} title={row.timeWindow}>
                                    {row.timeWindow}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <MaintainTeamModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                teamName={team}
                initialRows={teamRows}
                contacts={contacts}
                onSave={onUpdateRows}
            />
        </>
    );
};




const getWeekRange = () => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));
    const sunday = new Date(now.setDate(diff + 6));
    const options: Intl.DateTimeFormatOptions = { month: 'long', day: 'numeric' };
    return `${monday.toLocaleDateString(undefined, options)} - ${sunday.toLocaleDateString(undefined, options)}, ${sunday.getFullYear()}`;
};

export const PersonnelTab: React.FC<{
    onCall: OnCallRow[];
    contacts: Contact[];
    groups: GroupMap;
}> = ({ onCall, contacts, groups }) => {
    const { showToast } = useToast();
    const [isAddingTeam, setIsAddingTeam] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [renamingTeam, setRenamingTeam] = useState<{ old: string, new: string } | null>(null);
    const [localOnCall, setLocalOnCall] = useState<OnCallRow[]>(onCall);
    const [menu, setMenu] = useState<{ x: number, y: number, items: ContextMenuItem[] } | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => {
        setLocalOnCall(onCall);
    }, [onCall]);

    // Group rows by team
    const teams = useMemo(() => {
        const map = new Map<string, OnCallRow[]>();
        localOnCall.forEach(row => {
            if (!map.has(row.team)) map.set(row.team, []);
            map.get(row.team)?.push(row);
        });
        return Array.from(map.keys());
    }, [localOnCall]);

    const handleUpdateRows = async (team: string, rows: OnCallRow[]) => {
        // Optimistic update
        setLocalOnCall(prev => {
            const others = prev.filter(r => r.team !== team);
            return [...others, ...rows];
        });

        const success = await window.api?.updateOnCallTeam(team, rows);
        if (!success) showToast('Failed to save changes', 'error');
    };

    const handleTeamDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            // Reordering teams is tricky with flat rows. 
            // We need to re-sort the entire flat list based on the new team order.
            const oldIndex = teams.indexOf(String(active.id));
            const newIndex = teams.indexOf(String(over.id));
            const newTeamOrder = arrayMove(teams, oldIndex, newIndex);

            const newFlatList: OnCallRow[] = [];
            newTeamOrder.forEach(t => {
                const teamRows = localOnCall.filter(r => r.team === t);
                newFlatList.push(...teamRows);
            });

            setLocalOnCall(newFlatList);
            window.api?.saveAllOnCall(newFlatList);
        }
    };

    const handleRemoveTeam = async (team: string) => {
        const success = await window.api?.removeOnCallTeam(team);
        if (success) {
            setLocalOnCall(prev => prev.filter(r => r.team !== team));
            showToast(`Removed ${team}`, 'success');
        } else {
            showToast('Failed to remove team', 'error');
        }
    };

    const handleRenameTeam = async (oldName: string, newName: string) => {
        const success = await window.api?.renameOnCallTeam(oldName, newName);
        if (success) {
            setLocalOnCall(prev => prev.map(r => r.team === oldName ? { ...r, team: newName } : r));
            showToast(`Renamed ${oldName} to ${newName}`, 'success');
        } else {
            showToast('Failed to rename team', 'error');
        }
    };

    const handleAddTeam = async (name: string) => {
        // Create an initial empty row or just rely on updateOnCallTeam handling usage
        const initialRow: OnCallRow = {
            id: uuidv4(),
            team: name,
            role: 'Primary',
            name: '',
            contact: '',
            timeWindow: ''
        };
        const success = await window.api?.updateOnCallTeam(name, [initialRow]);
        if (success) {
            setLocalOnCall(prev => [...prev, initialRow]);
            showToast(`Added team ${name}`, 'success');
        } else {
            showToast('Failed to add team', 'error');
        }
    };

    const weekRange = useMemo(() => getWeekRange(), []);

    return (
        <div style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            padding: '20px 24px 24px 24px',
            background: 'var(--color-bg-app)',
            overflowY: 'auto'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '32px', fontWeight: 800, margin: 0, color: 'var(--color-text-primary)' }}>On-Call Schedule</h1>
                    <p style={{ fontSize: '16px', color: 'var(--color-text-tertiary)', margin: '8px 0 0 0', fontWeight: 500 }}>{weekRange}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>

                    <TactileButton variant="primary" style={{ padding: '12px 24px', fontSize: '14px' }} onClick={() => setIsAddingTeam(true)}>
                        + ADD TEAM
                    </TactileButton>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))',
                gap: '24px',
                paddingBottom: '40px'
            }}>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTeamDragEnd}>
                    <SortableContext items={teams} strategy={verticalListSortingStrategy}>
                        {teams.map(team => (
                            <SortableTeamCard
                                key={team}
                                team={team}
                                rows={localOnCall.filter(r => r.team === team)}
                                contacts={contacts}
                                onUpdateRows={handleUpdateRows}
                                onRenameTeam={(o, n) => setRenamingTeam({ old: o, new: n })}
                                onRemoveTeam={handleRemoveTeam}
                                setMenu={setMenu}
                            />
                        ))}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Modals */}
            <Modal isOpen={!!renamingTeam} onClose={() => setRenamingTeam(null)} title="Rename Team" width="400px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                        ref={(el) => { if (el) setTimeout(() => el.focus(), 100); }}
                        value={renamingTeam?.new || ''}
                        onChange={e => setRenamingTeam(prev => prev ? { ...prev, new: e.target.value } : null)}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter' && renamingTeam) {
                                handleRenameTeam(renamingTeam.old, renamingTeam.new).then(() => setRenamingTeam(null));
                            }
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <TactileButton variant="secondary" onClick={() => setRenamingTeam(null)}>Cancel</TactileButton>
                        <TactileButton variant="primary" onClick={() => renamingTeam && handleRenameTeam(renamingTeam.old, renamingTeam.new).then(() => setRenamingTeam(null))}>Rename</TactileButton>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={isAddingTeam} onClose={() => setIsAddingTeam(false)} title="Add New Team" width="400px">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <Input
                        ref={(el) => { if (el) setTimeout(() => el.focus(), 100); }}
                        placeholder="Team Name (e.g. SRE, Support)"
                        value={newTeamName}
                        onChange={e => setNewTeamName(e.target.value)}
                        autoFocus
                        onKeyDown={e => {
                            if (e.key === 'Enter' && newTeamName.trim()) {
                                handleAddTeam(newTeamName.trim());
                                setNewTeamName('');
                                setIsAddingTeam(false);
                            }
                        }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                        <TactileButton variant="secondary" onClick={() => setIsAddingTeam(false)}>Cancel</TactileButton>
                        <TactileButton variant="primary" onClick={() => { if (newTeamName.trim()) { handleAddTeam(newTeamName.trim()); setNewTeamName(''); setIsAddingTeam(false); } }}>Add Team</TactileButton>
                    </div>
                </div>
            </Modal>

            {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
        </div>
    );
};
