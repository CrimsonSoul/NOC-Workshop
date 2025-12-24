import React from "react";
import { Modal } from "../../components/Modal";
import { TactileButton } from "../../components/TactileButton";

type BridgeReminderModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export const BridgeReminderModal: React.FC<BridgeReminderModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Meeting Recording"
      width="400px"
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ fontSize: "14px", color: "var(--color-text-primary)" }}>
          Please ensure meeting recording is enabled.
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
          <TactileButton
            onClick={() => {
              onConfirm();
              onClose();
            }}
            variant="primary"
          >
            I Understand
          </TactileButton>
        </div>
      </div>
    </Modal>
  );
};
