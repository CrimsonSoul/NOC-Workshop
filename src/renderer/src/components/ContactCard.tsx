import React, { memo, useState } from 'react';
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

const GroupPill = ({ group }: { group: string }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const c = getColorForString(group);

  return (
    <div style={{ position: 'relative' }}>
      <span
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        style={{
          fontSize: '12px',
          color: c.text,
          background: c.bg,
          border: `1px solid ${c.border}`,
          padding: '2px 8px',
          borderRadius: '12px',
          fontWeight: 600,
          maxWidth: '100px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'block',
          cursor: 'pointer'
        }}
      >
        {group}
      </span>
      {showTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          background: '#18181B',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          padding: '6px 10px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          whiteSpace: 'nowrap',
          fontSize: '12px',
          color: 'var(--color-text-primary)'
        }}>
          {group}
        </div>
      )}
    </div>
  );
};

export const ContactCard = memo(({ name, email, title, phone, avatarColor, action, style, className, sourceLabel, groups = [], selected }: ContactRowProps) => {
  const [showOverflowTooltip, setShowOverflowTooltip] = useState(false);

  const color = avatarColor || getAvatarColor(name || email);
  const formattedPhone = formatPhoneNumber(phone || '');
  const validName = isValidName(name);
  const displayName = validName ? name : email;

  // Build accessible description
  const accessibleDescription = [
    displayName,
    title && `Title: ${title}`,
    `Email: ${email}`,
    formattedPhone && `Phone: ${formattedPhone}`,
    groups.length > 0 && `Groups: ${groups.join(', ')}`
  ].filter(Boolean).join('. ');

  return (
    <div
      role="row"
      aria-label={accessibleDescription}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      style={{
        width: '100%',
        height: '100%',
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        background: selected ? 'var(--color-accent-blue-subtle)' : 'transparent',
        borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
        transition: 'all var(--transition-fast)',
        cursor: 'default',
        gap: '12px',
        position: 'relative'
      }}
      className={`contact-row ${className || ''}`}
      onMouseEnter={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
          e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
        }
        const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement;
        if (actions) actions.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        if (!selected) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.borderBottomColor = 'rgba(255, 255, 255, 0.04)';
        }
        const actions = e.currentTarget.querySelector('.row-actions') as HTMLElement;
        if (actions) actions.style.opacity = '0';
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%', // Circle for better scanability in lists
          background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
          border: `1px solid ${color}40`,
          color: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 600,
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden'
        }}
        aria-hidden="true"
      >
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: `linear-gradient(135deg, transparent 0%, ${color}10 50%, transparent 100%)`,
          pointerEvents: 'none'
        }} />
        <span style={{ position: 'relative', zIndex: 1 }}>
          {getInitials(name, email)}
        </span>
      </div>

      {/* Main Content: Stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, justifyContent: 'center', gap: '2px' }}>
        {/* Top Line: Name + Source Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 700,
            color: 'var(--color-text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            letterSpacing: '-0.01em'
          }}>
            {displayName}
          </span>
          {sourceLabel && (
            <span style={{
              fontSize: '10px',
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--color-text-tertiary)',
              padding: '2px 6px',
              borderRadius: '4px',
              fontWeight: 700,
              textTransform: 'uppercase',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              flexShrink: 0
            }}>
              {sourceLabel}
            </span>
          )}
        </div>

        {/* Bottom Line: Title • Email */}
        <div style={{
          fontSize: '14px',
          color: 'var(--color-text-secondary)',
          fontWeight: 500,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {title && <span>{title}</span>}
          {title && email && <span style={{ opacity: 0.4 }}>•</span>}
          <span style={{ opacity: title ? 0.8 : 1 }}>{email}</span>
        </div>
      </div>

      {/* Right Side: Phone & Groups Stacked */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', gap: '4px', flexShrink: 0, minWidth: '100px' }}>
        {/* Phone Number */}
        {formattedPhone && (
          <div style={{
            fontSize: '15px',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            whiteSpace: 'nowrap',
            marginBottom: '1px'
          }}>
            {formattedPhone}
          </div>
        )}

        {/* Groups Pill Row */}
        {groups.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap', position: 'relative' }}>
            {groups.slice(0, 2).map(g => (
              <GroupPill key={g} group={g} />
            ))}
            {groups.length > 2 && (
              <>
                <span
                  onMouseEnter={() => setShowOverflowTooltip(true)}
                  onMouseLeave={() => setShowOverflowTooltip(false)}
                  style={{
                    fontSize: '11px',
                    color: 'var(--color-text-primary)',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '2px 6px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    cursor: 'pointer'
                  }}
                >
                  +{groups.length - 2}
                </span>

                {/* Custom Hover Tooltip */}
                {showOverflowTooltip && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '4px',
                    background: '#18181B',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                    zIndex: 100,
                    minWidth: 'max-content',
                    maxWidth: '200px'
                  }}>
                    <div style={{
                      fontSize: '11px',
                      color: 'var(--color-text-secondary)',
                      marginBottom: '4px',
                      fontWeight: 600,
                      textTransform: 'uppercase'
                    }}>
                      Additional Groups
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--color-text-primary)',
                      lineHeight: '1.4'
                    }}>
                      {groups.slice(2).join(', ')}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions (Floating) */}
      {action && (
        <div className="row-actions" style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-bg-surface)', // Opaque to cover content
          paddingLeft: '8px',
          borderRadius: '4px',
          opacity: 0,
          transition: 'opacity 0.1s',
          boxShadow: '-4px 0 8px rgba(0,0,0,0.2)'
        }}>
          {action}
        </div>
      )}
    </div>
  );
});
