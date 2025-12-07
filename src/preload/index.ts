import { contextBridge, ipcRenderer } from 'electron';
import { fileURLToPath } from 'node:url';
import { IPC_CHANNELS, type BridgeAPI, type AppData, type AuthRequest, type RadarSnapshot, type MetricsData } from '@shared/ipc';

const radarPreloadPath = fileURLToPath(new URL('./radar.mjs', import.meta.url));

const api: BridgeAPI = {
  openPath: (path) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_PATH, path),
  openExternal: (url) => ipcRenderer.invoke(IPC_CHANNELS.OPEN_EXTERNAL, url),
  openGroupsFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_GROUPS_FILE),
  openContactsFile: () => ipcRenderer.invoke(IPC_CHANNELS.OPEN_CONTACTS_FILE),
  importGroupsFile: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_GROUPS_FILE),
  importContactsFile: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CONTACTS_FILE),

  subscribeToData: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.DATA_UPDATED);
    ipcRenderer.on(IPC_CHANNELS.DATA_UPDATED, (_event, data: AppData) => {
      callback(data);
    });
  },

  onReloadStart: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.DATA_RELOAD_STARTED);
    ipcRenderer.on(IPC_CHANNELS.DATA_RELOAD_STARTED, () => {
      callback();
    });
  },

  onReloadComplete: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.DATA_RELOAD_COMPLETED);
    ipcRenderer.on(IPC_CHANNELS.DATA_RELOAD_COMPLETED, (_event, success: boolean) => {
      callback(success);
    });
  },

  reloadData: () => ipcRenderer.invoke(IPC_CHANNELS.DATA_RELOAD),

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
  },

  subscribeToRadar: (callback) => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.RADAR_DATA);
    ipcRenderer.on(IPC_CHANNELS.RADAR_DATA, (_event, data: RadarSnapshot) => {
      callback(data);
    });
  },

  radarPreloadPath,

  logBridge: (groups) => ipcRenderer.send(IPC_CHANNELS.LOG_BRIDGE, groups),
  getMetrics: () => ipcRenderer.invoke(IPC_CHANNELS.GET_METRICS),
  addContact: (contact) => ipcRenderer.invoke(IPC_CHANNELS.ADD_CONTACT, contact),
  removeContact: (email) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_CONTACT, email),
  addGroup: (groupName) => ipcRenderer.invoke(IPC_CHANNELS.ADD_GROUP, groupName),
  addContactToGroup: (groupName, email) => ipcRenderer.invoke(IPC_CHANNELS.ADD_CONTACT_TO_GROUP, groupName, email),
  removeContactFromGroup: (groupName, email) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_CONTACT_FROM_GROUP, groupName, email),
  importContactsWithMapping: () => ipcRenderer.invoke(IPC_CHANNELS.IMPORT_CONTACTS_WITH_MAPPING),
  changeDataFolder: () => ipcRenderer.invoke(IPC_CHANNELS.CHANGE_DATA_FOLDER),
  resetDataFolder: () => ipcRenderer.invoke(IPC_CHANNELS.RESET_DATA_FOLDER),
  getDataPath: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DATA_PATH),
  removeGroup: (groupName) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_GROUP, groupName),
  windowMinimize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MINIMIZE),
  windowMaximize: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_MAXIMIZE),
  windowClose: () => ipcRenderer.send(IPC_CHANNELS.WINDOW_CLOSE)
};

contextBridge.exposeInMainWorld('api', api);
