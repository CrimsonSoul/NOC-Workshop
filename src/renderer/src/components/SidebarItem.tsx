import React, { memo } from 'react';
import { getColorForString } from '../utils/colors';

type SidebarItemProps = {
  label: string;
  count?: number;
  active: boolean;
  onClick: (label: string) => void;
  onContextMenu?: (e: React.MouseEvent, label: string) => void;
};

export const SidebarItem = memo(({ label, count, active, onClick, onContextMenu }: SidebarItemProps) => {
  const color = getColorForString(label);

  const handleClick = () => {
    onClick(label);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (onContextMenu) {
      onContextMenu(e, label);
    }
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      style={{
        padding: '4px 8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'all 0.1s ease',
        userSelect: 'none',
        border: 'none',
        width: '100%',
        fontFamily: 'inherit',
        textAlign: 'left',
        outline: 'none',
        overflow: 'hidden',
        minHeight: '32px'
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', overflow: 'hidden' }}>
        <span style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          color: color.text,
          background: color.bg,
          border: `1px solid ${color.border}`,
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600,
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
          </span>
          {count !== undefined && (
            <span style={{
              opacity: 0.8,
              fontSize: '11px',
              fontWeight: 500,
              borderLeft: `1px solid ${color.border}`,
              paddingLeft: '6px',
              flexShrink: 0
            }}>
              {count}
            </span>
          )}
        </span>
      </div>
    </button>
  );
});

SidebarItem.displayName = 'SidebarItem';
