/// <reference types="vite/client" />

import type { BridgeAPI } from '@shared/ipc';
import type { WebviewTag } from 'electron';
import type React from 'react';

declare global {
  interface Window {
    api?: BridgeAPI;
  }

  namespace JSX {
    interface IntrinsicElements {
      webview: React.DetailedHTMLProps<React.HTMLAttributes<WebviewTag>, WebviewTag> & {
        src: string;
        preload?: string;
        allowpopups?: boolean;
        partition?: string;
      };
    }
  }
}

export {};
