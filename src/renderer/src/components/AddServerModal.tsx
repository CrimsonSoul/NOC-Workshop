import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Input } from './Input';
import { TactileButton } from './TactileButton';
import { Server } from '@shared/ipc';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverToEdit?: Server;
}

export const AddServerModal: React.FC<AddServerModalProps> = ({
  isOpen,
  onClose,
  serverToEdit
}) => {
  const [formData, setFormData] = useState({
    name: '',
    businessArea: '',
    lob: '',
    comment: '',
    owner: '',
    contact: '',
    osType: '',
    os: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (serverToEdit) {
        setFormData({
            name: serverToEdit.name || '',
            businessArea: serverToEdit.businessArea || '',
            lob: serverToEdit.lob || '',
            comment: serverToEdit.comment || '',
            owner: serverToEdit.owner || '',
            contact: serverToEdit.contact || '',
            osType: serverToEdit.osType || '',
            os: serverToEdit.os || ''
        });
      } else {
        setFormData({
            name: '',
            businessArea: '',
            lob: '',
            comment: '',
            owner: '',
            contact: '',
            osType: '',
            os: ''
        });
      }
    }
  }, [isOpen, serverToEdit]);

  const handleSubmit = async () => {
    if (!formData.name) return; // Name is required

    setIsSubmitting(true);
    try {
       await window.api.addServer(formData);
       onClose();
    } finally {
       setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={serverToEdit ? 'Edit Server' : 'Add Server'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input
          label="Server Name (Required)"
          value={formData.name}
          onChange={handleChange('name')}
          placeholder="e.g. SRV-001"
          autoFocus
        />
        <div style={{ display: 'flex', gap: '16px' }}>
             <Input
               label="Business Area"
               value={formData.businessArea}
               onChange={handleChange('businessArea')}
               placeholder="e.g. Finance"
               containerStyle={{ flex: 1 }}
             />
             <Input
               label="LOB"
               value={formData.lob}
               onChange={handleChange('lob')}
               placeholder="Line of Business"
               containerStyle={{ flex: 1 }}
             />
        </div>

        <Input
           label="Comment"
           value={formData.comment}
           onChange={handleChange('comment')}
           placeholder="Notes..."
        />

        <div style={{ display: 'flex', gap: '16px' }}>
            <Input
              label="LOB Owner (Email)"
              value={formData.owner}
              onChange={handleChange('owner')}
              placeholder="owner@example.com"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="IT Contact (Email)"
              value={formData.contact}
              onChange={handleChange('contact')}
              placeholder="support@example.com"
              containerStyle={{ flex: 1 }}
            />
        </div>

        <div style={{ display: 'flex', gap: '16px' }}>
            <Input
              label="OS Type"
              value={formData.osType}
              onChange={handleChange('osType')}
              placeholder="e.g. Windows"
              containerStyle={{ flex: 1 }}
            />
            <Input
              label="Config OS"
              value={formData.os}
              onChange={handleChange('os')}
              placeholder="e.g. Windows Server 2019"
              containerStyle={{ flex: 1 }}
            />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
          <TactileButton onClick={handleSubmit} disabled={isSubmitting || !formData.name}>
            {isSubmitting ? 'Saving...' : 'Save Server'}
          </TactileButton>
        </div>
      </div>
    </Modal>
  );
};
