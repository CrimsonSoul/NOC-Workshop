# Operators Atelier architecture

This document captures deeper implementation guidance for the Electron + Vite desktop app, focusing on data handling, IPC contracts, UI tab behaviors, authentication flows, and test coverage.

## Environment and setup
- **Stack**: Electron main process with a Vite-driven renderer (likely React/TypeScript), bundled with npm scripts.
- **Install**: `npm install` to pull dependencies.
- **Development**: `npm run dev` starts Vite in watch mode and boots Electron with hot reload. Keep the console open to monitor main-process logs.
- **Production build**: `npm run build` outputs bundled renderer assets and packages an Electron binary. Run the packaged app to verify IPC wiring outside the dev server.
- **Linting/formatting**: Adopt project defaults (e.g., ESLint/Prettier) to keep main/renderer code style consistent.

## Styling philosophy: Analog Precision
- **Typography & scale**: Use readable sans-serif faces with strict spacing increments (4/8 px). Emphasize labels and numeric readouts.
- **Color**: Prefer muted neutrals for backgrounds, with sparing use of accent colors for alerts and primary actions. Avoid gradients; use solid fills and 1 px keylines for separation.
- **Components**: Buttons and toggles should feel "instrumented"—clear borders, high-contrast focus states, minimal radius. Avoid excessive shadows; rely on consistent elevation tokens.
- **Motion**: Animations should be short (<150 ms) and driven by state change significance (e.g., confirming an action). No looping or decorative motion.

## Data watcher and parsing
- **Sources**: CSV/TSV or newline-delimited text dropped into a watched directory (configurable via app settings or IPC command).
- **Watcher behavior**:
  - Debounce file change events to avoid duplicate parses during rapid writes.
  - Ignore partial writes by confirming file stability (size or mtime) before parsing.
  - Emit structured progress events: `file:queued`, `file:parsing`, `file:error`, `file:complete`.
- **Parsing**:
  - Stream rows to reduce memory use; enforce column headers and validate required fields.
  - Attach metadata per batch (source path, checksum, ingest timestamp) for auditing.
  - Emit parser diagnostics (line number, offending field) back to the renderer for inline surfacing.
- **State**: Maintain a rolling cache of recent ingests in the main process; renderer requests snapshots via IPC to hydrate views on load.

## IPC API (main ↔ renderer)
- **Principles**: Narrow, declarative channels; validate payloads; never expose `remote` or Node globals to the renderer.
- **Suggested channels**:
  - `watcher:setPath(path: string)`: configure the watched directory; responds with confirmation or error.
  - `watcher:state`: request current watcher status and recent ingest metadata.
  - `data:stream`: subscribe to parsed row batches; payload includes file id, sequence number, and rows.
  - `data:ack(fileId: string, seq: number)`: renderer acknowledges receipt to advance backpressure window.
  - `auth:tokenStatus`: fetch current token, expiry, and provider information.
  - `http:request`: proxy outbound HTTP calls; main process attaches auth headers and enforces CORS/host allowlists.
  - `log:event`: structured telemetry from renderer to main for diagnostics.
- **Safety**: Use `contextIsolation`, `preload` scripts, and `ipcMain.handle`/`ipcRenderer.invoke` patterns. Validate types server-side before acting.

## Tab behaviors
- **Monitor tab**: Live stream of ingest progress and parsed anomalies. Supports filtering by file, severity, and time window. Auto-scrolls but can be paused for inspection.
- **Review tab**: Presents parsed datasets for manual validation. Tracks unsaved annotations; block navigation away if edits are pending and prompt to save/discard.
- **Actions tab**: Operational commands (export, dispatch alerts, mark anomalies). Requires an active authentication token; disables actions when token is absent/expired.
- **Navigation guard**: Global route guard checks for pending edits or ongoing uploads before switching tabs. Surfaces a modal with contextual options (save, discard, stay).

## Authentication interception flow
- **Objective**: Centralize outbound HTTP requests in the main process to avoid token leaks from the renderer.
- **Flow**:
  1. Renderer invokes `http:request` with method, path, and payload.
  2. Main process retrieves stored token (refreshing if provider supports it) and applies headers.
  3. Requests are validated against an allowlist (host and path patterns) before dispatch.
  4. Responses (or errors with status codes) are returned via `invoke` result. 401/403 responses trigger a token-invalid event to the renderer.
  5. Renderer responds by showing a re-auth prompt; upon success, token is stored in the main process keychain/secure storage.
- **Interception**: Leverage `session.webRequest.onBeforeSendHeaders` to inspect/augment headers and to block disallowed domains during navigation or asset loads.

## Testing strategy
- **Unit tests**:
  - Parser functions with varied delimiters, malformed rows, and large files.
  - IPC handlers, especially validation branches and error propagation.
  - UI state reducers/selectors for tabs, filters, and auth state.
- **Integration tests**:
  - Electron + Vite end-to-end using packaged or `npm run dev` builds with Playwright or Spectron alternatives.
  - File watcher lifecycle: simulate file creation/update and assert events and renderer updates.
  - Auth interception: mock token refresh and ensure blocked requests are surfaced correctly.
- **Fixtures**: Store canonical CSV/TSV samples under `fixtures/` with known-good outputs and error manifests.
- **Automation**: Wire tests to CI with per-PR runs; collect coverage especially around parser edge cases and IPC boundaries.

## Implementation notes
- Keep a shared `types` module for IPC payloads to reduce drift between main and renderer.
- Prefer reactive streams (e.g., RxJS or simple EventEmitter) in the main process to manage watcher events and backpressure.
- Log with structured messages (JSON) to make it easy to pipe into external observability tools during ops shifts.
