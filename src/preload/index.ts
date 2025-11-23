import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS, type BridgeAPI, type AppData, type AuthRequest } from '@shared/ipc';

const api: BridgeAPI = {
  openPath: (path) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),

  subscribeToData: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.DATA_UPDATED);
    ipcRenderer.on(IPC_CHANNELS.DATA_UPDATED, (_event, data: AppData) => {
      callback(data);
    });
  },

  onAuthRequested: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.AUTH_REQUESTED);
    ipcRenderer.on(IPC_CHANNELS.AUTH_REQUESTED, (_event, request: AuthRequest) => {
      callback(request);
    });
  },

  submitAuth: (username, password) => {
    ipcRenderer.send(IPC_CHANNELS.AUTH_SUBMIT, { username, password });
  },

  cancelAuth: () => {
    ipcRenderer.send(IPC_CHANNELS.AUTH_CANCEL);
  }
};

contextBridge.exposeInMainWorld('api', api);
