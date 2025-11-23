import React, { useMemo, useState } from 'react';
import { Panel, ToggleSwitch, TactileButton, Input } from '../components';
import { GroupMap } from '@shared/ipc';

type Props = {
  groups: GroupMap;
  selectedGroups: string[];
  manualAdds: string[];
  manualRemoves: string[];
  onToggleGroup: (group: string, active: boolean) => void;
  onAddManual: (email: string) => void;
  onRemoveManual: (email: string) => void;
  onResetManual: () => void;
};

export const AssemblerTab: React.FC<Props> = ({
  groups,
  selectedGroups,
  manualAdds,
  manualRemoves,
  onToggleGroup,
  onAddManual,
  onRemoveManual,
  onResetManual
}) => {
  const [adhocInput, setAdhocInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'manifest' | 'teams'>('manifest');

  // The Set Math
  const manifest = useMemo(() => {
    const fromGroups = selectedGroups.flatMap(g => groups[g] || []);
    const union = new Set([...fromGroups, ...manualAdds]);
    manualRemoves.forEach(r => union.delete(r));
    return Array.from(union).sort();
  }, [groups, selectedGroups, manualAdds, manualRemoves]);

  const handleCopy = () => {
    navigator.clipboard.writeText(manifest.join('; '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const teamsUrl = useMemo(() => {
    const dateStr = new Date().toLocaleDateString();
    const attendees = manifest.join(',');
    return `https://teams.microsoft.com/l/meeting/new?subject=NOC Briefing ${dateStr}&attendees=${attendees}`;
  }, [manifest]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '24px', height: '100%' }}>
      {/* Left Column: Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <Panel title="Groups" style={{ flex: 1 }}>
          <div style={{ padding: '12px' }}>
            {Object.keys(groups).map(g => (
              <ToggleSwitch
                key={g}
                label={g}
                checked={selectedGroups.includes(g)}
                onChange={(c) => onToggleGroup(g, c)}
              />
            ))}
            {Object.keys(groups).length === 0 && (
              <div style={{ padding: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                No groups loaded. Check groups.xlsx.
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Ad-Hoc" style={{ height: '200px' }}>
          <div style={{ padding: '12px' }}>
            <Input
              label="Add Email"
              placeholder="operator@agency.net"
              value={adhocInput}
              onChange={(e) => setAdhocInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && adhocInput) {
                  onAddManual(adhocInput);
                  setAdhocInput('');
                }
              }}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {manualAdds.map(email => (
                <div key={email} style={{
                  background: 'var(--bg-app)',
                  border: '1px solid var(--accent-primary)',
                  padding: '2px 8px',
                  fontSize: '11px',
                  color: 'var(--accent-primary)'
                }}>
                  {email}
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>

      {/* Right Column: Manifest or Teams */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '24px', color: 'var(--text-primary)' }}>
            {viewMode === 'manifest' ? `Manifest (${manifest.length})` : 'Microsoft Teams'}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {viewMode === 'teams' ? (
              <TactileButton onClick={() => setViewMode('manifest')} variant="secondary">
                Back to Manifest
              </TactileButton>
            ) : (
              <>
                <TactileButton onClick={onResetManual} variant="secondary">Reset</TactileButton>
                <TactileButton onClick={() => setViewMode('teams')} variant="secondary">Teams</TactileButton>
                <TactileButton onClick={handleCopy} active={copied}>
                  {copied ? 'STAMPED' : 'Copy List'}
                </TactileButton>
              </>
            )}
          </div>
        </div>

        {viewMode === 'manifest' ? (
          <div style={{
            flex: 1,
            background: '#fff', // Receipt look
            color: '#000',
            fontFamily: 'Courier New, monospace',
            padding: '24px',
            overflow: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            {/* Paper texture overlay effect could go here */}
            <div style={{ borderBottom: '2px dashed #000', paddingBottom: '12px', marginBottom: '12px', textAlign: 'center' }}>
              *** OFFICIAL LOG ***<br />
              {new Date().toLocaleString().toUpperCase()}
            </div>

            {manifest.map(email => (
              <div key={email} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 0',
                borderBottom: '1px solid #eee'
              }}>
                <span>{email}</span>
                <span
                  style={{ cursor: 'pointer', fontWeight: 'bold', color: '#cc0000' }}
                  onClick={() => onRemoveManual(email)}
                  title="Strike out"
                >
                  [X]
                </span>
              </div>
            ))}

            {manifest.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: '40px', fontStyle: 'italic' }}>
                // AWAITING INPUT //
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, background: '#fff', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            <webview
              src={teamsUrl}
              style={{ width: '100%', height: '100%' }}
              // @ts-ignore - webview tag not strictly typed in React without extra types
              allowpopups="true"
            />
          </div>
        )}
      </div>
    </div>
  );
};
