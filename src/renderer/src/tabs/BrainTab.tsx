import React from 'react';

export const BrainTab: React.FC = () => {
  const docs = [
    { title: 'Onboarding Guide', category: 'HR', updated: '2d ago' },
    { title: 'Network Topology', category: 'Engineering', updated: '5d ago' },
    { title: 'Shift Schedule', category: 'Operations', updated: '1w ago' },
    { title: 'Incident Response', category: 'Security', updated: '2w ago' },
    { title: 'Vendor Contacts', category: 'Procurement', updated: '3w ago' },
    { title: 'API Documentation', category: 'Engineering', updated: '1mo ago' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px' }}>
      {docs.map((doc, i) => (
        <div key={i} className="glass-panel" style={{
          padding: '24px',
          borderRadius: '12px',
          border: 'var(--border-subtle)',
          background: 'var(--color-bg-card)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          cursor: 'pointer',
          transition: 'transform 0.2s, border-color 0.2s'
        }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.borderColor = 'var(--border-subtle)';
          }}
        >
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-primary)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" /></svg>
          </div>

          <div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              {doc.title}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{doc.category}</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>{doc.updated}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Add New Placeholder */}
      <div style={{
        padding: '24px',
        borderRadius: '12px',
        border: '1px dashed var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: 'pointer',
        color: 'var(--color-text-tertiary)',
        minHeight: '160px'
      }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-text-secondary)'}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
      >
        <div style={{ fontSize: '24px', opacity: 0.5 }}>+</div>
        <div style={{ fontSize: '13px' }}>Create new document</div>
      </div>
    </div>
  );
};
