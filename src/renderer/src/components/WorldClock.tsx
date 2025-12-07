import React, { useState, useEffect } from 'react';

const ZONES = [
  { label: 'CUT', timeZone: 'UTC' },
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

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
      {ZONES.map(z => {
        const timeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: z.timeZone,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).format(time);

        return (
          <div key={z.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '10px', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>{z.label}</span>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-family-mono)' }}>{timeStr}</span>
          </div>
        );
      })}
    </div>
  );
};
