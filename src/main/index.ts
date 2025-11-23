import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { FileManager } from './FileManager';
import { IPC_CHANNELS } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;

// Auth State
let authCallback: ((username: string, password: string) => void) | null = null;

async function createWindow() {
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

  fileManager = new FileManager(mainWindow);

  mainWindow.on('closed', () => {
    mainWindow = null;
    fileManager = null;
  });
}

function setupIpc() {
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
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
  setupIpc();
  await createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
