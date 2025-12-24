import React from "react";
import { Modal } from "../../components/Modal";
import { TactileButton } from "../../components/TactileButton";
import { useToast } from "../../components/Toast";

type DeleteGroupModalProps = {
  groupName: string | null;
  onClose: () => void;
  selectedGroups: string[];
  onToggleGroup: (group: string) => void;
};

export const DeleteGroupModal: React.FC<DeleteGroupModalProps> = ({
  groupName,
  onClose,
  selectedGroups,
  onToggleGroup,
}) => {
  const { showToast } = useToast();

  const handleDelete = async () => {
    if (groupName) {
      const success = await window.api?.removeGroup(groupName);
      if (success) {
        if (selectedGroups.includes(groupName)) {
          onToggleGroup(groupName);
        }
        showToast(`Group "${groupName}" deleted`, "success");
      } else {
        showToast("Failed to delete group", "error");
      }
    }
    onClose();
  };

  return (
    <Modal
      isOpen={!!groupName}
      onClose={onClose}
      title="Delete Group"
      width="400px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
          Are you sure you want to delete{" "}
          <span style={{ fontWeight: 600 }}>{groupName}</span>?
        </div>
        <div
          style={{
            fontSize: "13px",
            color: "var(--color-text-secondary)",
            lineHeight: "1.5",
          }}
        >
          This will remove the group tag from all contacts. The contacts
          themselves will not be deleted.
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "8px",
          }}
        >
          <TactileButton onClick={onClose}>Cancel</TactileButton>
          <TactileButton onClick={handleDelete} variant="danger">
            Delete Group
          </TactileButton>
        </div>
      </div>
    </Modal>
  );
};
