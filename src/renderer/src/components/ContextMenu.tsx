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
        className="animate-fade-in"
        style={{
          position: 'fixed',
          top: y,
          left: x,
          background: '#1E1E21', // Slightly lighter than surface
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4), 0 0 0 1px rgba(0,0,0,0.2)', // Deep shadow + border
          zIndex: 99999,
          padding: '4px',
          minWidth: '160px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {items.map((item, i) => (
          <div
            key={i}
            onClick={() => { item.onClick(); onClose(); }}
            style={{
              padding: '6px 10px',
              cursor: 'pointer',
              fontSize: '13px',
              color: item.danger ? '#FF5C5C' : 'var(--color-text-primary)', // Attio red is slightly softer
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = item.danger ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {item.icon && <span style={{ opacity: 0.7 }}>{item.icon}</span>}
            {item.label}
          </div>
        ))}
      </div>
    </>,
    document.body
  );
};
