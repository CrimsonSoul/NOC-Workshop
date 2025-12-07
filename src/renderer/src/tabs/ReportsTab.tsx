import React, { useEffect, useState } from 'react';
import { MetricsData } from '@shared/ipc';

export const ReportsTab: React.FC = () => {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const data = await window.api?.getMetrics();
      if (data) setMetrics(data);
    };
    fetchMetrics();
    // Refresh periodically if needed, or just on mount
  }, []);

  if (!metrics) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-tertiary)' }}>
        Loading metrics...
      </div>
    );
  }

  const StatCard = ({ label, value }: { label: string; value: number }) => (
    <div className="glass-panel" style={{
      padding: '24px',
      borderRadius: '12px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-tertiary)', textTransform: 'uppercase' }}>
        {label}
      </div>
      <div style={{ fontSize: '32px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
        {value}
      </div>
    </div>
  );

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '32px' }}>

      {/* Stat Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px' }}>
        <StatCard label="Last 7 Days" value={metrics.bridgesLast7d} />
        <StatCard label="Last 30 Days" value={metrics.bridgesLast30d} />
        <StatCard label="Last 6 Months" value={metrics.bridgesLast6m} />
        <StatCard label="Last Year" value={metrics.bridgesLast1y} />
      </div>

      {/* Top Groups */}
      <div className="glass-panel" style={{ borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '24px', borderBottom: 'var(--border-subtle)' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Top Groups (Bridge Volume)</h3>
        </div>
        <div>
          {metrics.topGroups.length === 0 ? (
             <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
               No data available yet.
             </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {metrics.topGroups.map((g, i) => (
                  <tr key={g.name} style={{ borderBottom: 'var(--border-subtle)' }}>
                    <td style={{ padding: '16px 24px', width: '40px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
                      #{i + 1}
                    </td>
                    <td style={{ padding: '16px 24px', fontWeight: 500 }}>
                      {g.name}
                    </td>
                    <td style={{ padding: '16px 24px', textAlign: 'right', fontFamily: 'var(--font-family-mono)', color: 'var(--color-text-secondary)' }}>
                      {g.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
