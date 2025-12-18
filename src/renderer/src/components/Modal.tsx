import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: string;
};

export const Modal: React.FC<Props> = ({ isOpen, onClose, children, title, width = '480px' }) => {
  // Focus trap to prevent focus from leaving modal
  const focusTrapRef = useFocusTrap<HTMLDivElement>(isOpen);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleKeyDown]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="animate-fade-in"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20000
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={focusTrapRef}
        className="animate-scale-in"
        style={{
          background: 'var(--color-bg-surface-opaque)',
          border: 'var(--border-medium)',
          borderRadius: 'var(--radius-xl)',
          width: width,
          maxWidth: '90vw',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-modal)',
          transformOrigin: 'center center',
          position: 'relative',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {/* Subtle gradient accent at top */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(59, 130, 246, 0.5) 50%, transparent 100%)',
          opacity: 0.5
        }} />

        {/* Header - Compact */}
        <div style={{
          padding: 'var(--space-3) var(--space-4)',
          borderBottom: 'var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <h2
            id="modal-title"
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-primary)',
              letterSpacing: '-0.01em'
            }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid transparent',
              color: 'var(--color-text-tertiary)',
              cursor: 'pointer',
              padding: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all var(--transition-fast)',
              outline: 'none'
            }}
            className="hover-bg"
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-primary)';
              e.currentTarget.style.borderColor = 'var(--border-subtle)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-tertiary)';
              e.currentTarget.style.borderColor = 'transparent';
            }}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content - Compact */}
        <div style={{
          padding: 'var(--space-4)',
          overflowY: 'auto',
          flex: 1,
          overscrollBehavior: 'contain'
        }}>
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
