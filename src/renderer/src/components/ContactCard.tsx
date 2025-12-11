import React, { memo } from 'react';
import { getColorForString } from '../utils/colors';
import { formatPhoneNumber } from '../utils/phone';

type ContactRowProps = {
  name: string;
  email: string;
  title?: string;
  phone?: string;
  avatarColor?: string;
  action?: React.ReactNode;
  style?: React.CSSProperties;
  className?: string;
  sourceLabel?: string;
  groups?: string[];
  selected?: boolean;
  columnWidths?: {
    name: number;
    title: number;
    email: number;
    phone: number;
    groups: number;
  };
  columnOrder?: (keyof ContactRowProps['columnWidths'])[];
};

// --- Utils ---
const getAvatarColor = (name: string) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const isValidName = (name: string) => {
    if (!name) return false;
    const stripped = name.replace(/[.\s\-_]/g, '');
    return stripped.length > 0;
};

const getInitials = (name: string, email: string) => {
  if (isValidName(name)) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return name.slice(0, 2).toUpperCase();
  }
  return (email && email.length > 0) ? email[0].toUpperCase() : '?';
};

export const ContactCard = memo(({ name, email, title, phone, avatarColor, action, style, className, sourceLabel, groups = [], selected, columnWidths, columnOrder }: ContactRowProps) => {
  const color = avatarColor || getAvatarColor(name || email);
  const formattedPhone = formatPhoneNumber(phone || '');
  const validName = isValidName(name);
  const displayName = validName ? name : email;

  const getStyle = (key: 'name' | 'title' | 'email' | 'phone' | 'groups' | 'default', defaultFlex: number) => {
      if (columnWidths && key !== 'default' && columnWidths[key]) {
          return { width: columnWidths[key], flex: 'none', minWidth: 0 };
      }
      return { flex: defaultFlex, minWidth: 0 };
  };

  const renderCell = (key: string) => {
      switch (key) {
          case 'name':
              return (
                <div key="name" style={{ ...getStyle('name', 1.5), display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Avatar */}
                    <div style={{
                        width: '24px', // Dense avatar
                        height: '24px',
                        borderRadius: '6px', // Squircle
                        background: `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.2)`,
                        color: color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        flexShrink: 0
                    }}>
                        {getInitials(name, email)}
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {displayName}
                    </div>
                     {sourceLabel && (
                        <span className="source-label" style={{
                            fontSize: '9px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            color: 'var(--color-text-secondary)',
                            padding: '1px 4px',
                            borderRadius: '3px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            marginLeft: '8px'
                        }}>
                            {sourceLabel}
                        </span>
                    )}
                </div>
              );
          case 'title':
              return (
                <div key="title" style={{ ...getStyle('title', 1), fontSize: '13px', color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {title || '-'}
                </div>
              );
          case 'email':
              return (
                <div key="email" style={{ ...getStyle('email', 1.2), fontSize: '13px', color: 'var(--color-text-primary)', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {email}
                </div>
              );
          case 'phone':
              return (
                <div key="phone" style={{ ...getStyle('phone', 1), fontSize: '13px', color: 'var(--color-text-primary)', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {formattedPhone || '-'}
                </div>
              );
          case 'groups':
              return (
                <div key="groups" style={{ ...getStyle('groups', 1), display: 'flex', gap: '4px', overflow: 'hidden' }}>
                    {groups.slice(0, 2).map(g => {
                         const c = getColorForString(g);
                         return (
                             <span key={g} style={{
                                 fontSize: '11px',
                                 color: c.text,
                                 background: c.bg,
                                 border: `1px solid ${c.border}`,
                                 padding: '1px 6px',
                                 borderRadius: '4px',
                                 whiteSpace: 'nowrap'
                             }}>
                                 {g}
                             </span>
                         )
                    })}
                    {groups.length > 2 && (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', padding: '1px 4px' }}>+{groups.length - 2}</span>
                    )}
                </div>
              );
          default:
              return null;
      }
  };

  // Default order if none provided (AssemblerTab might not provide it)
  const defaultOrder = ['name', 'title', 'email', 'phone', 'groups'];
  const effectiveOrder = columnOrder || defaultOrder;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px', // Side padding
        background: selected ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        transition: 'background 0.05s',
        cursor: 'default',
        gap: '16px' // Spacing between columns
      }}
      className={`contact-row ${className || ''}`}
      onMouseEnter={(e) => {
         if (!selected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
         // Show actions on hover (handled by parent logic typically, or CSS)
         const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement;
         if (actions) actions.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
         if (!selected) e.currentTarget.style.background = 'transparent';
         const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement;
         if (actions) actions.style.opacity = '0';
      }}
    >
        {effectiveOrder.map(key => renderCell(key))}

        {/* Column: Actions (Fixed) */}
        <div className="row-actions" style={{
            width: '80px',
            flexShrink: 0,
            display: 'flex',
            justifyContent: 'flex-end',
            opacity: 0, // Hidden by default
            transition: 'opacity 0.1s'
        }}>
            {action}
        </div>
    </div>
  );
});
