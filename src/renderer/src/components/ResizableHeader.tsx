import React, { useState, useRef, useEffect } from 'react';

type SortConfig = {
    key: string;
    direction: 'asc' | 'desc';
};

export const ResizableHeader = ({
    label,
    width,
    minWidth = 50,
    sortKey,
    currentSort,
    onResize,
    onSort
}: {
    label: string,
    width: number,
    minWidth?: number,
    sortKey: string,
    currentSort: SortConfig,
    onResize: (w: number) => void,
    onSort: (key: any) => void
}) => {
    const [isResizing, setIsResizing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const startX = useRef(0);
    const startWidth = useRef(0);

    useEffect(() => {
        if (!isResizing) return;

        const onMouseMove = (e: MouseEvent) => {
            const diff = e.clientX - startX.current;
            const newWidth = Math.max(minWidth, startWidth.current + diff);
            onResize(newWidth);
        };

        const onMouseUp = () => {
            setIsResizing(false);
            document.body.style.cursor = 'default';
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isResizing, minWidth, onResize]);

    const isSorted = currentSort.key === sortKey;

    return (
        <div
            style={{
                width: width,
                flex: 'none',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer',
                paddingRight: '16px' // Reserve space for resize handle
            }}
            onClick={() => onSort(sortKey)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <span style={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                flex: 1
            }}>
                {label}
            </span>

            {isSorted && (
                <span style={{
                    fontSize: '10px',
                    color: 'var(--color-text-primary)',
                    flexShrink: 0,
                    marginRight: '2px'
                }}>
                    {currentSort.direction === 'asc' ? '▲' : '▼'}
                </span>
            )}

            {/* Resize Handle Area - Enhanced */}
            <div
                data-resize-handle="true"
                style={{
                    position: 'absolute',
                    right: '-6px', // Center on the edge
                    top: 0,
                    bottom: 0,
                    width: '12px',
                    cursor: 'col-resize',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background var(--transition-fast)'
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsResizing(true);
                    startX.current = e.clientX;
                    startWidth.current = width;
                    document.body.style.cursor = 'col-resize';
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={(e) => {
                    if (!isResizing) {
                        e.currentTarget.style.background = 'transparent';
                    }
                }}
            >
                {/* Visual Grabber - Refined Attio Style */}
                <div style={{
                    width: '3px',
                    height: '16px',
                    background: (isHovered || isResizing)
                        ? 'linear-gradient(180deg, var(--color-accent-blue) 0%, var(--color-text-tertiary) 100%)'
                        : 'rgba(255, 255, 255, 0.15)',
                    borderRadius: 'var(--radius-sm)',
                    transition: 'all var(--transition-base)',
                    boxShadow: (isHovered || isResizing) ? '0 0 8px rgba(59, 130, 246, 0.3)' : 'none'
                }} />
            </div>
        </div>
    );
};
