import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { OnCallRow, Contact } from "@shared/ipc";
import { formatPhoneNumber } from "../utils/phone";
import { TactileButton } from "../components/TactileButton";
import { Modal } from "../components/Modal";
import { MaintainTeamModal } from "../components/MaintainTeamModal";
import { Input } from "../components/Input";
import { ContextMenu, ContextMenuItem } from "../components/ContextMenu";
import { ConfirmModal } from "../components/ConfirmModal";
import { getColorForString } from "../utils/colors";
import { useToast } from "../components/Toast";
import { CollapsibleHeader, useCollapsibleHeader } from "../components/CollapsibleHeader";

import { GridStack } from "gridstack";
import "gridstack/dist/gridstack.min.css";

// --- Types ---

interface TeamCardProps {
  team: string;
  rows: OnCallRow[];
  contacts: Contact[];
  onUpdateRows: (team: string, rows: OnCallRow[]) => void;
  onRenameTeam: (oldName: string, newName: string) => void;
  onRemoveTeam: (team: string) => void;
  setConfirm: (confirm: { team: string; onConfirm: () => void } | null) => void;
  setMenu: (
    menu: { x: number; y: number; items: ContextMenuItem[] } | null
  ) => void;
}

// --- Team Card Component ---

const TeamCard = ({
  team,
  rows,
  contacts,
  onUpdateRows,
  onRenameTeam,
  onRemoveTeam,
  setConfirm,
  setMenu,
}: TeamCardProps) => {
  const colorScheme = getColorForString(team);
  const [isEditing, setIsEditing] = useState(false);

  const teamRows = useMemo(() => rows || [], [rows]);
  const hasAnyTimeWindow = useMemo(
    () => teamRows.some((r) => r.timeWindow && r.timeWindow.trim()),
    [teamRows]
  );
  const rowGridTemplate = hasAnyTimeWindow
    ? "60px 1fr auto auto"
    : "60px 1fr auto";

  return (
    <>
      <div
        className="grid-stack-item-content"
        style={{
          padding: "0 16px 20px 0",
          height: "100%",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            padding: "16px",
            background: "rgba(255, 255, 255, 0.03)",
            borderRadius: "16px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            position: "relative",
            overflow: "hidden",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            height: "100%",
            boxSizing: "border-box",
            cursor: "grab",
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu({
              x: e.clientX,
              y: e.clientY,
              items: [
                { label: "Edit Team", onClick: () => setIsEditing(true) },
                {
                  label: "Rename Team",
                  onClick: () => onRenameTeam(team, team),
                },
                {
                  label: "Remove Team",
                  danger: true,
                  onClick: () =>
                    setConfirm({ team, onConfirm: () => onRemoveTeam(team) }),
                },
              ],
            });
          }}
        >
          {/* Accent Strip */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "6px",
              background: colorScheme.text,
              opacity: 0.9,
              borderRadius: "16px 0 0 16px",
            }}
          />

          {/* Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingLeft: "12px",
            }}
          >
            <div
              style={{
                fontSize: "20px",
                fontWeight: 900,
                color: colorScheme.text,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {team}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              paddingLeft: "16px",
            }}
          >
            {teamRows.map((row) => (
              <div
                key={row.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: rowGridTemplate,
                  gap: "16px",
                  alignItems: "center",
                  padding: "4px 0",
                }}
              >
                <div
                  style={{
                    color: "var(--color-text-tertiary)",
                    fontSize: "13px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    alignSelf: "center",
                    opacity: 0.8,
                  }}
                  title={row.role}
                >
                  {(() => {
                    const r = row.role.toLowerCase();
                    if (r.includes("primary")) return "PRI";
                    if (r.includes("secondary")) return "SEC";
                    if (r.includes("backup")) return "BKP";
                    if (r.includes("shadow")) return "SHD";
                    if (r.includes("escalation")) return "ESC";
                    return row.role.substring(0, 3).toUpperCase();
                  })()}
                </div>
                <div
                  style={{
                    color: row.name
                      ? "var(--color-text-primary)"
                      : "var(--color-text-quaternary)",
                    fontSize: "20px",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    lineHeight: 1.2,
                  }}
                  title={row.name}
                >
                  {row.name || "—"}
                </div>
                <div
                  style={{
                    color: "var(--color-text-primary)",
                    fontSize: "20px",
                    fontFamily: "var(--font-mono)",
                    textAlign: "right",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    fontWeight: 700,
                    width: "180px",
                  }}
                  title={row.contact}
                >
                  {formatPhoneNumber(row.contact)}
                </div>
                {hasAnyTimeWindow && (
                  <div
                    style={{
                      color: "var(--color-text-tertiary)",
                      fontSize: "14px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      padding: row.timeWindow ? "4px 8px" : "0",
                      borderRadius: "4px",
                      background: row.timeWindow
                        ? "rgba(255,255,255,0.05)"
                        : "transparent",
                      opacity: row.timeWindow ? 0.9 : 0,
                      width: "90px",
                    }}
                    title={row.timeWindow}
                  >
                    {row.timeWindow}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <MaintainTeamModal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        teamName={team}
        initialRows={teamRows}
        contacts={contacts}
        onSave={onUpdateRows}
      />
    </>
  );
};

const getWeekRange = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.getFullYear(), now.getMonth(), diff);
  const sunday = new Date(now.getFullYear(), now.getMonth(), diff + 6);
  const options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  return `${monday.toLocaleDateString(
    undefined,
    options
  )} - ${sunday.toLocaleDateString(
    undefined,
    options
  )}, ${sunday.getFullYear()}`;
};

// Custom CSS for GridStack
const gridStackStyles = `
  .grid-stack {
    background: transparent;
  }
  .grid-stack-item {
    cursor: grab;
  }
  .grid-stack-item:active {
    cursor: grabbing;
  }
  .grid-stack-placeholder {
    background: transparent !important;
    border: none !important;
  }
  .grid-stack-item.ui-draggable-dragging {
    opacity: 0.95;
    z-index: 100;
  }
  .grid-stack-item.ui-draggable-dragging > .grid-stack-item-content {
    box-shadow: 0 8px 32px rgba(0,0,0,0.35);
  }
  /* Hide resize handles */
  .grid-stack-item > .ui-resizable-handle {
    display: none !important;
  }
  .ui-resizable-se {
    display: none !important;
  }
  /* Smooth layout transitions */
  .grid-stack > .grid-stack-item {
    transition: left 0.2s ease-out, top 0.2s ease-out;
  }
  .grid-stack > .grid-stack-item.ui-draggable-dragging {
    transition: none;
  }
`;

export const PersonnelTab: React.FC<{
  onCall: OnCallRow[];
  contacts: Contact[];
}> = ({ onCall, contacts }) => {
  const { showToast } = useToast();
  const [isAddingTeam, setIsAddingTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [renamingTeam, setRenamingTeam] = useState<{
    old: string;
    new: string;
  } | null>(null);

  // Collapsible header
  const { isCollapsed, scrollContainerRef } = useCollapsibleHeader(30);

  // Date range state
  const [weekRange, setWeekRange] = useState(getWeekRange());
  const [currentDay, setCurrentDay] = useState(new Date().getDay());

  useEffect(() => {
    const interval = setInterval(() => {
      setWeekRange(getWeekRange());
      setCurrentDay(new Date().getDay());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Alert Logic
  const getAlertKey = (type: string) => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${type}`;
  };

  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(() => {
    const check = [getAlertKey('general'), getAlertKey('sql'), getAlertKey('oracle')];
    const saved = new Set<string>();
    check.forEach(k => { if (localStorage.getItem(`dismissed-${k}`)) saved.add(k); });
    return saved;
  });

  const dismissAlert = (type: string) => {
    const key = getAlertKey(type);
    localStorage.setItem(`dismissed-${key}`, 'true');
    setDismissedAlerts(prev => { const next = new Set(prev); next.add(key); return next; });
  };
  const [localOnCall, setLocalOnCall] = useState<OnCallRow[]>(onCall);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    team: string;
    onConfirm: () => void;
  } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const gridInstanceRef = useRef<GridStack | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    setLocalOnCall(onCall);
  }, [onCall]);

  // Group rows by team
  const teams = useMemo(() => {
    const map = new Map<string, OnCallRow[]>();
    localOnCall.forEach((row) => {
      if (!map.has(row.team)) map.set(row.team, []);
      map.get(row.team)?.push(row);
    });
    return Array.from(map.keys());
  }, [localOnCall]);

  // Calculate height based on number of rows
  const getItemHeight = useCallback(
    (teamName: string) => {
      const rows = localOnCall.filter((r) => r.team === teamName);
      const baseHeight = 2;
      const rowHeight = Math.ceil((rows.length * 45 + 100) / 70);
      return Math.max(baseHeight, rowHeight);
    },
    [localOnCall]
  );

  // Initialize GridStack
  useEffect(() => {
    if (!gridRef.current || isInitialized.current) return;

    const getColumnCount = () => {
      const width = gridRef.current?.offsetWidth || window.innerWidth;
      return width < 900 ? 1 : 2;
    };

    gridInstanceRef.current = GridStack.init(
      {
        column: getColumnCount(),
        cellHeight: 70,
        margin: 8,
        float: false,
        animate: true,
        draggable: {
          handle: ".grid-stack-item-content",
        },
        resizable: {
          handles: "",
        },
      },
      gridRef.current
    );

    isInitialized.current = true;

    const handleResize = () => {
      if (gridInstanceRef.current && gridRef.current) {
        const newColumns = getColumnCount();
        gridInstanceRef.current.column(newColumns, "moveScale");
      }
    };

    window.addEventListener("resize", handleResize);

    gridInstanceRef.current.on("dragstop", () => {
      if (!gridInstanceRef.current) return;

      const items = gridInstanceRef.current.getGridItems();
      const newOrder = items
        .sort((a, b) => {
          const aY = parseInt(a.getAttribute("gs-y") || "0");
          const bY = parseInt(b.getAttribute("gs-y") || "0");
          const aX = parseInt(a.getAttribute("gs-x") || "0");
          const bX = parseInt(b.getAttribute("gs-x") || "0");
          if (aY !== bY) return aY - bY;
          return aX - bX;
        })
        .map((item) => item.getAttribute("gs-id"))
        .filter(Boolean) as string[];

      const newFlatList: OnCallRow[] = [];
      newOrder.forEach((teamName) => {
        const teamRows = localOnCall.filter((r) => r.team === teamName);
        newFlatList.push(...teamRows);
      });

      setLocalOnCall(newFlatList);
      window.api?.saveAllOnCall(newFlatList);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      if (gridInstanceRef.current) {
        gridInstanceRef.current.destroy(false);
        gridInstanceRef.current = null;
        isInitialized.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (gridInstanceRef.current) {
      setTimeout(() => {
        gridInstanceRef.current?.compact();
      }, 100);
    }
  }, [teams.length]);

  const handleUpdateRows = async (team: string, rows: OnCallRow[]) => {
    // Auto-dismiss alerts
    const day = new Date().getDay();
    const lowerTeam = team.toLowerCase();
    if (day === 1) dismissAlert('general');
    if (day === 3 && lowerTeam.includes('sql')) dismissAlert('sql');
    if (day === 4 && lowerTeam.includes('oracle')) dismissAlert('oracle');

    setLocalOnCall((prev) => {
      const teamOrder = Array.from(new Set(prev.map((r) => r.team)));
      if (!teamOrder.includes(team)) {
        return [...prev, ...rows];
      }
      const newFlatList: OnCallRow[] = [];
      teamOrder.forEach((t) => {
        if (t === team) {
          newFlatList.push(...rows);
        } else {
          newFlatList.push(...prev.filter((r) => r.team === t));
        }
      });
      return newFlatList;
    });

    const success = await window.api?.updateOnCallTeam(team, rows);
    if (!success) showToast("Failed to save changes", "error");
  };

  const handleRemoveTeam = async (team: string) => {
    const success = await window.api?.removeOnCallTeam(team);
    if (success) {
      setLocalOnCall((prev) => prev.filter((r) => r.team !== team));
      showToast(`Removed ${team}`, "success");
    } else {
      showToast("Failed to remove team", "error");
    }
  };

  const handleRenameTeam = async (oldName: string, newName: string) => {
    const success = await window.api?.renameOnCallTeam(oldName, newName);
    if (success) {
      setLocalOnCall((prev) =>
        prev.map((r) => (r.team === oldName ? { ...r, team: newName } : r))
      );
      showToast(`Renamed ${oldName} to ${newName}`, "success");
    } else {
      showToast("Failed to rename team", "error");
    }
  };

  const handleAddTeam = async (name: string) => {
    const initialRow: OnCallRow = {
      id: crypto.randomUUID(),
      team: name,
      role: "Primary",
      name: "",
      contact: "",
      timeWindow: "",
    };
    const success = await window.api?.updateOnCallTeam(name, [initialRow]);
    if (success) {
      setLocalOnCall((prev) => [...prev, initialRow]);
      showToast(`Added team ${name}`, "success");
    } else {
      showToast("Failed to add team", "error");
    }
  };

  // Removed static weekRange memo, now using state above

  const renderAlerts = () => {
    const alerts: JSX.Element[] = [];
    if (currentDay === 1 && !dismissedAlerts.has(getAlertKey('general'))) {
      alerts.push(<div key="general" onClick={() => dismissAlert('general')} title="Click to dismiss" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-on-accent)', background: 'var(--color-accent-primary)', padding: '4px 8px', borderRadius: '4px', marginLeft: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>Update Weekly Schedule</div>);
    }
    if (currentDay === 3 && !dismissedAlerts.has(getAlertKey('sql'))) {
      alerts.push(<div key="sql" onClick={() => dismissAlert('sql')} title="Click to dismiss" style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: '#EF4444', padding: '4px 8px', borderRadius: '4px', marginLeft: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>Update SQL DBA</div>);
    }
    if (currentDay === 4 && !dismissedAlerts.has(getAlertKey('oracle'))) {
      alerts.push(<div key="oracle" onClick={() => dismissAlert('oracle')} title="Click to dismiss" style={{ fontSize: '12px', fontWeight: 700, color: '#fff', background: '#EF4444', padding: '4px 8px', borderRadius: '4px', marginLeft: '12px', textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', userSelect: 'none' }}>Update Oracle DBA</div>);
    }
    return alerts;
  };

  return (
    <div
      ref={scrollContainerRef}
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "20px 24px 24px 24px",
        background: "var(--color-bg-app)",
        overflowY: "auto",
      }}
    >
      <style>{gridStackStyles}</style>

      <CollapsibleHeader
        title="On-Call Schedule"
        subtitle={<>{weekRange}{renderAlerts()}</>}
        isCollapsed={isCollapsed}
      >
        <TactileButton
          variant="primary"
          style={{ padding: isCollapsed ? '8px 16px' : '12px 24px', fontSize: isCollapsed ? '12px' : '14px', transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)' }}
          onClick={() => setIsAddingTeam(true)}
        >
          + ADD TEAM
        </TactileButton>
      </CollapsibleHeader>

      <div
        ref={gridRef}
        className="grid-stack"
        style={{ paddingBottom: "40px" }}
      >
        {teams.map((team, index) => (
          <div
            key={team}
            className="grid-stack-item"
            gs-id={team}
            gs-w="1"
            gs-h={getItemHeight(team)}
            gs-x={index % 2}
            gs-y={Math.floor(index / 2)}
          >
            <TeamCard
              team={team}
              rows={localOnCall.filter((r) => r.team === team)}
              contacts={contacts}
              onUpdateRows={handleUpdateRows}
              onRenameTeam={(o, n) => setRenamingTeam({ old: o, new: n })}
              onRemoveTeam={handleRemoveTeam}
              setConfirm={setConfirmDelete}
              setMenu={setMenu}
            />
          </div>
        ))}
      </div>

      {/* Modals */}
      <Modal
        isOpen={!!renamingTeam}
        onClose={() => setRenamingTeam(null)}
        title="Rename Team"
        width="400px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            ref={(el) => {
              if (el) setTimeout(() => el.focus(), 100);
            }}
            value={renamingTeam?.new || ""}
            onChange={(e) =>
              setRenamingTeam((prev) =>
                prev ? { ...prev, new: e.target.value } : null
              )
            }
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && renamingTeam) {
                handleRenameTeam(renamingTeam.old, renamingTeam.new).then(() =>
                  setRenamingTeam(null)
                );
              }
            }}
          />
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <TactileButton
              variant="secondary"
              onClick={() => setRenamingTeam(null)}
            >
              Cancel
            </TactileButton>
            <TactileButton
              variant="primary"
              onClick={() =>
                renamingTeam &&
                handleRenameTeam(renamingTeam.old, renamingTeam.new).then(() =>
                  setRenamingTeam(null)
                )
              }
            >
              Rename
            </TactileButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isAddingTeam}
        onClose={() => setIsAddingTeam(false)}
        title="Add New Team"
        width="400px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            ref={(el) => {
              if (el) setTimeout(() => el.focus(), 100);
            }}
            placeholder="Team Name (e.g. SRE, Support)"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && newTeamName.trim()) {
                handleAddTeam(newTeamName.trim());
                setNewTeamName("");
                setIsAddingTeam(false);
              }
            }}
          />
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <TactileButton
              variant="secondary"
              onClick={() => setIsAddingTeam(false)}
            >
              Cancel
            </TactileButton>
            <TactileButton
              variant="primary"
              onClick={() => {
                if (newTeamName.trim()) {
                  handleAddTeam(newTeamName.trim());
                  setNewTeamName("");
                  setIsAddingTeam(false);
                }
              }}
            >
              Add Team
            </TactileButton>
          </div>
        </div>
      </Modal>

      {confirmDelete && (
        <ConfirmModal
          isOpen={!!confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={confirmDelete.onConfirm}
          title="Remove Team"
          message={`Are you sure you want to remove the team "${confirmDelete.team}"? This will delete all members in this team.`}
          confirmLabel="Remove"
          isDanger
        />
      )}
      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
};
