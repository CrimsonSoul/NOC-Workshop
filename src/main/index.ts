import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { dirname, join } from 'path';
import fs from 'fs';
import { FileManager } from './FileManager';
import { IPC_CHANNELS } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;

// Auth State
let authCallback: ((username: string, password: string) => void) | null = null;

function getDataRoot() {
  if (!app.isPackaged) {
    const appPath = app.getAppPath();
    if (appPath.includes('dist')) {
      return join(appPath, '..', '..', 'resources');
    }
    return join(appPath, 'resources');
  }

  const executableDir = process.env.PORTABLE_EXECUTABLE_DIR || dirname(process.execPath);
  const portableDataPath = join(executableDir, 'data');

  if (fs.existsSync(portableDataPath)) {
    return portableDataPath;
  }

  return join(process.resourcesPath, 'resources');
}

const GROUP_FILES = ['groups.csv', 'groups.xlsx'];
const CONTACT_FILES = ['contacts.csv', 'contacts.xlsx'];

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
      sandbox: false
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

  mainWindow.on('closed', () => {
    mainWindow = null;
    fileManager = null;
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
