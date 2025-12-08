import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { join } from 'path';
import fs from 'fs';
import { FileManager } from './FileManager';
import { BridgeLogger } from './BridgeLogger';
import { IPC_CHANNELS } from '../shared/ipc';
import { copyDataFiles, ensureDataFiles, loadConfig, saveConfig } from './dataUtils';
import { setupIpcHandlers } from './ipcHandlers';

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
      sandbox: true,
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

  // Security: Restrict WebView navigation
  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
      // Strip away preload scripts if they are not ours
      delete webPreferences.preload;

      // Disable Node integration in WebView (it should be off by default but explicit is good)
      webPreferences.nodeIntegration = false;
      webPreferences.contextIsolation = true;

      // Verify URL (Basic check)
      if (params.src && !params.src.startsWith('http')) {
          console.warn(`[Security] Blocked WebView navigation to non-http URL: ${params.src}`);
          event.preventDefault();
      }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    fileManager = null;
    bridgeLogger = null;
  });
}

function handleDataPathChange(newPath: string) {
    if (!mainWindow) return;

    // 1. Ensure files exist in new location (copy from OLD location if missing)
    copyDataFiles(currentDataRoot, newPath, getBundledDataPath());

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
  setupIpcHandlers(
    () => mainWindow,
    () => fileManager,
    () => bridgeLogger,
    () => currentDataRoot,
    handleDataPathChange,
    getDefaultDataPath
  );

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
