import React from 'react';

type Tab = 'Compose' | 'People' | 'Reports' | 'Live' | 'Servers';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenSettings: () => void;
}

const SidebarItem = ({
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
      className={`sidebar-item ${isActive ? 'active' : ''}`}
      title={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: 'calc(100% - 16px)',
        height: '64px',
        background: isActive
          ? 'rgba(59, 130, 246, 0.08)'
          : isHovered
          ? 'rgba(255, 255, 255, 0.04)'
          : 'transparent',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        color: isActive ? 'var(--color-accent-blue)' : 'var(--color-text-secondary)',
        transition: 'all var(--transition-base)',
        borderRadius: 'var(--radius-lg)',
        margin: '0 var(--space-2)',
        outline: 'none'
      }}
    >
      <div style={{
        marginBottom: 'var(--space-1)',
        transition: 'transform var(--transition-base)',
        transform: isActive ? 'scale(1.05)' : isHovered ? 'scale(1.02)' : 'scale(1)'
      }}>
        {icon}
      </div>
      <span style={{
        fontSize: '10px',
        fontWeight: 500,
        letterSpacing: '0.02em',
        textTransform: 'uppercase'
      }}>
        {label}
      </span>

      {isActive && (
        <div
          style={{
            position: 'absolute',
            left: '-2px',
            top: '50%',
            transform: 'translateY(-50%)',
            height: '28px',
            width: '3px',
            background: 'linear-gradient(180deg, var(--color-accent-blue) 0%, #2563EB 100%)',
            borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
            boxShadow: 'var(--shadow-glow-blue)'
          }}
        />
      )}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onOpenSettings }) => {
  return (
    <div style={{
      width: 'var(--sidebar-width-collapsed)',
      background: 'var(--color-bg-sidebar)',
      borderRight: 'var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '16px',
      paddingBottom: '16px',
      zIndex: 9002, // Above drag region
      WebkitAppRegion: 'drag' as any
    }}>
      {/* Brand Icon - Enhanced */}
      <div style={{
        width: '44px',
        height: '44px',
        background: 'linear-gradient(135deg, var(--color-accent-blue) 0%, #2563EB 100%)',
        borderRadius: 'var(--radius-xl)',
        marginBottom: 'var(--space-6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 700,
        fontSize: '20px',
        boxShadow: 'var(--shadow-md), var(--shadow-glow-blue)',
        position: 'relative',
        overflow: 'hidden',
        WebkitAppRegion: 'no-drag' as any,
        border: '1px solid rgba(59, 130, 246, 0.3)'
      }}>
        {/* Subtle shine effect */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.2) 50%, transparent 100%)',
          pointerEvents: 'none'
        }} />
        <span style={{ position: 'relative', zIndex: 1 }}>R</span>
      </div>

      <nav style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', WebkitAppRegion: 'no-drag' as any }}>
        <SidebarItem
          label="Compose"
          isActive={activeTab === 'Compose'}
          onClick={() => onTabChange('Compose')}
          icon={
            /* Pen/Edit Icon - Thin Stroke */
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
          }
        />
        <SidebarItem
          label="People"
          isActive={activeTab === 'People'}
          onClick={() => onTabChange('People')}
          icon={
            /* Users Icon - Thin Stroke */
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          }
        />
        <SidebarItem
          label="Servers"
          isActive={activeTab === 'Servers'}
          onClick={() => onTabChange('Servers')}
          icon={
             /* Server/Database Icon - Thin Stroke */
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
               <rect x="2" y="2" width="20" height="8" rx="2" ry="2"/>
               <rect x="2" y="14" width="20" height="8" rx="2" ry="2"/>
               <line x1="6" y1="6" x2="6.01" y2="6"/>
               <line x1="6" y1="18" x2="6.01" y2="18"/>
             </svg>
          }
        />
        <SidebarItem
          label="Reports"
          isActive={activeTab === 'Reports'}
          onClick={() => onTabChange('Reports')}
          icon={
            /* Chart/Analytics Icon - Thin Stroke */
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
          }
        />
        <SidebarItem
          label="Live"
          isActive={activeTab === 'Live'}
          onClick={() => onTabChange('Live')}
          icon={
             /* Pulse/Activity Icon - Thin Stroke */
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
        />
      </nav>

      {/* Settings / Footer - Enhanced */}
      <button
        onClick={onOpenSettings}
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-xl)',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          color: 'var(--color-text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-base)',
          WebkitAppRegion: 'no-drag' as any,
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.color = 'var(--color-text-primary)';
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color = 'var(--color-text-secondary)';
          e.currentTarget.style.transform = 'scale(1)';
        }}
        title="Settings"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
      </button>
    </div>
  );
};
