import React, { memo } from 'react';
import { Server, Contact } from '@shared/ipc';
import { getColorForString } from '../utils/colors';

interface ServerCardProps {
    server: Server;
    contactLookup: Map<string, Contact>;
    onContextMenu: (e: React.MouseEvent, server: Server) => void;
    style?: React.CSSProperties;
}

const getPlatformColor = (os: string = '') => {
    const lower = os.toLowerCase();
    if (lower.includes('win')) return { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', label: 'WINDOWS' };
    if (lower.includes('lin') || lower.includes('rhel') || lower.includes('ubuntu') || lower.includes('centos'))
        return { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)', text: '#FB923C', label: 'LINUX' };
    if (lower.includes('vmware') || lower.includes('esx'))
        return { bg: 'rgba(139, 92, 246, 0.1)', border: 'rgba(139, 92, 246, 0.2)', text: '#A78BFA', label: 'VMWARE' };
    return { bg: 'rgba(156, 163, 175, 0.1)', border: 'rgba(156, 163, 175, 0.2)', text: '#9CA3AF', label: os.toUpperCase() || 'UNKNOWN' };
};

const UserAvatar = ({ name, color }: { name: string, color: string }) => (
    <div style={{
        width: '18px', height: '18px', borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}20 0%, ${color}40 100%)`,
        color: color,
        border: `1px solid ${color}40`,
        fontSize: '9px', fontWeight: 800,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
    }}>
        {name.charAt(0).toUpperCase()}
    </div>
);

const PersonInfo = ({ label, value, contactLookup }: { label: string, value: string, contactLookup: Map<string, Contact> }) => {
    if (!value || value === '-' || value === '0') return null;

    const parts = value.split(';').map(p => p.trim()).filter(p => p);
    const primary = parts[0];
    const found = contactLookup.get(primary.toLowerCase());
    const displayName = found ? found.name : primary;
    const color = getColorForString(displayName).text;

    const allNames = parts.map(part => {
        const f = contactLookup.get(part.toLowerCase());
        return f ? f.name : part;
    }).join('; ');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '10px', width: '60px' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                <UserAvatar name={displayName} color={color} />
                <span style={{ color: 'var(--color-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {displayName}
                    {parts.length > 1 && (
                        <span
                            style={{ opacity: 0.5, marginLeft: '4px', cursor: 'help' }}
                            title={allNames}
                        >
                            +{parts.length - 1}
                        </span>
                    )}
                </span>
            </div>
        </div>
    );
};

export const ServerCard = memo(({ server, contactLookup, onContextMenu, style }: ServerCardProps) => {
    const osInfo = getPlatformColor(server.os);

    return (
        <div
            onContextMenu={(e) => onContextMenu(e, server)}
            style={{
                ...style,
                display: 'flex',
                alignItems: 'center',
                padding: '12px 16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                background: 'transparent',
                gap: '24px',
                transition: 'background 0.2s',
                cursor: 'default'
            }}
            className="contact-row hover-bg"
            title={server.comment && server.comment !== '-' ? `Comment: ${server.comment}` : undefined}
        >
            {/* Platform Icon & Main Title Section */}
            <div className="server-card-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: '0 0 200px', minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--color-text-primary)',
                        letterSpacing: '-0.01em'
                    }}>
                        {server.name}
                    </span>
                    <span style={{
                        fontSize: '9px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: osInfo.bg,
                        border: `1px solid ${osInfo.border}`,
                        color: osInfo.text,
                        letterSpacing: '0.05em'
                    }}>
                        {osInfo.label}
                    </span>
                </div>

                <div style={{
                    fontSize: '12px',
                    color: 'var(--color-text-secondary)',
                    fontWeight: 500,
                    display: 'flex',
                    gap: '6px'
                }}>
                    <span>{server.businessArea}</span>
                    <span style={{ opacity: 0.3 }}>/</span>
                    <span>{server.lob}</span>
                </div>
            </div>

            {/* Middle Section: Comments */}
            <div className="server-card-comment" style={{
                flex: 1,
                minWidth: 0,
                fontSize: '11px',
                color: 'var(--color-text-tertiary)',
                fontStyle: 'italic',
                padding: '0 12px',
                display: 'flex',
                alignItems: 'center'
            }}>
                {server.comment && server.comment !== '-' && (
                    <div style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        lineHeight: '1.4'
                    }}>
                        {server.comment}
                    </div>
                )}
            </div>

            {/* People Section */}
            <div className="server-card-people" style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                width: '240px',
                flexShrink: 0,
                paddingLeft: '16px',
                borderLeft: '1px solid rgba(255,255,255,0.04)'
            }}>
                <PersonInfo label="OWNER" value={server.owner} contactLookup={contactLookup} />
                <PersonInfo label="IT CONTACT" value={server.contact} contactLookup={contactLookup} />
            </div>
        </div>
    );
});
