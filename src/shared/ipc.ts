export type BridgeAPI = {
  openPath: (path: string) => Promise<void>;
  watchDirectory: (path: string) => Promise<void>;
  listFiles: (path: string) => Promise<string[]>;
  onDirectoryChanged: (callback: (payload: DirectoryChange) => void) => void;
};

export type DirectoryChange = {
  event: 'add' | 'change' | 'unlink';
  path: string;
};

export const IPC_CHANNELS = {
  OPEN_PATH: 'fs:openPath',
  WATCH_DIRECTORY: 'fs:watchDirectory',
  LIST_FILES: 'fs:listFiles',
  DIRECTORY_CHANGED: 'fs:directoryChanged'
} as const;
