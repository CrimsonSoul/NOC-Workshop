import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Contact } from '@shared/ipc';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    await onSave({ name, email, phone, title });
    onClose();
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,0.03)',
    border: 'var(--border-subtle)',
    borderRadius: '6px',
    color: 'var(--color-text-primary)',
    fontSize: '14px',
    marginBottom: '16px',
    transition: 'border-color 0.2s'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--color-text-secondary)',
    marginBottom: '6px'
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editContact ? "Edit Contact" : "Add Contact"}>
      <form onSubmit={handleSubmit}>

        <label style={labelStyle}>Full Name <span style={{color: '#EF4444'}}>*</span></label>
        <input
          style={inputStyle}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Alice Smith"
          required
          autoFocus
        />

        <label style={labelStyle}>Email Address <span style={{color: '#EF4444'}}>*</span></label>
        <input
          type="email"
          style={inputStyle}
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="alice@example.com"
          required
          // If editing, email might be read-only since it's the ID?
          // Current logic in FileManager updates based on email row finding.
          // If they change email, it might create a duplicate or we need to handle "rename".
          // For now, let's allow editing, but keep in mind backend behavior (upsert).
          // If they change email, it will create a new contact. That's acceptable for now unless we track IDs.
          // Ideally, we should warn or maybe disable email edit if it acts as ID.
          // But user might want to fix a typo.
        />

        <label style={labelStyle}>Job Title</label>
        <input
          style={inputStyle}
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="e.g. Marketing Director"
        />

        <label style={labelStyle}>Phone Number</label>
        <input
          type="tel"
          style={inputStyle}
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="e.g. (555) 123-4567"
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            className="tactile-button"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="tactile-button"
            disabled={isSubmitting}
            style={{
              background: 'var(--color-accent-blue)',
              borderColor: 'transparent',
              color: '#FFFFFF'
            }}
          >
            {isSubmitting ? 'Saving...' : (editContact ? 'Update Contact' : 'Create Contact')}
          </button>
        </div>

      </form>
    </Modal>
  );
};
