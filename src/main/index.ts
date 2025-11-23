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
    width: 1400,
    height: 900,
    backgroundColor: '#0b0d12', // Obsidian
    titleBarStyle: 'hiddenInset', // polished look on mac
    webPreferences: {
      preload: process.env.MAIN_WINDOW_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // needed for some preload things sometimes, but false is safer usually. keeping false unless needed.
    }
  });

  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexHtml = join(process.env.MAIN_WINDOW_DIST || '', 'index.html');
    await mainWindow.loadFile(indexHtml);
  }

  // Initialize FileManager
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

  ipcMain.on(IPC_CHANNELS.AUTH_SUBMIT, (_event, { username, password }) => {
    if (authCallback) {
      authCallback(username, password);
      authCallback = null;
    }
  });

  ipcMain.on(IPC_CHANNELS.AUTH_CANCEL, () => {
    // If canceled, we might just call with empty or fail it?
    // Usually cancelling the prompt means just let it fail or do nothing.
    // We'll reset the callback.
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
