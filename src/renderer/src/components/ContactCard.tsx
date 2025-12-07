import React, { memo } from 'react';

type ContactCardProps = {
  name: string;
  email: string;
  title?: string;
  phone?: string;
  avatarColor?: string;
  action?: React.ReactNode;
  isSearchMatch?: boolean;
  style?: React.CSSProperties;
  className?: string;
  sourceLabel?: string;
};

// --- Utils ---
const getAvatarColor = (name: string) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string) => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
};

const formatPhone = (phone: string | undefined) => {
  if (!phone) return null;
  // Strip non-numeric chars
  const cleaned = phone.replace(/\D/g, '');
  // Format as (XXX) XXX-XXXX if 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  // If 11 digits and starts with 1, format as 1 (XXX) XXX-XXXX
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
     return `1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
};

export const ContactCard = memo(({ name, email, title, phone, avatarColor, action, style, className, sourceLabel }: ContactCardProps) => {
  const color = avatarColor || getAvatarColor(name);
  const formattedPhone = formatPhone(phone);

  return (
    <div
      style={{
        ...style,
        height: '72px', // Slightly taller for better spacing
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        background: 'transparent',
        borderBottom: 'var(--border-subtle)',
        transition: 'background 0.15s',
      }}
      className={`contact-card ${className || ''}`}
      onMouseEnter={(e) => {
         e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
      }}
      onMouseLeave={(e) => {
         e.currentTarget.style.background = 'transparent';
      }}
    >
      {/* Avatar */}
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        background: `rgba(${parseInt(color.slice(1,3), 16)}, ${parseInt(color.slice(3,5), 16)}, ${parseInt(color.slice(5,7), 16)}, 0.2)`,
        color: color,
        border: `1px solid ${color}40`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 600,
        marginRight: '20px',
        flexShrink: 0
      }}>
        {getInitials(name)}
      </div>

      {/* Info Group 1: Name & Title */}
      <div style={{ flex: 1.2, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '16px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
          {name}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title || 'No Title'}
        </div>
      </div>

       {/* Info Group 2: Contact Details */}
       <div style={{
          flex: 1.5,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
          paddingRight: '16px'
        }}>
          <div style={{
            fontSize: '14px',
            fontFamily: 'var(--font-family-mono)',
            color: 'var(--color-text-secondary)',
            opacity: 1, // Increased visibility
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {email}
          </div>
          {formattedPhone && (
            <div style={{
              fontSize: '14px', // Increased size
              fontFamily: 'var(--font-family-mono)',
              color: 'var(--color-text-tertiary)',
              fontWeight: 500,
              opacity: 1 // Increased visibility
            }}>
              {formattedPhone}
            </div>
          )}
        </div>

        {/* Source Label (if any) */}
        {sourceLabel && (
          <div style={{ paddingRight: '24px' }}>
             <span style={{
                fontSize: '11px',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#A78BFA',
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {sourceLabel}
              </span>
          </div>
        )}

        {/* Action Button Area */}
        {action && (
          <div style={{ minWidth: '80px', display: 'flex', justifyContent: 'flex-end' }}>
            {action}
          </div>
        )}
    </div>
  );
});
