import React, { memo, useState } from 'react';
import { getColorForString } from '../utils/colors';
import { formatPhoneNumber } from '../utils/phone';
import { Tooltip } from './Tooltip';

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
  const c = getColorForString(group);

  return (
    <span
      style={{
        fontSize: '11px',
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
        padding: '2px 8px',
        borderRadius: '12px',
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}
    >
      {group.toUpperCase()}
    </span>
  );
};

export const ContactCard = memo(({ name, email, title, phone, avatarColor, action, style, className, sourceLabel, groups = [], selected }: ContactRowProps) => {
  const colorScheme = getColorForString(name || email);
  const color = avatarColor || colorScheme.text;
  const formattedPhone = formatPhoneNumber(phone || '');
  const validName = isValidName(name);
  const displayName = validName ? name : email;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        ...style,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        position: 'relative'
      }}
    >
      <div
        style={{
          width: '100%',
          height: 'calc(100% - 12px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          background: selected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          border: selected ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          gap: '20px',
          transition: 'all 0.2s ease',
          cursor: 'default',
          position: 'relative',
          overflow: 'hidden'
        }}
        className="contact-card-hover"
      >
        {/* Accent Strip */}
        <div style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: '4px',
          background: color,
          opacity: 0.6
        }} />

        {/* Avatar */}
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: '12px',
            background: colorScheme.bg,
            border: `1px solid ${colorScheme.border}`,
            color: colorScheme.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            fontWeight: 800,
            flexShrink: 0,
            position: 'relative'
          }}
        >
          {getInitials(name, email)}
        </div>

        {/* Info Section */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '17px',
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
                fontSize: '9px',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--color-text-tertiary)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 800,
                textTransform: 'uppercase',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                flexShrink: 0,
                letterSpacing: '0.05em'
              }}>
                {sourceLabel}
              </span>
            )}
          </div>

          <div style={{
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {title && (
              <>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                <span style={{ opacity: 0.3 }}>|</span>
              </>
            )}
            <span style={{ opacity: 0.8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
          </div>
        </div>

        {/* Contact Details Section */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          gap: '8px',
          width: '240px',
          flexShrink: 0,
          paddingLeft: '12px',
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          {formattedPhone && (
            <div style={{
              fontSize: '15px',
              color: 'var(--color-text-primary)',
              fontWeight: 600,
              letterSpacing: '0.02em'
            }}>
              {formattedPhone}
            </div>
          )}

          {groups.length > 0 && (
            <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
              {groups.slice(0, 2).map(g => (
                <GroupPill key={g} group={g} />
              ))}
              {groups.length > 2 && (
                <Tooltip content={groups.slice(2).join(', ')}>
                  <span
                    style={{
                      fontSize: '11px',
                      color: 'var(--color-text-primary)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '2px 6px',
                      borderRadius: '12px',
                      fontWeight: 700,
                      cursor: 'help'
                    }}
                  >
                    +{groups.length - 2}
                  </span>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>

      {action && (
        <div className="row-actions" style={{
          position: 'absolute',
          right: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'var(--color-bg-surface)',
          padding: '4px 8px',
          borderRadius: '8px',
          display: 'flex',
          gap: '4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          border: '1px solid rgba(255,255,255,0.1)',
          zIndex: 10
        }}>
          {action}
        </div>
      )}
    </div>
  );
});
