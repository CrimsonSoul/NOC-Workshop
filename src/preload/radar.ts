import { ipcRenderer } from 'electron';
import { IPC_CHANNELS, type RadarCounters, type RadarSnapshot } from '@shared/ipc';

type CounterSpec = {
  key: keyof RadarCounters;
  selectors: string[];
  labelPatterns: RegExp[];
};

const COUNTER_SPECS: CounterSpec[] = [
  {
    key: 'ready',
    selectors: [
      '#xcenter-ready',
      '[data-xcenter-counter="ready"]',
      '[data-counter-ready]',
      '[data-counter="ready"]',
      '.xcenter-ready .value',
      '.ready .counter-value',
      '.ready-now .counter-value',
      '.ready-now .value'
    ],
    labelPatterns: [/ready now/i, /ready/i]
  },
  {
    key: 'holding',
    selectors: [
      '#xcenter-holding',
      '[data-xcenter-counter="holding"]',
      '[data-counter-hold]',
      '[data-counter="holding"]',
      '.xcenter-holding .value',
      '.holding .counter-value',
      '.on-hold .counter-value'
    ],
    labelPatterns: [/on hold/i, /holding/i, /hold/i]
  },
  {
    key: 'inProgress',
    selectors: [
      '#xcenter-inprogress',
      '[data-xcenter-counter="inprogress"]',
      '[data-counter="inprogress"]',
      '.xcenter-active .value',
      '.active .counter-value',
      '.in-progress .counter-value',
      '.in-progress .value'
    ],
    labelPatterns: [/in progress/i, /in-process/i, /progress/i]
  },
  {
    key: 'waiting',
    selectors: [
      '#xcenter-waiting',
      '[data-xcenter-counter="waiting"]',
      '[data-counter="waiting"]',
      '.xcenter-queue .value',
      '.queue .counter-value',
      '.waiting .counter-value'
    ],
    labelPatterns: [/waiting/i, /queue/i]
  }
];

const STATUS_SELECTORS = [
  '#xcenter-status',
  '[data-xcenter-status]',
  '.xcenter-status',
  '.status-banner',
  '.status-bar',
  '.banner.status'
];

let lastPayload: string | null = null;

const parseNumberFromElement = (element: Element | null): number | undefined => {
  if (!element) return undefined;

  const attributesToCheck = ['data-value', 'data-count', 'data-number', 'aria-label'];
  for (const attr of attributesToCheck) {
    const attrValue = element.getAttribute(attr);
    if (attrValue) {
      const match = attrValue.match(/-?\d+(?:\.\d+)?/);
      if (match) {
        const numeric = Number(match[0]);
        if (!Number.isNaN(numeric)) return numeric;
      }
    }
  }

  const match = element.textContent?.match(/-?\d+(?:\.\d+)?/);
  if (!match) return undefined;

  const value = Number(match[0]);
  return Number.isNaN(value) ? undefined : value;
};

const parseNumberWithFallbacks = (spec: CounterSpec): number | undefined => {
  for (const selector of spec.selectors) {
    const value = parseNumberFromElement(document.querySelector(selector));
    if (value !== undefined) return value;
  }

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  const candidates: Element[] = [];

  while (walker.nextNode()) {
    const node = walker.currentNode as Element;
    const text = node.textContent?.trim();
    if (!text) continue;

    if (spec.labelPatterns.some((pattern) => pattern.test(text))) {
      candidates.push(node);
    }
  }

  for (const candidate of candidates) {
    // Try the candidate itself
    const selfValue = parseNumberFromElement(candidate);
    if (selfValue !== undefined) return selfValue;

    // Try its immediate siblings
    const nextValue = parseNumberFromElement(candidate.nextElementSibling);
    if (nextValue !== undefined) return nextValue;

    // Try parent container numbers
    const parentValue = parseNumberFromElement(candidate.parentElement);
    if (parentValue !== undefined) return parentValue;
  }

  return undefined;
};

const readStatus = (): { text?: string; color?: string } => {
  for (const selector of STATUS_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;

    const text = element.textContent?.trim();
    const computedStyle = window.getComputedStyle(element);
    const backgroundImage = computedStyle.backgroundImage && computedStyle.backgroundImage !== 'none'
      ? computedStyle.backgroundImage
      : element.style.backgroundImage;
    const backgroundColor = computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
      ? computedStyle.backgroundColor
      : element.style.backgroundColor;

    return {
      text: text || undefined,
      color: backgroundImage || backgroundColor || undefined
    };
  }

  return {};
};

const buildSnapshot = (): RadarSnapshot | null => {
  const counters = COUNTER_SPECS.reduce<RadarCounters>((acc, spec) => {
    acc[spec.key] = parseNumberWithFallbacks(spec);
    return acc;
  }, {} as RadarCounters);

  const { text: statusText, color: statusColor } = readStatus();
  const hasCounters = Object.values(counters).some((value) => value !== undefined);

  if (!hasCounters && !statusText) {
    return null; // Avoid spamming empty payloads if the DOM has not rendered yet
  }

  return {
    counters,
    statusText,
    statusColor,
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
