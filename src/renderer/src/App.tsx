import { useMemo, useState } from 'react';
import type { BridgeAPI } from '@shared/ipc';

const tabs = ['Assembler', 'Directory', 'Radar'] as const;
type TabKey = (typeof tabs)[number];

const tabDescriptions: Record<TabKey, string> = {
  Assembler: 'Manage workbook assembly, sheets, and templating.',
  Directory: 'Browse watched directories and pick sources.',
  Radar: 'Monitor active tasks, preview files, and run quick actions.'
};

const bridgeDescriptions: Array<{ label: string; detail: string }> = [
  { label: 'Open paths', detail: 'Request the main process to open files or folders.' },
  { label: 'Watch files', detail: 'Subscribe to chokidar events from the file system watcher.' },
  { label: 'Spreadsheet tools', detail: 'Parse and emit XLSX data for imports and exports.' },
  { label: 'Renderer updates', detail: 'Notify the UI about Radar or Directory changes.' }
];

function useBridge(): BridgeAPI | undefined {
  const bridge = useMemo(() => window.api, []);
  return bridge;
}

function App() {
  const bridge = useBridge();
  const [activeTab, setActiveTab] = useState<TabKey>('Assembler');

  return (
    <div className="app-shell">
      <h1>Operators Atelier</h1>
      <p className="subtitle">Vite + React + TypeScript + Electron scaffold</p>

      <div className="tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="panel">
        <h2>
          {activeTab} tab
        </h2>
        <p>{tabDescriptions[activeTab]}</p>

        <h3>IPC Bridges</h3>
        <p>
          The preload layer exposes an IPC bridge so renderer tabs can talk to the Electron main
          process without enabling nodeIntegration. The object is typed and ready for expansion.
        </p>
        <ul className="bridge-list">
          {bridgeDescriptions.map((item) => (
            <li key={item.label}>
              <strong>{item.label}.</strong> {item.detail}
            </li>
          ))}
        </ul>

        {bridge && (
          <p>
            Bridge detected. Context bridge exposes {Object.keys(bridge).length} handlers ready for
            wiring.
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
