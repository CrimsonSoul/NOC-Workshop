/// <reference types="vite/client" />

import type { BridgeAPI } from '@shared/ipc';

declare global {
  interface Window {
    api?: BridgeAPI;
  }
}

export {};
