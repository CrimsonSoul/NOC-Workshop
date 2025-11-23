import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join } from 'path';
import { readdir } from 'fs/promises';
import chokidar from 'chokidar';
import { IPC_CHANNELS, type DirectoryChange } from '@shared/ipc';

let mainWindow: BrowserWindow | null = null;
let watcher: chokidar.FSWatcher | null = null;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: process.env.MAIN_WINDOW_PRELOAD,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    await mainWindow.loadURL(process.env.MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    const indexHtml = join(process.env.MAIN_WINDOW_DIST || '', 'index.html');
    await mainWindow.loadFile(indexHtml);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupIpc() {
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
  });

  ipcMain.handle(IPC_CHANNELS.WATCH_DIRECTORY, async (event, path: string) => {
    if (watcher) {
      await watcher.close();
      watcher = null;
    }

    watcher = chokidar.watch(path, { ignoreInitial: true });
    watcher.on('all', (change, changedPath) => {
      const allowedEvents: DirectoryChange['event'][] = ['add', 'change', 'unlink'];
      if (!allowedEvents.includes(change as DirectoryChange['event'])) return;

      const payload: DirectoryChange = { event: change as DirectoryChange['event'], path: changedPath };
      event.sender.send(IPC_CHANNELS.DIRECTORY_CHANGED, payload);
    });
  });

  ipcMain.handle(IPC_CHANNELS.LIST_FILES, async (_event, path: string) => {
    const entries = await readdir(path);
    return entries;
  });
}

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
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
