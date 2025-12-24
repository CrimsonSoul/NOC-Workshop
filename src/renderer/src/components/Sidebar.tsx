import React, { useRef } from "react";

type Tab =
  | "Compose"
  | "Personnel"
  | "People"
  | "Reports"
  | "Radar"
  | "Servers"
  | "Weather"
  | "AI";

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  onOpenSettings: () => void;
}

const SidebarButton = ({
  icon,
  label,
  isActive,
  onClick,
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "40px",
        height: "40px",
        background: isActive
          ? "var(--color-accent-blue)"
          : isHovered
            ? "var(--color-accent-blue)"
            : "rgba(255, 255, 255, 0.03)",
        border: "none",
        cursor: "pointer",
        position: "relative",
        color: isActive || isHovered ? "white" : "var(--color-text-tertiary)",
        transition: "all var(--transition-smooth)",
        borderRadius: isActive || isHovered ? "12px" : "20px",
        outline: "none",
        transform: isHovered
          ? isActive
            ? "scale(1.05)"
            : "translateY(-1px) scale(1.05)"
          : "scale(1)",
        boxShadow: isHovered ? "0 4px 12px rgba(0, 0, 0, 0.2)" : "none",
      }}
    >
      {icon}

      {/* Active indicator bar */}
      {isActive && (
        <div
          style={{
            position: "absolute",
            left: "-12px",
            top: "50%",
            transform: "translateY(-50%)",
            height: "24px",
            width: "4px",
            background: "white",
            borderRadius: "0 4px 4px 0",
            boxShadow: "0 0 10px rgba(255, 255, 255, 0.5)",
          }}
        />
      )}
    </button>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenSettings,
}) => {
  return (
    <div
      style={{
        width:
          window.api?.platform === "darwin"
            ? "72px"
            : "var(--sidebar-width-collapsed)",
        background: "transparent",
        borderRight: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: window.api?.platform === "darwin" ? "38px" : "15px",
        paddingBottom: "16px",
        gap: "12px",
        zIndex: 9002,
        WebkitAppRegion: "drag" as any,
      }}
    >
      {/* App Icon - 3-Click Easter Egg to Weather */}
      <div
        onClick={() => onTabChange("Compose")}
        id="app-icon-container"
        style={{
          width: "42px",
          height: "42px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)",
          borderRadius: "50%",
          WebkitAppRegion: "no-drag" as any,
          cursor: "pointer",
          transition: "all 0.1s cubic-bezier(0.16, 1, 0.3, 1)",
          border: "1.5px solid rgba(59, 130, 246, 0.3)",
          boxShadow:
            "0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(59, 130, 246, 0.1)",
          marginBottom: "4px",
        }}
        onMouseEnter={(e) => {
          if (true) {
            // Style hover normally
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgba(59, 130, 246, 0.25) 0%, rgba(37, 99, 235, 0.1) 100%)";
            e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.5)";
            e.currentTarget.style.transform = "scale(1.05) translateY(-1px)";
            e.currentTarget.style.borderRadius = "14px";
            e.currentTarget.style.boxShadow =
              "0 8px 25px rgba(59, 130, 246, 0.2), inset 0 0 15px rgba(59, 130, 246, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)";
          e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.3)";
          e.currentTarget.style.transform = "scale(1) translateY(0)";
          e.currentTarget.style.borderRadius = "50%";
          e.currentTarget.style.boxShadow =
            "0 4px 20px rgba(0, 0, 0, 0.2), inset 0 0 12px rgba(59, 130, 246, 0.1)";
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: "drop-shadow(0 0 8px rgba(96, 165, 250, 0.4))" }}
        >
          {/* A modern, abstract 'Relay' mark: two interlocking arcs and a central pulse line */}
          <path
            className="relay-icon-path"
            d="M15 6C17.2091 6 19 7.79086 19 10V14C19 16.2091 17.2091 18 15 18M9 18C6.79086 18 5 16.2091 5 14V10C5 7.79086 6.79086 6 9 6"
            stroke="url(#relay-icon-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            className="relay-icon-path"
            d="M8 12H16"
            stroke="url(#relay-icon-grad)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="12" cy="12" r="1.5" fill="white">
            <animate
              attributeName="opacity"
              values="1;0.4;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
          <defs>
            <linearGradient
              id="relay-icon-grad"
              x1="5"
              y1="6"
              x2="19"
              y2="21"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#93C5FD" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Separator */}
      <div
        style={{
          width: "32px",
          height: "2px",
          background: "rgba(255, 255, 255, 0.08)",
          borderRadius: "1px",
          flexShrink: 0,
        }}
      />

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          WebkitAppRegion: "no-drag" as any,
        }}
      >
        <SidebarButton
          label="Compose"
          isActive={activeTab === "Compose"}
          onClick={() => onTabChange("Compose")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"
                stroke="#60A5FA"
              />
            </svg>
          }
        />
        <SidebarButton
          label="Personnel"
          isActive={activeTab === "Personnel"}
          onClick={() => onTabChange("Personnel")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Pager Body */}
              <rect
                x="2"
                y="5"
                width="20"
                height="14"
                rx="2"
                stroke="#60A5FA"
              />
              {/* Pager Screen */}
              <rect
                x="5"
                y="8"
                width="10"
                height="6"
                rx="1"
                stroke="#60A5FA"
                opacity="0.8"
              />
              {/* Pager Buttons */}
              <circle cx="18" cy="9" r="1.5" fill="#60A5FA" />
              <circle cx="18" cy="15" r="1.5" fill="#60A5FA" />
            </svg>
          }
        />
        <SidebarButton
          label="AI Chat"
          isActive={activeTab === "AI"}
          onClick={() => onTabChange("AI")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {/* Chat bubble with sparkle for AI */}
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke="#F472B6"
              />
              {/* AI sparkle */}
              <path d="M12 8v2" stroke="#F472B6" strokeWidth="2" />
              <path d="M12 12v1" stroke="#F472B6" strokeWidth="2" />
              <circle cx="12" cy="10" r="0.5" fill="#F472B6" />
            </svg>
          }
        />
        <SidebarButton
          label="People"
          isActive={activeTab === "People"}
          onClick={() => onTabChange("People")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
                stroke="#34D399"
              />
              <circle cx="9" cy="7" r="4" stroke="#34D399" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <SidebarButton
          label="Servers"
          isActive={activeTab === "Servers"}
          onClick={() => onTabChange("Servers")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line
                x1="6"
                y1="6"
                x2="6.01"
                y2="6"
                stroke="#4ADE80"
                strokeWidth="3"
              />
              <line
                x1="6"
                y1="18"
                x2="6.01"
                y2="18"
                stroke="#4ADE80"
                strokeWidth="3"
              />
            </svg>
          }
        />
        <SidebarButton
          label="Reports"
          isActive={activeTab === "Reports"}
          onClick={() => onTabChange("Reports")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 20V10" />
              <path d="M12 20V4" stroke="#A78BFA" />
              <path d="M6 20v-6" />
            </svg>
          }
        />
        <SidebarButton
          label="Radar"
          isActive={activeTab === "Radar"}
          onClick={() => onTabChange("Radar")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 8.66 5" stroke="none" />
              <path
                d="M12 12L12 2A10 10 0 0 1 20.66 7L12 12Z"
                fill="#4ADE80"
                stroke="none"
                opacity="0.4"
              />
              <circle cx="12" cy="12" r="2" fill="#4ADE80" stroke="none" />
              <circle cx="16" cy="6" r="1.5" fill="#4ADE80" stroke="none" />
            </svg>
          }
        />
        <SidebarButton
          label="Weather"
          isActive={activeTab === "Weather"}
          onClick={() => onTabChange("Weather")}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2v2" stroke="#60A5FA" opacity="0.8" />
              <path d="m4.93 4.93 1.41 1.41" stroke="#60A5FA" opacity="0.8" />
              <path d="M20 12h2" stroke="#60A5FA" opacity="0.8" />
              <path d="m19.07 4.93-1.41 1.41" stroke="#60A5FA" opacity="0.8" />
              <circle cx="12" cy="10" r="4" stroke="#60A5FA" />
              <path
                d="m15.947 12.65a4 4 0 0 0-5.925-4.128"
                stroke="#60A5FA"
                opacity="0.6"
              />
              <path
                d="M13 22H7a5 5 0 1 1 4.9-6H13a3 3 0 0 1 0 6Z"
                stroke="white"
                opacity="0.6"
              />
            </svg>
          }
        />
      </nav>

      {/* Settings section */}
      <div
        style={
          {
            WebkitAppRegion: "no-drag",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          } as any
        }
      >
        <SidebarButton
          label="Settings"
          isActive={false}
          onClick={onOpenSettings}
          icon={
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          }
        />
      </div>
    </div>
  );
};
