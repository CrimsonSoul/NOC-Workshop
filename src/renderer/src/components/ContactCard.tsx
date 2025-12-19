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
        padding: '0 8px',
        position: 'relative',
        boxSizing: 'border-box'
      }}
    >
      <div
        style={{
          flex: 1,
          height: 'calc(100% - 10px)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 8px',
          background: selected ? 'rgba(59, 130, 246, 0.08)' : 'rgba(255, 255, 255, 0.02)',
          border: selected ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '12px',
          gap: '10px',
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
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: colorScheme.bg,
            border: `1px solid ${colorScheme.border}`,
            color: colorScheme.text,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            fontWeight: 800,
            flexShrink: 0,
            position: 'relative'
          }}
        >
          {getInitials(name, email)}
        </div>

        {/* Main Info Stack - Vertical for maximum narrow-width compatibility */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          minWidth: 0,
          gap: '4px',
          justifyContent: 'center'
        }}>
          {/* Top Row: Name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '20px',
              fontWeight: 800,
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.02em'
            }}>
              {displayName}
            </span>
            {sourceLabel && (
              <span style={{
                fontSize: '10px',
                background: 'rgba(255, 255, 255, 0.12)',
                color: 'var(--color-text-primary)',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 900,
                textTransform: 'uppercase',
                flexShrink: 0,
                letterSpacing: '0.05em'
              }}>
                {sourceLabel}
              </span>
            )}
          </div>

          {/* Middle Row: Title | Email */}
          <div style={{
            fontSize: '14px',
            color: 'var(--color-text-secondary)',
            fontWeight: 550,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            overflow: 'hidden'
          }}>
            {title && (
              <>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
                <span style={{ opacity: 0.3, fontSize: '16px' }}>|</span>
              </>
            )}
            <span style={{ opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis' }}>{email}</span>
          </div>

          {/* Bottom Row: Phone & Groups */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginTop: '2px'
          }}>
            {formattedPhone && (
              <span style={{
                fontSize: '18px',
                color: '#60A5FA', // Brighter blue for 10ft visibility
                fontWeight: 700,
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap'
              }}>
                {formattedPhone}
              </span>
            )}

            {groups.length > 0 && (
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {groups.slice(0, 1).map(g => (
                  <GroupPill key={g} group={g} />
                ))}
                {groups.length > 1 && (
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--color-text-tertiary)',
                    fontWeight: 700,
                    background: 'rgba(255,255,255,0.05)',
                    padding: '2px 6px',
                    borderRadius: '6px'
                  }}>
                    +{groups.length - 1}
                  </span>
                )}
              </div>
            )}
          </div>
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
