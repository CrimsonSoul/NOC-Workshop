import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { dirname, join } from 'path';
import fs from 'fs';
import { FileManager } from './FileManager';
import { BridgeLogger } from './BridgeLogger';
import { IPC_CHANNELS } from '../shared/ipc';
import { ensureDataFiles } from './dataUtils';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;
let bridgeLogger: BridgeLogger | null = null;

// Auth State
let authCallback: ((username: string, password: string) => void) | null = null;

function getDataRoot() {
  if (!app.isPackaged) {
    return join(process.cwd(), 'data');
  }

  const executableDir = process.env.PORTABLE_EXECUTABLE_DIR || dirname(process.execPath);
  const portableDataPath = join(executableDir, 'data');

  ensureDataFiles(portableDataPath, join(process.resourcesPath, 'data'), app.isPackaged);

  return portableDataPath;
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
    // In production, electron-builder packs renderer to dist/renderer
    // The environment variable MAIN_WINDOW_DIST usually points to dist/renderer/index.html's parent
    // but verifying it's set correctly by electron-vite.
    // If we assume standard electron-vite behavior:
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
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(groupsFilePath(dataRoot));
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(contactsFilePath(dataRoot));
  });

  const handleImport = async (targetFileName: string, title: string) => {
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return false;

    const sourcePath = filePaths[0];
    const targetPath = join(dataRoot, targetFileName);

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      buttons: ['Cancel', 'Replace'],
      defaultId: 0,
      title: 'Confirm Replace',
      message: `Are you sure you want to replace ${targetFileName}?`,
      detail: 'This action cannot be undone.',
      cancelId: 0
    });

    if (response === 1) {
      try {
        // Ensure data directory exists (it might not if using portable logic but folder deleted)
        // Also ensure other required files are present to keep the dataset valid
        // We need to pass bundled path again, constructing it:
        const bundledPath = app.isPackaged ? join(process.resourcesPath, 'data') : join(process.cwd(), 'data');
        ensureDataFiles(dataRoot, bundledPath, app.isPackaged);

        fs.copyFileSync(sourcePath, targetPath);
        fileManager?.readAndEmit();
        return true;
      } catch (error) {
        console.error(`Failed to import ${targetFileName}:`, error);
        dialog.showErrorBox('Import Failed', `Could not replace file: ${error}`);
        return false;
      }
    }
    return false;
  };

  ipcMain.handle(IPC_CHANNELS.IMPORT_GROUPS_FILE, async () => {
    return handleImport('groups.csv', 'Import Groups CSV');
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_FILE, async () => {
    return handleImport('contacts.csv', 'Import Contacts CSV');
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
    const dataRoot = getDataRoot();
    setupIpc(dataRoot);
    await createWindow(dataRoot);

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow(dataRoot);
      }
    });
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
