import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type BridgeAPI, type DirectoryChange } from '@shared/ipc';

const api: BridgeAPI = {
  openPath: (path) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
  watchDirectory: (path) => ipcRenderer.invoke(IPC_CHANNELS.WATCH_DIRECTORY, path),
  listFiles: (path) => ipcRenderer.invoke(IPC_CHANNELS.LIST_FILES, path),
  onDirectoryChanged: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.DIRECTORY_CHANGED);
    ipcRenderer.on(IPC_CHANNELS.DIRECTORY_CHANGED, (_event, payload: DirectoryChange) => {
      callback(payload);
    });
  }
};

contextBridge.exposeInMainWorld('api', api);
