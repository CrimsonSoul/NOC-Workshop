import React, { useState } from 'react';

type Props = {
    label: string;
    onClick: () => void;
    primary?: boolean;
    active?: boolean;
    successLabel?: string;
};

export const ToolbarButton = ({ onClick, label, primary = false, active = false, successLabel }: Props) => {
    const [isSuccess, setIsSuccess] = useState(false);

    const handleClick = () => {
        onClick();
        if (successLabel) {
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 2000);
        }
    };

    return (
        <button
            onClick={handleClick}
            style={{
                padding: '6px 16px',
                borderRadius: '20px',
                border: primary ? 'none' : '1px solid var(--border-subtle)',
                background: primary
                    ? (isSuccess ? 'var(--color-accent-green)' : 'var(--color-accent-blue)')
                    : (isSuccess ? 'rgba(16, 185, 129, 0.1)' : (active ? 'rgba(255,255,255,0.1)' : 'transparent')),
                color: primary
                    ? '#FFFFFF'
                    : (isSuccess ? 'var(--color-accent-green)' : (active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)')),
                borderColor: !primary && isSuccess ? 'var(--color-accent-green)' : (primary ? 'transparent' : 'var(--border-subtle)'),
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: primary ? `0 4px 12px ${isSuccess ? 'rgba(16, 185, 129, 0.3)' : 'rgba(59, 130, 246, 0.3)'}` : 'none'
            }}
            onMouseEnter={(e) => {
                if (!isSuccess) {
                    if (!primary) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
                    } else {
                        e.currentTarget.style.background = '#2563EB'; // Darker blue
                    }
                }
            }}
            onMouseLeave={(e) => {
                if (!isSuccess) {
                    if (!primary) {
                        e.currentTarget.style.background = active ? 'rgba(255,255,255,0.1)' : 'transparent';
                        e.currentTarget.style.color = active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    } else {
                        e.currentTarget.style.background = 'var(--color-accent-blue)';
                    }
                }
            }}
        >
            {isSuccess && !primary && (
                <span style={{ fontSize: '14px', lineHeight: 0 }}>✓</span>
            )}
            {isSuccess ? (successLabel || label) : label}
        </button>
    )
}
