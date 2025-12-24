import { GroupMap, Contact, OnCallEntry } from "@shared/ipc";

export type SortConfig = {
  key: "name" | "title" | "email" | "phone" | "groups";
  direction: "asc" | "desc";
};

export type AssemblerTabProps = {
  groups: GroupMap;
  contacts: Contact[];
  onCall: OnCallEntry[];
  selectedGroups: string[];
  manualAdds: string[];
  manualRemoves: string[];
  onToggleGroup: (group: string) => void;
  onAddManual: (email: string) => void;
  onRemoveManual: (email: string) => void;
  onUndoRemove: () => void;
  onResetManual: () => void;
};

export type VirtualRowData = {
  log: { email: string; source: string }[];
  contactMap: Map<string, Contact>;
  groupMap: Map<string, string[]>;
  onRemoveManual: (email: string) => void;
  onAddToContacts: (email: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    email: string,
    isUnknown: boolean
  ) => void;
};
