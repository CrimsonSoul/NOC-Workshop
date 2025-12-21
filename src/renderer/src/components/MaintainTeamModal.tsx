import React, { useState, useEffect, useMemo } from 'react';
import { OnCallRow, Contact } from '@shared/ipc';
import { Modal } from './Modal';
import { TactileButton } from './TactileButton';
import { Input } from './Input';
import { Combobox } from './Combobox';
import { v4 as uuidv4 } from 'uuid';
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
import { formatPhoneNumber } from '../utils/phone';

interface MaintainTeamModalProps {
    isOpen: boolean;
    onClose: () => void;
    teamName: string;
    initialRows: OnCallRow[];
    contacts: Contact[];
    onSave: (team: string, rows: OnCallRow[]) => void;
}

const SortableEditRow = ({
    row,
    contacts,
    onUpdate,
    onRemove
}: {
    row: OnCallRow;
    contacts: Contact[];
    onUpdate: (row: OnCallRow) => void;
    onRemove: () => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: row.id });

    const [isActive, setIsActive] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.5 : 1,
        position: 'relative' as const,
        zIndex: isDragging ? 999 : (isActive ? 100 : 'auto'), // Elevate z-index when using dropdowns
    };

    const contactOptions = useMemo(() => contacts.map(c => ({
        label: c.name,
        value: c.name,
        subLabel: c.title
    })), [contacts]);

    const roleOptions = useMemo(() => [
        { label: 'Primary', value: 'Primary' },
        { label: 'Backup', value: 'Backup' },
        { label: 'Backup/Weekend', value: 'Backup/Weekend' },
        { label: 'Weekend', value: 'Weekend' },
    ], []);

    const handleNameChange = (val: string) => {
        const nextRow = { ...row, name: val };
        // Auto-match contact info
        const match = contacts.find(c => c.name.toLowerCase() === val.toLowerCase());
        if (match && match.phone) {
            nextRow.contact = formatPhoneNumber(match.phone);
        }
        onUpdate(nextRow);
    };

    const handleContactBlur = () => {
        onUpdate({ ...row, contact: formatPhoneNumber(row.contact) });
    };

    return (
        <div ref={setNodeRef} style={style} className="animate-slide-up">
            <div style={{
                display: 'grid',
                gridTemplateColumns: '30px 140px 1fr 140px 120px 30px', // Adjusted for better spacing
                gap: '12px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
                padding: '12px',
                borderRadius: '12px',
                marginBottom: '8px',
                transition: 'background 0.2s',
            }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
            >
                <div
                    {...attributes}
                    {...listeners}
                    style={{
                        cursor: 'grab',
                        opacity: 0.4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px'
                    }}
                    className="hover-bg"
                >
                    ⋮⋮
                </div>

                <div style={{ position: 'relative' }}>
                    <Combobox
                        value={row.role}
                        onChange={(val) => onUpdate({ ...row, role: val })}
                        options={roleOptions}
                        placeholder="Role"
                        style={{ fontWeight: 600, fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                        onOpenChange={setIsActive}
                    />
                </div>

                <div style={{ position: 'relative' }}>
                    <Combobox
                        value={row.name}
                        onChange={handleNameChange}
                        options={contactOptions}
                        placeholder="Select Contact..."
                        style={{ fontSize: '14px' }}
                        onOpenChange={setIsActive}
                    />
                </div>

                <Input
                    value={row.contact}
                    onChange={e => onUpdate({ ...row, contact: e.target.value })}
                    onBlur={handleContactBlur}
                    placeholder="Phone"
                    style={{ fontSize: '13px', fontFamily: 'var(--font-mono)' }}
                />

                <Input
                    value={row.timeWindow || ''}
                    onChange={e => onUpdate({ ...row, timeWindow: e.target.value })}
                    placeholder="Time Window"
                    style={{ fontSize: '12px', color: 'var(--color-text-secondary)', textAlign: 'center' }}
                />

                <div
                    style={{
                        cursor: 'pointer',
                        color: 'var(--color-danger)',
                        opacity: 0.6,
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        transition: 'all 0.2s'
                    }}
                    onClick={onRemove}
                    onMouseEnter={e => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.background = 'rgba(255, 92, 92, 0.1)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.opacity = '0.6';
                        e.currentTarget.style.background = 'transparent';
                    }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export const MaintainTeamModal: React.FC<MaintainTeamModalProps> = ({
    isOpen,
    onClose,
    teamName,
    initialRows,
    contacts,
    onSave
}) => {
    const [rows, setRows] = useState<OnCallRow[]>([]);

    useEffect(() => {
        if (isOpen) {
            setRows(initialRows.map(r => ({ ...r }))); // Deep copy to avoid mutating parent state
        }
    }, [isOpen]); // Only reset when opening, NOT when initialRows changes while open

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setRows((items) => {
                const oldIndex = items.findIndex(r => r.id === active.id);
                const newIndex = items.findIndex(r => r.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleUpdate = (updated: OnCallRow) => {
        setRows(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleRemove = (id: string) => {
        setRows(prev => prev.filter(r => r.id !== id));
    };

    const handleAddRow = () => {
        setRows(prev => [
            ...prev,
            {
                id: uuidv4(),
                team: teamName,
                role: '',
                name: '',
                contact: '',
                timeWindow: ''
            }
        ]);
    };

    const handleSave = () => {
        onSave(teamName, rows);
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Edit Team: ${teamName}`} width="900px">
            <div style={{ display: 'flex', flexDirection: 'column', height: '65vh' }}>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    paddingRight: '4px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                }}>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                            {rows.map(row => (
                                <SortableEditRow
                                    key={row.id}
                                    row={row}
                                    contacts={contacts}
                                    onUpdate={handleUpdate}
                                    onRemove={() => handleRemove(row.id)}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    <TactileButton
                        variant="ghost"
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            border: '1px dashed rgba(255,255,255,0.1)',
                            opacity: 0.8,
                            height: '48px'
                        }}
                        onClick={handleAddRow}
                    >
                        + Add Row
                    </TactileButton>
                </div>

                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '24px',
                    paddingTop: '20px',
                    borderTop: '1px solid rgba(255,255,255,0.1)'
                }}>
                    <TactileButton variant="secondary" onClick={onClose}>Cancel</TactileButton>
                    <TactileButton variant="primary" onClick={handleSave}>Save Changes</TactileButton>
                </div>
            </div>
        </Modal>
    );
};
