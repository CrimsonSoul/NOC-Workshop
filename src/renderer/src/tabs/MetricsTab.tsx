import React, { useEffect, useState } from 'react';
import { MetricsData } from '@shared/ipc';
import { getColorForString } from '../utils/colors';
import { ToolbarButton } from '../components/ToolbarButton';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';

export const MetricsTab: React.FC = () => {
    const [metrics, setMetrics] = useState<MetricsData | null>(null);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const { showToast } = useToast();

    const [error, setError] = useState<string | null>(null);

    const fetchMetrics = async () => {
        try {
            setError(null);
            const data = await window.api?.getMetrics();
            if (data) {
                setMetrics(data);
            } else {
                setError('Unable to load metrics data');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(`Failed to load metrics: ${message}`);
            console.error('[MetricsTab] Error fetching metrics:', err);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, []);

    const handleReset = async () => {
        try {
            const success = await window.api?.resetMetrics();
            if (success) {
                showToast('History cleared', 'success');
                fetchMetrics();
            } else {
                showToast('Failed to clear history: Unable to write to file', 'error');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            showToast(`Failed to clear history: ${message}`, 'error');
            console.error('[MetricsTab] Error resetting metrics:', err);
        }
        setIsResetModalOpen(false);
    };

    const StatCard = ({ label, value }: { label: string; value: number }) => (
        <div style={{
            padding: '24px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: 'var(--border-subtle)'
        }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
                {label}
            </div>
            <div style={{ fontSize: '36px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                {value}
            </div>
        </div>
    );

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            background: 'var(--color-bg-app)'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px 24px',
                borderBottom: 'var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Reports</h2>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                        {metrics ? 'Data Loaded' : 'Loading...'}
                    </div>
                </div>

                <ToolbarButton
                    label="RESET HISTORY"
                    onClick={() => setIsResetModalOpen(true)}
                />
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
                {error ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: '16px', color: 'var(--color-text-tertiary)' }}>
                        <div style={{ fontSize: '48px', opacity: 0.3 }}>⚠</div>
                        <div style={{ color: 'var(--color-text-secondary)' }}>{error}</div>
                        <button
                            onClick={fetchMetrics}
                            style={{
                                padding: '8px 16px',
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'var(--color-text-primary)',
                                cursor: 'pointer',
                                fontSize: '13px'
                            }}
                        >
                            Retry
                        </button>
                    </div>
                ) : !metrics ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
                        Loading metrics...
                    </div>
                ) : (
                    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                        {/* Stat Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
                            <StatCard label="Last 7 Days" value={metrics.bridgesLast7d} />
                            <StatCard label="Last 30 Days" value={metrics.bridgesLast30d} />
                            <StatCard label="Last 6 Months" value={metrics.bridgesLast6m} />
                            <StatCard label="Last Year" value={metrics.bridgesLast1y} />
                        </div>

                        {/* Top Groups */}
                        <div style={{
                            borderRadius: '12px',
                            overflow: 'hidden',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: 'var(--border-subtle)'
                        }}>
                            <div style={{ padding: '24px', borderBottom: 'var(--border-subtle)' }}>
                                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Top Groups (Bridge Volume)</h3>
                            </div>
                            <div>
                                {metrics.topGroups.length === 0 ? (
                                    <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                                        No data available yet.
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <tbody>
                                            {metrics.topGroups.map((g, i) => {
                                                const color = getColorForString(g.name);
                                                return (
                                                    <tr key={g.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                        <td style={{ padding: '16px 24px', width: '40px', color: 'var(--color-text-tertiary)', fontWeight: 500, fontSize: '14px' }}>
                                                            #{i + 1}
                                                        </td>
                                                        <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                                                            <span style={{
                                                                padding: '6px 12px',
                                                                borderRadius: '20px',
                                                                fontSize: '13px',
                                                                fontWeight: 500,
                                                                background: color.bg,
                                                                border: `1px solid ${color.border}`,
                                                                color: color.text,
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '6px',
                                                                lineHeight: 1
                                                            }}>
                                                                {g.name}
                                                            </span>
                                                        </td>
                                                        <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                                                            {g.count}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Modal
                isOpen={isResetModalOpen}
                onClose={() => setIsResetModalOpen(false)}
                title="Reset History"
                width="400px"
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ fontSize: '14px', color: 'var(--color-text-primary)' }}>
                        Are you sure you want to clear all bridge history?
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
                        This action cannot be undone. All metrics and reports will be reset to zero.
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
                        <button
                            onClick={() => setIsResetModalOpen(false)}
                            className="tactile-button"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleReset}
                            className="tactile-button"
                            style={{ background: '#EF4444', borderColor: 'transparent', color: '#FFF' }}
                        >
                            Reset Data
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};
