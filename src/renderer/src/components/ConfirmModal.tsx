import React from 'react';
import { Modal } from './Modal';
import { TactileButton } from './TactileButton';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    isDanger = false
}) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} width="400px">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{
                    fontSize: '15px',
                    color: 'var(--color-text-secondary)',
                    lineHeight: 1.5
                }}>
                    {message}
                </div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px',
                    marginTop: '8px'
                }}>
                    <TactileButton variant="secondary" onClick={onClose}>
                        {cancelLabel}
                    </TactileButton>
                    <TactileButton
                        variant={isDanger ? 'primary' : 'primary'}
                        style={isDanger ? { background: 'var(--color-danger)', borderColor: 'rgba(255,0,0,0.2)' } : {}}
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                    >
                        {confirmLabel}
                    </TactileButton>
                </div>
            </div>
        </Modal>
    );
};
