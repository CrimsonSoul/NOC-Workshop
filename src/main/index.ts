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

function getDataRoot() {
  // Check config first
  const config = loadConfig();
  if (config.dataRoot && fs.existsSync(config.dataRoot)) {
    return config.dataRoot;
  }

  // Default to AppData
  const defaultDataPath = join(app.getPath('userData'), 'data');
  const bundledPath = app.isPackaged
    ? join(process.resourcesPath, 'data')
    : join(process.cwd(), 'data');

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

const groupsFilePath = (root: string) => resolveDataFile(root, GROUP_FILES);
const contactsFilePath = (root: string) => resolveDataFile(root, CONTACT_FILES);

async function createWindow(dataRoot: string) {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 1080,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#0b0d12',
    titleBarStyle: 'hiddenInset',
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

function setupIpc(dataRoot: string) {
  // Config IPCs
  ipcMain.handle(IPC_CHANNELS.GET_DATA_PATH, async () => {
    return dataRoot;
  });

  ipcMain.handle(IPC_CHANNELS.CHANGE_DATA_FOLDER, async () => {
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select New Data Folder',
      properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return false;

    const newPath = filePaths[0];

    // Copy current files if target is empty/missing key files
    const essentialFiles = ['contacts.csv', 'groups.csv', 'history.json'];
    let filesCopied = false;

    for (const file of essentialFiles) {
        const source = join(dataRoot, file);
        const target = join(newPath, file);
        if (fs.existsSync(source) && !fs.existsSync(target)) {
            try {
                fs.copyFileSync(source, target);
                filesCopied = true;
            } catch (e) {
                console.error(`Failed to copy ${file} to new location:`, e);
            }
        }
    }

    if (filesCopied) {
        console.log('Copied existing data files to new location.');
    }

    // Save config
    saveConfig({ dataRoot: newPath });

    // Relaunch
    app.relaunch();
    app.exit();
    return true;
  });

  // FS IPCs
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(groupsFilePath(dataRoot));
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(contactsFilePath(dataRoot));
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

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_WITH_MAPPING, async () => {
    // Re-use logic or call directly
    return handleMergeImport('contacts', 'Merge Contacts CSV');
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
    setupIpc(currentDataRoot);
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
