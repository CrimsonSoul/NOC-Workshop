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
  // Multiple fallbacks to accommodate the XCenter Counts panel markup
  ok:
    '#xcenter-ok, [data-xcenter-counter="ok"], [data-counter="ok"], [data-counter-ok], .xcenter-ok .value, .ok .counter-value, [data-testid="xcenter-count-ok"], [data-xcenter-count="ok"]',
  pending:
    '#xcenter-pending, [data-xcenter-counter="pending"], [data-counter="pending"], [data-counter-pending], .xcenter-pending .value, .pending .counter-value, [data-testid="xcenter-count-pending"], [data-xcenter-count="pending"]',
  internalError:
    '#xcenter-internal-error, #xcenter-internalError, [data-xcenter-counter="internal-error"], [data-xcenter-counter="internalError"], [data-counter="internalError"], [data-counter-internal-error], [data-counter-internalError], .xcenter-internal-error .value, .internal-error .counter-value, [data-testid="xcenter-count-internal-error"], [data-xcenter-count="internal-error"]',
  countsPanel: '#xcenter-counts, [data-xcenter-counts], [data-testid="xcenter-counts"], [aria-label*="XCenter Counts" i], .xcenter-counts, .counts-panel',
  status: '#xcenter-status, [data-xcenter-status], .xcenter-status, .status-banner'
};

let lastPayload: string | null = null;

const numberPattern = /-?\d+(?:\.\d+)?/;

const parseNumericValue = (value?: string | null): number | undefined => {
  if (!value) return undefined;

  const match = value.match(numberPattern);
  if (!match) return undefined;

  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? undefined : parsed;
};

const parseNumberFromElement = (element: Element): number | undefined => {
  const candidates = ['data-count', 'data-value', 'data-total', 'data-number', 'aria-label', 'title'];

  for (const attr of candidates) {
    const parsed = parseNumericValue(element.getAttribute(attr));
    if (parsed !== undefined) return parsed;
  }

  for (const attr of Array.from(element.attributes)) {
    const parsed = parseNumericValue(attr.value);
    if (parsed !== undefined) return parsed;
  }

  const directText = parseNumericValue(element.textContent?.trim());
  if (directText !== undefined) return directText;

  const descendants = element.querySelectorAll('[data-count], [data-value], [data-total], [data-number], [aria-label], [title], span');
  for (const descendant of Array.from(descendants)) {
    for (const attr of candidates) {
      const parsed = parseNumericValue(descendant.getAttribute(attr));
      if (parsed !== undefined) return parsed;
    }

    for (const attr of Array.from(descendant.attributes)) {
      const parsed = parseNumericValue(attr.value);
      if (parsed !== undefined) return parsed;
    }

    const descendantText = parseNumericValue(descendant.textContent?.trim());
    if (descendantText !== undefined) return descendantText;
  }

  return undefined;
};

const parseNumber = (selector: string): number | undefined => {
  const element = document.querySelector(selector);
  if (!element) return undefined;

  return parseNumberFromElement(element);
};

const readStatusElement = (selector: string): HTMLElement | null => {
  return document.querySelector(selector);
};

const parseCounterFromPanel = (labelPattern: RegExp): number | undefined => {
  const panels = document.querySelectorAll(SELECTORS.countsPanel);

  for (const panel of Array.from(panels)) {
    const labelCandidates = panel.querySelectorAll('*');

    for (const label of Array.from(labelCandidates)) {
      const text = label.textContent?.trim();
      if (!text || !labelPattern.test(text)) continue;

      const labelValue = parseNumericValue(text);
      if (labelValue !== undefined) return labelValue;

      const directValue = parseNumberFromElement(label);
      if (directValue !== undefined) return directValue;

      const parent = label.parentElement;
      if (!parent) continue;

      const siblings = Array.from(parent.children).filter((child) => child !== label);

      for (const sibling of siblings) {
        const parsed = parseNumberFromElement(sibling);
        if (parsed !== undefined) return parsed;
      }

      const parentValue = parseNumberFromElement(parent);
      if (parentValue !== undefined) return parentValue;
    }
  }

  return undefined;
};

const parseCounter = (selector: string, labelPattern: RegExp): number | undefined => {
  const parsed = parseNumber(selector);
  if (parsed !== undefined) return parsed;

  return parseCounterFromPanel(labelPattern);
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
    ok: parseCounter(SELECTORS.ok, /\bok\b/i),
    pending: parseCounter(SELECTORS.pending, /\bpending\b/i),
    internalError: parseCounter(SELECTORS.internalError, /internal\s*error/i)
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

const startObserving = () => {
  const target = document.body;
  if (!target) {
    setTimeout(startObserving, 250);
    return;
  }

  emitSnapshot();

  const observer = new MutationObserver(() => {
    emitSnapshot();
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
