import React, { useMemo, useState, useCallback, useEffect } from "react";
import { GroupMap, Contact, OnCallEntry } from "@shared/ipc";
import { useGroupMaps } from "../hooks/useGroupMaps";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";
import { AddContactModal } from "../components/AddContactModal";
import { useToast } from "../components/Toast";
import { ToolbarButton } from "../components/ToolbarButton";
import { ContextMenu } from "../components/ContextMenu";

import {
  AssemblerTabProps,
  SortConfig,
  VirtualRow,
  AssemblerSidebar,
  BridgeReminderModal,
} from "./assembler";

export const AssemblerTab: React.FC<AssemblerTabProps> = ({
  groups,
  contacts,
  onCall,
  selectedGroups,
  manualAdds,
  manualRemoves,
  onToggleGroup,
  onAddManual,
  onRemoveManual,
  onUndoRemove,
  onResetManual,
}) => {
  const { showToast } = useToast();
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: "name",
    direction: "asc",
  });
  const [isBridgeReminderOpen, setIsBridgeReminderOpen] = useState(false);

  // Add Contact Modal State
  const [isAddContactModalOpen, setIsAddContactModalOpen] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // Composition Context Menu State
  const [compositionContextMenu, setCompositionContextMenu] = useState<{
    x: number;
    y: number;
    email: string;
    isUnknown: boolean;
  } | null>(null);

  // Sidebar collapse state sync
  const [isGroupSidebarCollapsed, setIsGroupSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("assembler_sidebar_collapsed");
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(
      "assembler_sidebar_collapsed",
      JSON.stringify(isGroupSidebarCollapsed)
    );
  }, [isGroupSidebarCollapsed]);

  const handleToggleSidebarCollapse = useCallback(() => {
    setIsGroupSidebarCollapsed((prev: boolean) => !prev);
  }, []);

  // Optimized contact lookup map
  const contactMap = useMemo(() => {
    const map = new Map<string, Contact>();
    contacts.forEach((c) => map.set(c.email.toLowerCase(), c));
    return map;
  }, [contacts]);

  const { groupMap, groupStringMap } = useGroupMaps(groups);

  // Build composition log
  const log = useMemo(() => {
    const fromGroups = selectedGroups.flatMap((g) => groups[g] || []);
    const union = new Set([...fromGroups, ...manualAdds]);
    manualRemoves.forEach((r) => union.delete(r));
    let result = Array.from(union).map((email) => ({
      email,
      source: manualAdds.includes(email) ? "manual" : "group",
    }));

    return result.sort((a, b) => {
      const contactA = contactMap.get(a.email.toLowerCase());
      const contactB = contactMap.get(b.email.toLowerCase());
      const dir = sortConfig.direction === "asc" ? 1 : -1;

      if (sortConfig.key === "groups") {
        const strA = groupStringMap.get(a.email.toLowerCase()) || "";
        const strB = groupStringMap.get(b.email.toLowerCase()) || "";
        return strA.localeCompare(strB) * dir;
      }

      let valA = "";
      let valB = "";

      if (sortConfig.key === "name") {
        valA = (contactA?.name || a.email.split("@")[0]).toLowerCase();
        valB = (contactB?.name || b.email.split("@")[0]).toLowerCase();
      } else if (sortConfig.key === "title") {
        valA = (contactA?.title || "").toLowerCase();
        valB = (contactB?.title || "").toLowerCase();
      } else if (sortConfig.key === "email") {
        valA = a.email.toLowerCase();
        valB = b.email.toLowerCase();
      } else if (sortConfig.key === "phone") {
        valA = (contactA?.phone || "").toLowerCase();
        valB = (contactB?.phone || "").toLowerCase();
      }

      return valA.localeCompare(valB) * dir;
    });
  }, [
    groups,
    selectedGroups,
    manualAdds,
    manualRemoves,
    contactMap,
    sortConfig,
    groupStringMap,
  ]);

  const handleCopy = () => {
    navigator.clipboard.writeText(log.map((m) => m.email).join("; "));
    showToast("Copied to clipboard", "success");
  };

  const executeDraftBridge = () => {
    const date = new Date();
    const dateStr = `${date.getMonth() + 1}/${date.getDate()} -`;
    const attendees = log.map((m) => m.email).join(",");
    const params = new URLSearchParams({
      subject: dateStr,
      attendees: attendees,
    });
    const url = `https://teams.microsoft.com/l/meeting/new?${params.toString()}`;
    window.api?.openExternal(url);
    window.api?.logBridge(selectedGroups);
    showToast("Bridge drafted", "success");
  };

  const handleQuickAdd = useCallback(
    (email: string) => {
      onAddManual(email);
      showToast(`Added ${email}`, "success");
    },
    [onAddManual, showToast]
  );

  const handleAddToContacts = useCallback((email: string) => {
    setPendingEmail(email);
    setIsAddContactModalOpen(true);
  }, []);

  const handleCompositionContextMenu = useCallback(
    (e: React.MouseEvent, email: string, isUnknown: boolean) => {
      e.preventDefault();
      setCompositionContextMenu({
        x: e.clientX,
        y: e.clientY,
        email,
        isUnknown,
      });
    },
    []
  );

  useEffect(() => {
    if (compositionContextMenu) {
      const handler = () => setCompositionContextMenu(null);
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }
  }, [compositionContextMenu]);

  const itemData = useMemo(
    () => ({
      log,
      contactMap,
      groupMap,
      onRemoveManual,
      onAddToContacts: handleAddToContacts,
      onContextMenu: handleCompositionContextMenu,
    }),
    [
      log,
      contactMap,
      groupMap,
      onRemoveManual,
      handleAddToContacts,
      handleCompositionContextMenu,
    ]
  );

  const handleContactSaved = async (contact: Partial<Contact>) => {
    const success = await window.api?.addContact(contact);
    if (success) {
      if (contact.email) {
        onAddManual(contact.email);
      }
      showToast("Contact created successfully", "success");
    } else {
      showToast("Failed to create contact", "error");
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isGroupSidebarCollapsed ? "24px 1fr" : "240px 1fr",
        gap: "0px",
        height: "100%",
        alignItems: "start",
        transition: "grid-template-columns 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        overflow: "visible",
      }}
    >
      {/* Sidebar Controls */}
      <AssemblerSidebar
        groups={groups}
        contacts={contacts}
        selectedGroups={selectedGroups}
        onToggleGroup={onToggleGroup}
        onQuickAdd={handleQuickAdd}
        isCollapsed={isGroupSidebarCollapsed}
        onToggleCollapse={handleToggleSidebarCollapse}
      />

      {/* Main Listing Area */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          padding: "20px 24px 24px 24px",
          background: "var(--color-bg-app)",
          overflow: "hidden",
          position: "relative",
          zIndex: 5,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: "24px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 800,
                margin: 0,
                color: "var(--color-text-primary)",
              }}
            >
              Data Composition
            </h1>
            <p
              style={{
                fontSize: "16px",
                color: "var(--color-text-tertiary)",
                margin: "8px 0 0 0",
                fontWeight: 500,
              }}
            >
              Assemble bridge recipients and manage emergency communications
            </p>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {manualRemoves.length > 0 && (
              <ToolbarButton
                label="UNDO"
                onClick={onUndoRemove}
                style={{ padding: "12px 20px", fontSize: "12px" }}
              />
            )}
            <ToolbarButton
              label="RESET"
              onClick={onResetManual}
              style={{ padding: "12px 20px", fontSize: "12px" }}
            />
            <ToolbarButton
              label="COPY"
              onClick={handleCopy}
              style={{ padding: "12px 20px", fontSize: "12px" }}
            />
            <ToolbarButton
              label="DRAFT BRIDGE"
              onClick={() => setIsBridgeReminderOpen(true)}
              primary
              style={{ padding: "12px 24px", fontSize: "12px" }}
            />
          </div>
        </div>

        {/* List Container */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
          }}
        >
          {log.length === 0 ? (
            <div
              style={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: "16px",
                color: "var(--color-text-tertiary)",
              }}
            >
              <div style={{ fontSize: "48px", opacity: 0.1 }}>∅</div>
              <div>No recipients selected</div>
            </div>
          ) : (
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={log.length}
                  itemSize={104}
                  width={width}
                  itemData={itemData}
                >
                  {VirtualRow}
                </List>
              )}
            </AutoSizer>
          )}
        </div>
      </div>

      <AddContactModal
        isOpen={isAddContactModalOpen}
        onClose={() => setIsAddContactModalOpen(false)}
        initialEmail={pendingEmail}
        onSave={handleContactSaved}
      />

      <BridgeReminderModal
        isOpen={isBridgeReminderOpen}
        onClose={() => setIsBridgeReminderOpen(false)}
        onConfirm={executeDraftBridge}
      />

      {/* Composition List Context Menu */}
      {compositionContextMenu && (
        <ContextMenu
          x={compositionContextMenu.x}
          y={compositionContextMenu.y}
          onClose={() => setCompositionContextMenu(null)}
          items={[
            ...(compositionContextMenu.isUnknown
              ? [
                  {
                    label: "Save to Contacts",
                    onClick: () => {
                      handleAddToContacts(compositionContextMenu.email);
                      setCompositionContextMenu(null);
                    },
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
                        <path d="M19 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M16 11h6m-3-3v6"></path>
                      </svg>
                    ),
                  },
                ]
              : []),
            {
              label: "Remove from List",
              onClick: () => {
                onRemoveManual(compositionContextMenu.email);
                setCompositionContextMenu(null);
              },
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
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};
