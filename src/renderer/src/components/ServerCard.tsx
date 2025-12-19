import React, { memo } from 'react';
import { Server, Contact } from '@shared/ipc';
import { getColorForString } from '../utils/colors';
import { Tooltip } from './Tooltip';

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

const UserAvatar = ({ name, color, border }: { name: string, color: string, border: string }) => (
    <div style={{
        width: '24px', height: '24px', borderRadius: '6px',
        background: color,
        color: '#fff',
        border: `1px solid ${border}`,
        fontSize: '11px', fontWeight: 700,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0
    }}>
        {name.charAt(0).toUpperCase()}
    </div>
);

const PersonInfo = ({ label, value, contactLookup }: { label: string, value: string, contactLookup: Map<string, Contact> }) => {
    if (!value || value === '-' || value === '0') return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.3 }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 600, fontSize: '9px', width: '60px' }}>{label}</span>
            <span style={{ fontSize: '12px' }}>-</span>
        </div>
    );

    const parts = value.split(';').map(p => p.trim()).filter(p => p);
    const primaryStr = parts[0];
    const found = contactLookup.get(primaryStr.toLowerCase());
    const displayName = found ? found.name : primaryStr;
    const colorScheme = getColorForString(displayName);

    const allNames = parts.map(p => {
        const c = contactLookup.get(p.toLowerCase());
        return c ? c.name : p;
    }).join('; ');

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--color-text-tertiary)', fontWeight: 700, fontSize: '9px', width: '60px', letterSpacing: '0.05em' }}>{label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <UserAvatar name={displayName} color={colorScheme.bg} border={colorScheme.border} />
                <Tooltip content={allNames}>
                    <span style={{
                        color: 'var(--color-text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        fontWeight: 500
                    }}>
                        {displayName}
                        {parts.length > 1 && (
                            <span style={{ opacity: 0.5, marginLeft: '6px', fontSize: '11px' }}>
                                +{parts.length - 1}
                            </span>
                        )}
                    </span>
                </Tooltip>
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
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center'
            }}
        >
            <div
                style={{
                    width: '100%',
                    height: 'calc(100% - 12px)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 20px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '12px',
                    gap: '24px',
                    transition: 'all 0.2s ease',
                    cursor: 'default',
                    position: 'relative',
                    overflow: 'hidden'
                }}
                className="server-card-hover"
            >
                {/* Platform Indicator Strip */}
                <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '4px',
                    background: osInfo.text,
                    opacity: 0.8
                }} />

                {/* Main Content Stack - Vertical for 10ft readability */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minWidth: 0,
                    gap: '4px',
                    justifyContent: 'center',
                    padding: '12px 0'
                }}>
                    {/* Row 1: Name and Platform Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                            fontSize: '20px',
                            fontWeight: 800,
                            color: 'var(--color-text-primary)',
                            letterSpacing: '-0.02em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                        }}>
                            {server.name}
                        </span>
                        <span style={{
                            fontSize: '10px',
                            fontWeight: 900,
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: osInfo.bg,
                            border: `1px solid ${osInfo.border}`,
                            color: osInfo.text,
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase'
                        }}>
                            {osInfo.label}
                        </span>
                    </div>

                    {/* Row 2: Business Area | LOB | Comments */}
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
                        <span style={{ color: 'var(--color-text-primary)', opacity: 0.9 }}>{server.businessArea}</span>
                        <span style={{ opacity: 0.3, fontSize: '16px' }}>|</span>
                        <span>{server.lob}</span>
                        {server.comment && server.comment !== '-' && (
                            <>
                                <span style={{ opacity: 0.3, fontSize: '16px' }}>|</span>
                                <span style={{
                                    fontStyle: 'italic',
                                    opacity: 0.6,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}>
                                    {server.comment}
                                </span>
                            </>
                        )}
                    </div>

                    {/* Row 3: Owners & IT Contacts */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '24px',
                        marginTop: '4px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PersonInfo label="OWNER" value={server.owner || ''} contactLookup={contactLookup} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <PersonInfo label="IT CONTACT" value={server.contact || ''} contactLookup={contactLookup} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});
