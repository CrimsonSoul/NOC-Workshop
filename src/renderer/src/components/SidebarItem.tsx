import React, { memo } from 'react';
import { getColorForString } from '../utils/colors';

type SidebarItemProps = {
  label: string;
  count?: number;
  active: boolean;
  onClick: (label: string) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

export const SidebarItem = memo(({ label, count, active, onClick, onContextMenu }: SidebarItemProps) => {
  const color = getColorForString(label);

  const handleClick = () => {
    onClick(label);
  };

  return (
    <button
      onClick={handleClick}
      onContextMenu={onContextMenu}
      style={{
        padding: '6px 8px',
        borderRadius: '6px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: active ? 'rgba(255,255,255,0.06)' : 'transparent',
        color: active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
        fontSize: '13px',
        fontWeight: 500,
        transition: 'all 0.1s ease',
        userSelect: 'none',
        border: 'none',
        width: '100%',
        fontFamily: 'inherit',
        textAlign: 'left',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        if (!active) {
            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
            e.currentTarget.style.color = 'var(--color-text-primary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
        }
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
        <div style={{
           width: '8px',
           height: '8px',
           borderRadius: '2px',
           background: active ? color.fill : 'transparent',
           border: `1px solid ${active ? color.fill : color.border}`
        }} />
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
        </span>
      </div>
      {count !== undefined && (
        <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: '8px' }}>
            {count}
        </span>
      )}
    </button>
  );
});

SidebarItem.displayName = 'SidebarItem';
