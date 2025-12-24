import React, { useState, useEffect, useCallback, useMemo } from "react";
import { GroupMap, Contact } from "@shared/ipc";
import { SidebarItem } from "../../components/SidebarItem";
import { ContextMenu } from "../../components/ContextMenu";
import { QuickAddInput } from "./QuickAddInput";
import { CreateGroupModal } from "./CreateGroupModal";
import { DeleteGroupModal } from "./DeleteGroupModal";
import { RenameGroupModal } from "./RenameGroupModal";

type AssemblerSidebarProps = {
  groups: GroupMap;
  contacts: Contact[];
  selectedGroups: string[];
  onToggleGroup: (group: string) => void;
  onQuickAdd: (email: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
};

export const AssemblerSidebar: React.FC<AssemblerSidebarProps> = ({
  groups,
  contacts,
  selectedGroups,
  onToggleGroup,
  onQuickAdd,
  isCollapsed,
  onToggleCollapse,
}) => {
  // Use prop instead of internal state
  const isGroupSidebarCollapsed = isCollapsed;

  const [groupContextMenu, setGroupContextMenu] = useState<{
    x: number;
    y: number;
    group: string;
  } | null>(null);
  const [sidebarContextMenu, setSidebarContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [groupToRename, setGroupToRename] = useState<string | null>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  // localStorage is now managed by parent

  const sortedGroupKeys = useMemo(() => Object.keys(groups).sort(), [groups]);

  const handleGroupContextMenu = useCallback(
    (e: React.MouseEvent, group: string) => {
      e.preventDefault();
      setGroupContextMenu({ x: e.clientX, y: e.clientY, group });
    },
    []
  );

  return (
    <>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          if (!groupContextMenu) {
            setSidebarContextMenu({ x: e.clientX, y: e.clientY });
          }
        }}
        style={{
          display: "flex",
          padding: "0",
          height: "100%",
          position: "relative",
          background: "transparent",
          zIndex: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            width: "100%",
            overflow: "visible",
            justifyContent: "flex-end",
          }}
        >
          {/* Flexible Content Area */}
          <div
            style={{
              width: "216px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              opacity: isGroupSidebarCollapsed ? 0 : 1,
              visibility: isGroupSidebarCollapsed ? "hidden" : "visible",
              transition:
                "opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1), visibility 0.4s",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                overflowX: "hidden",
                padding: "40px 20px 16px 20px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <QuickAddInput contacts={contacts} onQuickAdd={onQuickAdd} />

              {/* Groups Selection */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  flex: 1,
                  marginTop: "16px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-start",
                    alignItems: "center",
                    height: "24px",
                    marginBottom: "12px",
                    padding: "0",
                  }}
                >
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-text-tertiary)",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Groups
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {sortedGroupKeys.map((g) => {
                    const isSelected = selectedGroups.includes(g);
                    return (
                      <SidebarItem
                        key={g}
                        label={g}
                        count={groups[g].length}
                        active={isSelected}
                        onClick={onToggleGroup}
                        onContextMenu={handleGroupContextMenu}
                      />
                    );
                  })}
                  {sortedGroupKeys.length === 0 && (
                    <div
                      style={{
                        color: "var(--color-text-tertiary)",
                        fontSize: "13px",
                        fontStyle: "italic",
                        paddingLeft: "4px",
                      }}
                    >
                      No groups.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Floating Pill Toggle Handle */}
          <div
            onClick={onToggleCollapse}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
              e.currentTarget.style.borderColor = "rgba(59, 130, 246, 0.4)";
              e.currentTarget.style.boxShadow =
                "0 0 20px rgba(59, 130, 246, 0.25)";
              e.currentTarget.style.transform =
                "translate(-50%, -50%) scale(1.05)";
              const icon = e.currentTarget.querySelector("svg");
              if (icon) (icon as SVGElement).style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform =
                "translate(-50%, -50%) scale(1)";
              const icon = e.currentTarget.querySelector("svg");
              if (icon)
                (icon as SVGElement).style.color = "var(--color-text-tertiary)";
            }}
            style={{
              position: "absolute",
              left: "100%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "24px",
              height: "56px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              borderRadius: "12px",
              cursor: "pointer",
              zIndex: 100,
              transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              backdropFilter: "blur(16px)",
              boxSizing: "border-box",
            }}
            title={
              isGroupSidebarCollapsed ? "Expand Groups" : "Collapse Groups"
            }
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                transform: isGroupSidebarCollapsed
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
                color: "var(--color-text-tertiary)",
              }}
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Group Context Menu */}
      {groupContextMenu && (
        <ContextMenu
          x={groupContextMenu.x}
          y={groupContextMenu.y}
          onClose={() => setGroupContextMenu(null)}
          items={[
            {
              label: "Rename",
              onClick: () => setGroupToRename(groupContextMenu.group),
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
              ),
            },
            {
              label: "Delete Group",
              onClick: () => setGroupToDelete(groupContextMenu.group),
              danger: true,
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              ),
            },
          ]}
        />
      )}

      {/* Sidebar Context Menu */}
      {sidebarContextMenu && (
        <ContextMenu
          x={sidebarContextMenu.x}
          y={sidebarContextMenu.y}
          onClose={() => setSidebarContextMenu(null)}
          items={[
            {
              label: "Add New Group",
              onClick: () => setIsGroupModalOpen(true),
              icon: (
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              ),
            },
          ]}
        />
      )}

      {/* Modals */}
      <CreateGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />

      <DeleteGroupModal
        groupName={groupToDelete}
        onClose={() => setGroupToDelete(null)}
        selectedGroups={selectedGroups}
        onToggleGroup={onToggleGroup}
      />

      <RenameGroupModal
        groupName={groupToRename}
        groups={groups}
        onClose={() => setGroupToRename(null)}
        selectedGroups={selectedGroups}
        onToggleGroup={onToggleGroup}
      />
    </>
  );
};
