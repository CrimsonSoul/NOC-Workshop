import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

type ContextMenuProps = {
  x: number;
  y: number;
  onClose: () => void;
  items: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    icon?: React.ReactNode;
  }[];
};

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onClose, items }) => {
  // Adjust position to prevent going off-screen
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on scroll/resize
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [onClose]);

  return createPortal(
    <>
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 99998 }}
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }} // Close on right click elsewhere
      />
      <div
        ref={menuRef}
        className="animate-scale-in"
        style={{
          position: 'fixed',
          top: y,
          left: x,
          background: 'var(--color-bg-surface-elevated)',
          border: 'var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          zIndex: 99999,
          padding: 'var(--space-1)',
          minWidth: '180px',
          display: 'flex',
          flexDirection: 'column',
          gap: '1px',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Subtle gradient accent at top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)'
        }} />

        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              padding: 'var(--space-2) var(--space-3)',
              cursor: 'pointer',
              fontSize: '13px',
              color: item.danger ? 'var(--color-danger)' : 'var(--color-text-primary)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              transition: 'all var(--transition-fast)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = item.danger ? 'var(--color-danger-subtle)' : 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.transform = 'translateX(2px)';
              if (item.danger) {
                e.currentTarget.style.color = 'var(--color-danger-hover)';
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.transform = 'translateX(0)';
              if (item.danger) {
                e.currentTarget.style.color = 'var(--color-danger)';
              }
            }}
          >
            {item.icon && (
              <span style={{
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                fontSize: '14px'
              }}>
                {item.icon}
              </span>
            )}
            <span style={{ flex: 1 }}>{item.label}</span>
          </div>
        ))}
      </div>
    </>,
    document.body
  );
};
