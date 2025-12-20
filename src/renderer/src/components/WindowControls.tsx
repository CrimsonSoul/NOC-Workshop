import React, { useState, useEffect } from 'react';

export const WindowControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);

    // Sync with actual window maximize state
    useEffect(() => {
        // Check initial state
        window.api?.isMaximized?.().then((maximized: boolean) => {
            setIsMaximized(maximized);
        }).catch(() => {
            // Fallback if API not available yet
        });

        // Listen for maximize/unmaximize events from main process
        const handleMaximizeChange = (_event: any, maximized: boolean) => {
            setIsMaximized(maximized);
        };

        window.api?.onMaximizeChange?.(handleMaximizeChange);

        return () => {
            window.api?.removeMaximizeListener?.();
        };
    }, []);

    const handleMinimize = () => window.api?.windowMinimize();
    const handleMaximize = () => {
        window.api?.windowMaximize();
        // Optimistically toggle state immediately for responsive UI
        // The listener will correct if needed
        setIsMaximized(prev => !prev);
    };
    const handleClose = () => window.api?.windowClose();

    const btnClass = "window-control-btn";
    if (window.api?.platform === 'darwin') return null;

    return (
        <div style={{
            display: 'flex',
            height: '32px',
            WebkitAppRegion: 'no-drag' as any,
            zIndex: 10000,
            position: 'relative' // Ensure z-index works
        }}>
            <style>{`
            .window-control-btn {
                width: 46px;
                height: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: transparent;
                border: none;
                color: var(--color-text-secondary);
                cursor: default;
                transition: background 0.1s ease, color 0.1s ease;
                -webkit-app-region: no-drag;
                outline: none;
            }
            .window-control-btn:hover {
                background: rgba(255, 255, 255, 0.06);
                color: var(--color-text-primary);
            }
            .window-control-btn.close-btn:hover {
                background: #E81123;
                color: #FFFFFF;
            }
        `}</style>
            <button
                onClick={handleMinimize}
                className={btnClass}
                title="Minimize"
            >
                <svg width="10" height="1" viewBox="0 0 10 1"><path d="M0 0h10v1H0z" fill="currentColor" /></svg>
            </button>
            <button
                onClick={handleMaximize}
                className={btnClass}
                title={isMaximized ? "Restore Down" : "Maximize"}
            >
                {isMaximized ? (
                    // Restore icon (two overlapping squares, like Edge/Windows)
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
                        {/* Front window */}
                        <path d="M0 2v8h8V2H0zm7 7H1V3h6v6z" />
                        {/* Back window (top-right offset) */}
                        <path d="M2 0v2h1V1h6v6H8v1h2V0H2z" />
                    </svg>
                ) : (
                    // Maximize icon (single square)
                    <svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0v10h10V0H0zm9 9H1V1h8v8z" fill="currentColor" /></svg>
                )}
            </button>
            <button
                onClick={handleClose}
                className={`${btnClass} close-btn`}
                title="Close"
            >
                <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.05 0L0 1.05 3.95 5 0 8.95 1.05 10 5 6.05 8.95 10 10 8.95 6.05 5 10 1.05 8.95 0 5 3.95z" fill="currentColor" /></svg>
            </button>
        </div>
    );
};
