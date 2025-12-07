import React, { useState, useEffect } from 'react';

const ZONES = [
  { label: 'CST', timeZone: 'America/Chicago', primary: true },
  { label: 'EST', timeZone: 'America/New_York' },
  { label: 'MST', timeZone: 'America/Denver' },
  { label: 'PST', timeZone: 'America/Los_Angeles' }
];

export const WorldClock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sort: Primary first, then others
  const primaryZone = ZONES.find(z => z.primary)!;
  const secondaryZones = ZONES.filter(z => !z.primary);

  // Formatters
  const getFormatter = (timeZone: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('en-US', { timeZone, ...options });

  // CST: Full details
  const primaryTimeStr = getFormatter(primaryZone.timeZone, { hour: 'numeric', minute: '2-digit', hour12: true }).format(time);
  const primaryDateStr = getFormatter(primaryZone.timeZone, { month: 'short', day: 'numeric', weekday: 'short' }).format(time);
  const primaryZoneName = getFormatter(primaryZone.timeZone, { timeZoneName: 'short' }).formatToParts(time).find(p => p.type === 'timeZoneName')?.value || 'CT';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>

      {/* Secondary Zones - NOW ON LEFT */}
      <div style={{ display: 'flex', gap: '16px' }}>
        {secondaryZones.map(z => {
          const timeStr = getFormatter(z.timeZone, { hour: 'numeric', minute: '2-digit', hour12: true }).format(time);
          const zoneName = getFormatter(z.timeZone, { timeZoneName: 'short' }).formatToParts(time).find(p => p.type === 'timeZoneName')?.value || z.label;

          return (
            <div key={z.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600, marginBottom: '2px' }}>
                {zoneName}
              </span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-base)', fontWeight: 500 }}>
                {timeStr}
              </span>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />

      {/* Primary Zone (CST) - NOW ON RIGHT */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', lineHeight: '1.2' }}>
            {primaryTimeStr}
          </span>
          <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--color-text-tertiary)', fontWeight: 500 }}>
             <span>{primaryZoneName}</span>
             <span>•</span>
             <span>{primaryDateStr}</span>
          </div>
        </div>
      </div>

    </div>
  );
};
