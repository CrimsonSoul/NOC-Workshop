import { ipcMain, dialog, shell } from 'electron';
import { BrowserWindow } from 'electron';
import { join, relative, isAbsolute } from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../shared/ipc';
import { FileManager } from './FileManager';
import { BridgeLogger } from './BridgeLogger';

export function setupIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  getFileManager: () => FileManager | null,
  getBridgeLogger: () => BridgeLogger | null,
  getDataRoot: () => string,
  onDataPathChange: (newPath: string) => void,
  getDefaultDataPath: () => string
) {
  // Config IPCs
  ipcMain.handle(IPC_CHANNELS.GET_DATA_PATH, async () => {
    return getDataRoot();
  });

  ipcMain.handle(IPC_CHANNELS.CHANGE_DATA_FOLDER, async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select New Data Folder',
      properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };

    try {
      onDataPathChange(filePaths[0]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RESET_DATA_FOLDER, async () => {
    const defaultPath = getDefaultDataPath();
    try {
      onDataPathChange(defaultPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Helper for path validation
  const validatePath = (requestedPath: string) => {
    const root = getDataRoot();
    if (!requestedPath || !root) return false;

    // Resolve absolute path
    const absPath = isAbsolute(requestedPath) ? requestedPath : join(root, requestedPath);

    // Check if it is inside root
    const rel = relative(root, absPath);
    return !rel.startsWith('..') && !isAbsolute(rel);
  };

  // FS IPCs
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    if (!validatePath(path)) {
      console.error(`Blocked access to path outside data root: ${path}`);
      return;
    }
    await shell.openPath(path);
  });

  const getGroupsFilePath = () => {
    const root = getDataRoot();
    const candidates = ['groups.csv'];
    for (const file of candidates) {
        const fullPath = join(root, file);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return join(root, candidates[0]);
  };

  const getContactsFilePath = () => {
    const root = getDataRoot();
    const candidates = ['contacts.csv'];
    for (const file of candidates) {
        const fullPath = join(root, file);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return join(root, candidates[0]);
  };

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(getGroupsFilePath());
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(getContactsFilePath());
  });

  // Import Handlers
  const handleMergeImport = async (type: 'groups' | 'contacts', title: string) => {
    const mainWindow = getMainWindow();
    const fileManager = getFileManager();
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return false;

    if (type === 'contacts') {
        return fileManager?.importContactsWithMapping(filePaths[0]) ?? false;
    } else {
        return fileManager?.importGroupsWithMapping(filePaths[0]) ?? false;
    }
  };

  ipcMain.handle(IPC_CHANNELS.IMPORT_GROUPS_FILE, async () => {
    return handleMergeImport('groups', 'Merge Groups CSV');
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_FILE, async () => {
    return handleMergeImport('contacts', 'Merge Contacts CSV');
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
    // Basic protocol validation
    if (!url.match(/^(https?|mailto):/i)) {
      console.error(`Blocked opening external URL with unsafe protocol: ${url}`);
      return;
    }
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.DATA_RELOAD, async () => {
    getFileManager()?.readAndEmit();
  });

  let authCallback: ((username: string, password: string) => void) | null = null;
  // Note: we can't easily move the app.on('login') handler here without passing app.
  // But we can handle the IPCs related to auth.

  // Auth IPCs are handled in index.ts because they require access to the authCallback closure

  // Actually, let's keep AUTH in index.ts for now as it's tied to app lifecycle events.
  // Or we can expose a function to register the callback.

  ipcMain.on(IPC_CHANNELS.RADAR_DATA, (_event, payload) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.RADAR_DATA, payload);
    }
  });

  ipcMain.on(IPC_CHANNELS.LOG_BRIDGE, (_event, groups: string[]) => {
    getBridgeLogger()?.logBridge(groups);
  });

  ipcMain.handle(IPC_CHANNELS.GET_METRICS, async () => {
    return getBridgeLogger()?.getMetrics();
  });

  // --- Data Mutation Handlers ---

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT, async (_event, contact) => {
    return getFileManager()?.addContact(contact) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_CONTACT, async (_event, email) => {
    return getFileManager()?.removeContact(email) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_GROUP, async (_event, groupName) => {
    return getFileManager()?.addGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT_TO_GROUP, async (_event, groupName, email) => {
    return getFileManager()?.updateGroupMembership(groupName, email, false) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_CONTACT_FROM_GROUP, async (_event, groupName, email) => {
    return getFileManager()?.updateGroupMembership(groupName, email, true) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_GROUP, async (_event, groupName) => {
    return getFileManager()?.removeGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.RENAME_GROUP, async (_event, oldName, newName) => {
    return getFileManager()?.renameGroup(oldName, newName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_WITH_MAPPING, async () => {
    return handleMergeImport('contacts', 'Merge Contacts CSV');
  });

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    getMainWindow()?.minimize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const mw = getMainWindow();
    if (mw?.isMaximized()) {
      mw.unmaximize();
    } else {
      mw?.maximize();
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    getMainWindow()?.close();
  });
}
