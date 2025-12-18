import React, { useState, ReactNode } from 'react';

type Props = {
    label?: string;
    icon?: ReactNode;
    onClick: () => void;
    primary?: boolean;
    active?: boolean;
    successLabel?: string;
    children?: ReactNode;
};

export const ToolbarButton = ({ onClick, label, icon, primary = false, active = false, successLabel, children }: Props) => {
    const [isSuccess, setIsSuccess] = useState(false);

    const handleClick = () => {
        onClick();
        if (successLabel) {
            setIsSuccess(true);
            setTimeout(() => setIsSuccess(false), 2000);
        }
    };

    const content = children || label;

    return (
        <button
            onClick={handleClick}
            style={{
                position: 'relative',
                padding: '6px 12px',
                borderRadius: 'var(--radius-pill)',
                border: primary ? 'none' : 'var(--border-medium)',
                background: primary
                    ? (isSuccess ? 'linear-gradient(135deg, var(--color-accent-green) 0%, #059669 100%)' : 'linear-gradient(135deg, var(--color-accent-blue) 0%, #2563EB 100%)')
                    : (isSuccess ? 'var(--color-accent-green-subtle)' : (active ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)')),
                color: primary
                    ? '#FFFFFF'
                    : (isSuccess ? 'var(--color-accent-green)' : (active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)')),
                borderColor: !primary && isSuccess ? 'var(--color-accent-green)' : (primary ? 'transparent' : 'var(--border-medium)'),
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: primary ? (isSuccess ? 'var(--shadow-sm), 0 0 20px rgba(16, 185, 129, 0.3)' : 'var(--shadow-sm), var(--shadow-glow-blue)') : 'none',
                overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
                if (!isSuccess) {
                    if (!primary) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        e.currentTarget.style.transform = 'translateY(-0.5px)';
                    } else {
                        e.currentTarget.style.background = isSuccess
                            ? 'linear-gradient(135deg, #10B981 0%, #047857 100%)'
                            : 'linear-gradient(135deg, var(--color-accent-blue-hover) 0%, var(--color-accent-blue) 100%)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = isSuccess
                            ? 'var(--shadow-md), 0 0 24px rgba(16, 185, 129, 0.4)'
                            : 'var(--shadow-md), 0 0 24px rgba(59, 130, 246, 0.4)';
                    }
                }
            }}
            onMouseLeave={(e) => {
                if (!isSuccess) {
                    if (!primary) {
                        e.currentTarget.style.background = active ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.color = active ? 'var(--color-text-primary)' : 'var(--color-text-secondary)';
                        e.currentTarget.style.borderColor = 'var(--border-medium)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    } else {
                        e.currentTarget.style.background = isSuccess
                            ? 'linear-gradient(135deg, var(--color-accent-green) 0%, #059669 100%)'
                            : 'linear-gradient(135deg, var(--color-accent-blue) 0%, #2563EB 100%)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = isSuccess
                            ? 'var(--shadow-sm), 0 0 20px rgba(16, 185, 129, 0.3)'
                            : 'var(--shadow-sm), var(--shadow-glow-blue)';
                    }
                }
            }}
        >
            {isSuccess && !primary && (
                <span style={{ fontSize: '14px', lineHeight: 0 }}>✓</span>
            )}
            {!isSuccess && icon}
            <span style={{ position: 'relative', zIndex: 1 }}>
                {isSuccess ? (successLabel || content) : content}
            </span>
        </button>
    )
}
