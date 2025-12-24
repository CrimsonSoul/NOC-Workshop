import React, { useState, useEffect, useRef, ReactNode, RefObject } from 'react';

interface CollapsibleHeaderProps {
    title: string;
    subtitle?: ReactNode;
    children?: ReactNode; // Toolbar buttons
    isCollapsed?: boolean; // Allow external control
    onCollapsedChange?: (collapsed: boolean) => void;
}

/**
 * A header component that can collapse to a compact form.
 * Use with useCollapsibleHeader hook to detect scroll position.
 */
export const CollapsibleHeader: React.FC<CollapsibleHeaderProps> = ({
    title,
    subtitle,
    children,
    isCollapsed = false,
}) => {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: isCollapsed ? 'center' : 'flex-end',
                marginBottom: isCollapsed ? '12px' : '24px',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                flexShrink: 0,
            }}
        >
            <div style={{ minWidth: 0, flex: 1 }}>
                <h1
                    style={{
                        fontSize: isCollapsed ? '20px' : '32px',
                        fontWeight: 800,
                        margin: 0,
                        color: 'var(--color-text-primary)',
                        transition: 'font-size 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                    }}
                >
                    {title}
                </h1>
                <div
                    style={{
                        fontSize: '16px',
                        color: 'var(--color-text-tertiary)',
                        margin: isCollapsed ? '0' : '8px 0 0 0',
                        fontWeight: 500,
                        maxHeight: isCollapsed ? '0px' : '50px',
                        opacity: isCollapsed ? 0 : 1,
                        overflow: 'hidden',
                        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                        display: 'flex',
                        alignItems: 'center',
                    }}
                >
                    {subtitle}
                </div>
            </div>

            {children && (
                <div
                    style={{
                        display: 'flex',
                        gap: isCollapsed ? '6px' : '8px',
                        alignItems: 'center',
                        flexShrink: 0,
                        transition: 'gap 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    }}
                >
                    {children}
                </div>
            )}
        </div>
    );
};

/**
 * Hook to detect scroll and control header collapse state.
 * @param scrollThreshold - Amount of scroll (px) before collapsing. Default 50.
 */
export function useCollapsibleHeader(scrollThreshold = 50) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const scrollTop = container.scrollTop;
            setIsCollapsed(scrollTop > scrollThreshold);
        };

        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [scrollThreshold]);

    return { isCollapsed, scrollContainerRef };
}

/**
 * Hook for react-window lists that don't use a native scroll container.
 * Pass the outerRef from react-window's List component.
 */
export function useCollapsibleHeaderForList(scrollThreshold = 50) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const listOuterRef = useRef<HTMLDivElement>(null);

    const handleScroll = ({ scrollOffset }: { scrollOffset: number }) => {
        setIsCollapsed(scrollOffset > scrollThreshold);
    };

    return { isCollapsed, listOuterRef, onScroll: handleScroll };
}
