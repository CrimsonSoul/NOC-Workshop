import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Contact } from '@shared/ipc';
import { Input } from './Input';
import { TactileButton } from './TactileButton';
import { sanitizePhoneNumber, formatPhoneNumber } from '../utils/phone';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contact: Partial<Contact>) => void;
  initialEmail?: string;
  editContact?: Contact; // If provided, we are in edit mode
};

export const AddContactModal: React.FC<Props> = ({ isOpen, onClose, onSave, initialEmail = '', editContact }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset or populate form when opened
  useEffect(() => {
    if (isOpen) {
      if (editContact) {
        setName(editContact.name);
        setEmail(editContact.email);
        setPhone(editContact.phone);
        setTitle(editContact.title);
      } else {
        setName('');
        setEmail(initialEmail);
        setPhone('');
        setTitle('');
      }
      setIsSubmitting(false);
    }
  }, [isOpen, initialEmail, editContact]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    // Optimistic: Do not await.
    onSave({ name, email, phone: sanitizePhoneNumber(phone), title });
    onClose();
  };

  const handlePhoneBlur = () => {
    setPhone(formatPhoneNumber(phone));
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px'
  };

  const fieldStyle: React.CSSProperties = {
    marginBottom: '16px'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editContact ? "Edit Contact" : "Add Contact"}>
      <form onSubmit={handleSubmit}>

        <div style={fieldStyle}>
          <label style={labelStyle}>Full Name <span style={{ color: '#EF4444' }}>*</span></label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alice Smith"
            required
            autoFocus
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Email Address <span style={{ color: '#EF4444' }}>*</span></label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="alice@example.com"
            required
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Job Title</label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Marketing Director"
          />
        </div>

        <div style={fieldStyle}>
          <label style={labelStyle}>Phone Number</label>
          <Input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onBlur={handlePhoneBlur}
            placeholder="e.g. (555) 123-4567"
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
          <TactileButton
            type="button"
            onClick={onClose}
          >
            Cancel
          </TactileButton>
          <TactileButton
            type="submit"
            disabled={isSubmitting}
            variant="primary"
          >
            {isSubmitting ? 'Saving...' : (editContact ? 'Update Contact' : 'Create Contact')}
          </TactileButton>
        </div>

      </form>
    </Modal>
  );
};
