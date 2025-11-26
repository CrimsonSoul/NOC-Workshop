import { ipcRenderer } from 'electron';
import { IPC_CHANNELS, type RadarCounters, type RadarSnapshot, type RadarStatusVariant } from '@shared/ipc';

type SelectorMap = {
  ok: string;
  pending: string;
  internalError: string;
  countsPanel: string;
  status: string;
};

const SELECTORS: SelectorMap = {
  ok: 'td.left.ok + td.right',
  pending: 'td.left.pending + td.right',
  internalError: 'td.left.internal.error + td.right',
  countsPanel:
    '#xcenter-counts, [data-xcenter-counts], [data-testid="xcenter-counts"], [aria-label*="XCenter Counts" i], [data-panel="xcenter" i], [data-panel-type="xcenter" i], .xcenter-counts, .counts-panel',
  status: 'td.status-bar'
};

let lastPayload: string | null = null;

const parseCounter = (selector: string): number | undefined => {
  const element = document.querySelector(selector);
  if (!element) return undefined;

  const text = element.textContent?.trim();
  if (!text) return undefined;

  const parsed = Number(text);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const readStatusElement = (selector: string): HTMLElement | null => {
  return document.querySelector(selector);
};

const parseStatusVariant = (element: HTMLElement): RadarStatusVariant | undefined => {
  const hint = `${element.className} ${element.getAttribute('data-status') ?? ''}`.toLowerCase();

  if (/success|green|ready|available/.test(hint)) return 'success';
  if (/warning|caution|amber|yellow/.test(hint)) return 'warning';
  if (/danger|error|alert|red|critical/.test(hint)) return 'danger';
  if (/info|blue|neutral|normal/.test(hint)) return 'info';

  return undefined;
};

const parseStatusColor = (element: HTMLElement): string | undefined => {
  const inlineColor = element.style.backgroundColor;
  const computedColor = getComputedStyle(element).backgroundColor;
  const color = inlineColor || computedColor;

  if (!color || color === 'transparent' || color === 'rgba(0, 0, 0, 0)') return undefined;
  return color;
};

const readStatus = (
  selector: string
): { text?: string; statusVariant?: RadarStatusVariant; statusColor?: string } => {
  const element = readStatusElement(selector);
  if (!element) return {};

  const text = element.textContent?.trim() || undefined;
  const statusVariant = parseStatusVariant(element);
  const statusColor = parseStatusColor(element);

  return { text, statusVariant, statusColor };
};

const buildSnapshot = (): RadarSnapshot | null => {
  const counters: RadarCounters = {
    ok: parseCounter(SELECTORS.ok),
    pending: parseCounter(SELECTORS.pending),
    internalError: parseCounter(SELECTORS.internalError)
  };

  const { text: statusText, statusColor, statusVariant } = readStatus(SELECTORS.status);
  const hasCounters = Object.values(counters).some((value) => value !== undefined);

  if (!hasCounters && !statusText) {
    return null; // Avoid spamming empty payloads if the DOM has not rendered yet
  }

  return {
    counters,
    statusText,
    statusColor,
    statusVariant,
    lastUpdated: Date.now()
  };
};

const emitSnapshot = () => {
  const snapshot = buildSnapshot();
  if (!snapshot) return;

  const serialized = JSON.stringify(snapshot);
  if (serialized === lastPayload) return;

  lastPayload = serialized;
  ipcRenderer.send(IPC_CHANNELS.RADAR_DATA, snapshot);
  ipcRenderer.sendToHost(IPC_CHANNELS.RADAR_DATA, snapshot);
};

let emitTimeout: number | null = null;

const scheduleEmitSnapshot = () => {
  if (emitTimeout !== null) return;

  emitTimeout = window.setTimeout(() => {
    emitTimeout = null;
    emitSnapshot();
  }, 200);
};

const startObserving = () => {
  const target = document.body;
  if (!target) {
    setTimeout(startObserving, 250);
    return;
  }

  emitSnapshot();

  const observer = new MutationObserver(() => {
    scheduleEmitSnapshot();
  });

  observer.observe(target, { childList: true, subtree: true, characterData: true });

  // Safety net in case mutations are throttled or missed
  const interval = setInterval(emitSnapshot, 5000);

  window.addEventListener('beforeunload', () => {
    observer.disconnect();
    clearInterval(interval);
  });
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  startObserving();
} else {
  window.addEventListener('DOMContentLoaded', startObserving);
}
