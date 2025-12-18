import React from 'react';

type Tab = 'Compose' | 'People' | 'Reports' | 'Live' | 'Servers' | 'Weather';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenSettings: () => void;
}

const SidebarButton = ({
  icon,
  label,
  isActive,
  onClick
}: {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        background: isActive
          ? 'rgba(59, 130, 246, 0.15)'
          : isHovered
          ? 'rgba(255, 255, 255, 0.06)'
          : 'transparent',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        color: isActive ? 'var(--color-accent-blue)' : isHovered ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
        transition: 'all 0.15s ease',
        borderRadius: '6px',
        outline: 'none'
      }}
    >
      {icon}

      {/* Active indicator bar */}
      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: '-6px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '16px',
            width: '2px',
            background: 'var(--color-accent-blue)',
            borderRadius: '0 1px 1px 0'
          }}
        />
      )}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onOpenSettings }) => {
  return (
    <div style={{
      width: '48px',
      background: 'var(--color-bg-sidebar)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      paddingBottom: '12px',
      gap: '4px',
      zIndex: 9002,
      WebkitAppRegion: 'drag' as any
    }}>
      {/* App Icon */}
      <div style={{
        width: '28px',
        height: '28px',
        background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #2563EB 100%)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 600,
        fontSize: '13px',
        marginBottom: '12px',
        WebkitAppRegion: 'no-drag' as any
      }}>
        R
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
        WebkitAppRegion: 'no-drag' as any
      }}>
        <SidebarButton
          label="Compose"
          isActive={activeTab === 'Compose'}
          onClick={() => onTabChange('Compose')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          }
        />
        <SidebarButton
          label="People"
          isActive={activeTab === 'People'}
          onClick={() => onTabChange('People')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <SidebarButton
          label="Servers"
          isActive={activeTab === 'Servers'}
          onClick={() => onTabChange('Servers')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
              <line x1="6" y1="6" x2="6.01" y2="6"/>
              <line x1="6" y1="18" x2="6.01" y2="18"/>
            </svg>
          }
        />
        <SidebarButton
          label="Reports"
          isActive={activeTab === 'Reports'}
          onClick={() => onTabChange('Reports')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          }
        />
        <SidebarButton
          label="Live"
          isActive={activeTab === 'Live'}
          onClick={() => onTabChange('Live')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </nav>

      {/* Settings */}
      <div style={{ WebkitAppRegion: 'no-drag' as any }}>
        <SidebarButton
          label="Weather"
          isActive={activeTab === 'Weather'}
          onClick={() => onTabChange('Weather')}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19c0-1.7-1.3-3-3-3h-11c-1.7 0-3 1.3-3 3 .6 0 1.1.5 1.1 1.1 0 .6-.5 1.1-1.1 1.1v.8h17v-.8c-.6 0-1.1-.5-1.1-1.1 0-.6.5-1.1 1.1-1.1z"/>
              <path d="M6 16v-2a6 6 0 1 1 12 0v2"/>
              <path d="M12 9V3"/>
              <path d="M20 16.2A4.5 4.5 0 0 0 17.5 8h-1.8A7 7 0 1 0 4 14.9"/>
            </svg>
          }
        />
        <div style={{ height: '4px' }} />
        <SidebarButton
          label="Settings"
          isActive={false}
          onClick={onOpenSettings}
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          }
        />
      </div>
    </div>
  );
};
