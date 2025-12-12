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
                cursor: 'pointer'
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
                <span style={{ fontSize: '10px', color: 'var(--color-text-primary)' }}>
                    {currentSort.direction === 'asc' ? '▲' : '▼'}
                </span>
            )}

            {/* Resize Handle Area */}
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: 0,
                    bottom: 0,
                    width: '8px', // Wider hit area
                    cursor: 'col-resize',
                    zIndex: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsResizing(true);
                    startX.current = e.clientX;
                    startWidth.current = width;
                    document.body.style.cursor = 'col-resize';
                }}
            >
                {/* Visual Grabber (Attio Style) */}
                <div style={{
                    width: '2px',
                    height: '12px',
                    background: (isHovered || isResizing) ? 'var(--color-text-tertiary)' : 'transparent',
                    borderRadius: '1px',
                    transition: 'background 0.1s ease'
                }} />
            </div>
        </div>
    );
};
