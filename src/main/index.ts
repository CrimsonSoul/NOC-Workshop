import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import fs from 'fs';
import { FileManager } from './FileManager';
import { BridgeLogger } from './BridgeLogger';
import { IPC_CHANNELS } from '../shared/ipc';
import { ensureDataFiles, loadConfig, saveConfig } from './dataUtils';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;
let bridgeLogger: BridgeLogger | null = null;
let currentDataRoot: string = '';

// Auth State
let authCallback: ((username: string, password: string) => void) | null = null;

// Helpers
const getDefaultDataPath = () => {
  return join(app.getPath('userData'), 'data');
};

const getBundledDataPath = () => {
  return app.isPackaged
    ? join(process.resourcesPath, 'data')
    : join(process.cwd(), 'data');
};

function getDataRoot() {
  // Check config first
  const config = loadConfig();
  const bundledPath = getBundledDataPath();
  if (config.dataRoot) {
    // Ensure the configured directory exists and has the required files. If the
    // directory was removed between sessions, recreate it and hydrate from the
    // bundled defaults so the app can still start cleanly.
    ensureDataFiles(config.dataRoot, bundledPath, app.isPackaged);
    return config.dataRoot;
  }

  // Default to AppData
  const defaultDataPath = getDefaultDataPath();

  ensureDataFiles(defaultDataPath, bundledPath, app.isPackaged);
  return defaultDataPath;
}

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];

const resolveDataFile = (root: string, candidates: string[]) => {
  for (const file of candidates) {
    const fullPath = join(root, file);
    if (fs.existsSync(fullPath)) return fullPath;
  }

  return join(root, candidates[0]);
};

const groupsFilePath = () => resolveDataFile(currentDataRoot, GROUP_FILES);
const contactsFilePath = () => resolveDataFile(currentDataRoot, CONTACT_FILES);

async function createWindow(dataRoot: string) {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0b0d12',
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webviewTag: true
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    await mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const indexHtml = join(__dirname, '../renderer/index.html');
    await mainWindow.loadFile(indexHtml);
  }

  fileManager = new FileManager(mainWindow, dataRoot);
  bridgeLogger = new BridgeLogger(dataRoot);

  mainWindow.on('closed', () => {
    mainWindow = null;
    fileManager = null;
    bridgeLogger = null;
  });
}

function copyFilesIfMissing(sourceRoot: string, targetRoot: string) {
  const essentialFiles = ['contacts.csv', 'groups.csv', 'history.json'];
  let filesCopied = false;

  // Ensure target exists
  if (!fs.existsSync(targetRoot)) {
    try { fs.mkdirSync(targetRoot, { recursive: true }); } catch (e) { console.error(e); }
  }

  for (const file of essentialFiles) {
      const source = join(sourceRoot, file);
      const target = join(targetRoot, file);
      // Only copy if target DOES NOT exist
      if (!fs.existsSync(target)) {
          // Try sourceRoot
          if (fs.existsSync(source)) {
              try {
                  fs.copyFileSync(source, target);
                  filesCopied = true;
                  console.log(`Copied ${file} from ${sourceRoot} to ${targetRoot}`);
              } catch (e) {
                  console.error(`Failed to copy ${file}:`, e);
              }
          } else {
             // Fallback to bundle if sourceRoot fails
             const bundled = join(getBundledDataPath(), file);
             if (fs.existsSync(bundled)) {
                 try {
                     fs.copyFileSync(bundled, target);
                     filesCopied = true;
                     console.log(`Copied ${file} from bundle to ${targetRoot}`);
                 } catch (e) {
                     console.error(`Failed to copy bundled ${file}:`, e);
                 }
             }
          }
      }
  }
  return filesCopied;
}

function handleDataPathChange(newPath: string) {
    if (!mainWindow) return;

    // 1. Ensure files exist in new location (copy from OLD location if missing)
    copyFilesIfMissing(currentDataRoot, newPath);

    // As a fallback, hydrate from bundled defaults so empty/reset folders still work
    ensureDataFiles(newPath, getBundledDataPath(), app.isPackaged);

    // 2. Update Config
    saveConfig({ dataRoot: newPath });
    currentDataRoot = newPath;

    // 3. Hot Swap FileManager and Logger
    if (fileManager) {
        fileManager.destroy();
        fileManager = null;
    }
    fileManager = new FileManager(mainWindow, currentDataRoot);

    // BridgeLogger doesn't have a destroy method but it's just a class wrapper usually.
    // If it has state or watchers, we might need to look at it.
    // Assuming simple instantiation for now.
    bridgeLogger = new BridgeLogger(currentDataRoot);

    // 4. Force read to update UI
    fileManager.readAndEmit();
}

function setupIpc() {
  // Config IPCs
  ipcMain.handle(IPC_CHANNELS.GET_DATA_PATH, async () => {
    return currentDataRoot;
  });

  ipcMain.handle(IPC_CHANNELS.CHANGE_DATA_FOLDER, async () => {
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select New Data Folder',
      properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return false;

    handleDataPathChange(filePaths[0]);
    return true;
  });

  ipcMain.handle(IPC_CHANNELS.RESET_DATA_FOLDER, async () => {
      const defaultPath = getDefaultDataPath();
      // If already on default, do nothing or just reload?
      // User might want to "repair" default.
      // But mainly used to switch back.

      handleDataPathChange(defaultPath);
      return true;
  });

  // FS IPCs
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(groupsFilePath());
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(contactsFilePath());
  });

  // Import Handlers (Now Merging)
  const handleMergeImport = async (type: 'groups' | 'contacts', title: string) => {
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
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.DATA_RELOAD, async () => {
    fileManager?.readAndEmit();
  });

  ipcMain.on(IPC_CHANNELS.AUTH_SUBMIT, (_event, { username, password }) => {
    if (authCallback) {
      authCallback(username, password);
      authCallback = null;
    }
  });

  ipcMain.on(IPC_CHANNELS.AUTH_CANCEL, () => {
    authCallback = null;
  });

  ipcMain.on(IPC_CHANNELS.RADAR_DATA, (_event, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.RADAR_DATA, payload);
    }
  });

  ipcMain.on(IPC_CHANNELS.LOG_BRIDGE, (_event, groups: string[]) => {
    bridgeLogger?.logBridge(groups);
  });

  ipcMain.handle(IPC_CHANNELS.GET_METRICS, async () => {
    return bridgeLogger?.getMetrics();
  });

  // --- Data Mutation Handlers ---

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT, async (_event, contact) => {
    return fileManager?.addContact(contact) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_GROUP, async (_event, groupName) => {
    return fileManager?.addGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT_TO_GROUP, async (_event, groupName, email) => {
    return fileManager?.updateGroupMembership(groupName, email, false) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_CONTACT_FROM_GROUP, async (_event, groupName, email) => {
    return fileManager?.updateGroupMembership(groupName, email, true) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_GROUP, async (_event, groupName) => {
    return fileManager?.removeGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_WITH_MAPPING, async () => {
    // Re-use logic or call directly
    return handleMergeImport('contacts', 'Merge Contacts CSV');
  });

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    mainWindow?.minimize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    mainWindow?.close();
  });
}

// Auth Interception
app.on('login', (event, _webContents, _request, authInfo, callback) => {
  event.preventDefault(); // Stop default browser popup

  // Store callback to use later
  authCallback = callback;

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC_CHANNELS.AUTH_REQUESTED, {
      host: authInfo.host,
      isProxy: authInfo.isProxy
    });
  }
});

  app.whenReady().then(async () => {
    currentDataRoot = getDataRoot();
    setupIpc();
    await createWindow(currentDataRoot);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(currentDataRoot);
      }
    });
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
