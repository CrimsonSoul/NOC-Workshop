import React, { useState, useEffect } from "react";
import { GroupMap } from "@shared/ipc";
import { Modal } from "../../components/Modal";
import { Input } from "../../components/Input";
import { TactileButton } from "../../components/TactileButton";
import { useToast } from "../../components/Toast";

type RenameGroupModalProps = {
  groupName: string | null;
  groups: GroupMap;
  onClose: () => void;
  selectedGroups: string[];
  onToggleGroup: (group: string) => void;
};

export const RenameGroupModal: React.FC<RenameGroupModalProps> = ({
  groupName,
  groups,
  onClose,
  selectedGroups,
  onToggleGroup,
}) => {
  const { showToast } = useToast();
  const [renamedGroupName, setRenamedGroupName] = useState("");
  const [renameConflict, setRenameConflict] = useState<string | null>(null);

  useEffect(() => {
    if (groupName) {
      setRenamedGroupName(groupName);
      setRenameConflict(null);
    }
  }, [groupName]);

  const handleClose = () => {
    setRenameConflict(null);
    onClose();
  };

  const handleMerge = async () => {
    if (groupName && renameConflict) {
      const success = await window.api?.renameGroup(groupName, renameConflict);
      if (success) {
        if (selectedGroups.includes(groupName)) {
          onToggleGroup(groupName);
        }
        if (!selectedGroups.includes(renameConflict)) {
          onToggleGroup(renameConflict);
        }
        showToast(`Merged "${groupName}" into "${renameConflict}"`, "success");
      } else {
        showToast("Failed to merge groups", "error");
      }
    }
    handleClose();
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (groupName && renamedGroupName && renamedGroupName !== groupName) {
      if (groups[renamedGroupName]) {
        setRenameConflict(renamedGroupName);
        return;
      }

      const success = await window.api?.renameGroup(
        groupName,
        renamedGroupName
      );
      if (success) {
        if (selectedGroups.includes(groupName)) {
          onToggleGroup(groupName);
          onToggleGroup(renamedGroupName);
        }
        showToast(`Renamed "${groupName}" to "${renamedGroupName}"`, "success");
      } else {
        showToast("Failed to rename group", "error");
      }
    }
    handleClose();
  };

  return (
    <Modal
      isOpen={!!groupName}
      onClose={handleClose}
      title="Rename Group"
      width="400px"
    >
      {renameConflict ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
            Group <span style={{ fontWeight: 600 }}>{renameConflict}</span>{" "}
            already exists.
          </div>
          <div
            style={{
              fontSize: "13px",
              color: "var(--color-text-secondary)",
              lineHeight: "1.5",
            }}
          >
            Do you want to merge{" "}
            <span style={{ fontWeight: 600 }}>{groupName}</span> into{" "}
            <span style={{ fontWeight: 600 }}>{renameConflict}</span>? All
            contacts will be moved.
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            <TactileButton onClick={() => setRenameConflict(null)}>
              Cancel
            </TactileButton>
            <TactileButton onClick={handleMerge} variant="primary">
              Merge Groups
            </TactileButton>
          </div>
        </div>
      ) : (
        <form onSubmit={handleRename}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
            }}
          >
            Group Name
          </label>
          <Input
            autoFocus
            value={renamedGroupName}
            onChange={(e) => setRenamedGroupName(e.target.value)}
            required
            style={{ marginBottom: "16px" }}
          />
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}
          >
            <TactileButton type="button" onClick={handleClose}>
              Cancel
            </TactileButton>
            <TactileButton type="submit" variant="primary">
              Save
            </TactileButton>
          </div>
        </form>
      )}
    </Modal>
  );
};
