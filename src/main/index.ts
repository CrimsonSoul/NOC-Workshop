import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { dirname, join } from 'path';
import fs from 'fs';
import { FileManager } from './FileManager';
import { IPC_CHANNELS } from '../shared/ipc';

let mainWindow: BrowserWindow | null = null;
let fileManager: FileManager | null = null;
let currentDataRoot: string = '';

// Auth State
let authCallback: ((username: string, password: string) => void) | null = null;

function getPortableDataPath() {
  if (!app.isPackaged) {
    return join(process.cwd(), 'data');
  }
  const executableDir = process.env.PORTABLE_EXECUTABLE_DIR || dirname(process.execPath);
  return join(executableDir, 'data');
}

function resolveInitialDataRoot() {
  const portablePath = getPortableDataPath();
  if (fs.existsSync(portablePath)) {
    return portablePath;
  }

  if (!app.isPackaged) {
      return join(process.cwd(), 'data');
  }

  return join(process.resourcesPath, 'data');
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

  mainWindow.on('closed', () => {
    mainWindow = null;
    fileManager = null;
  });
}

function setupIpc() {
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    await shell.openPath(path);
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(groupsFilePath(currentDataRoot));
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(contactsFilePath(currentDataRoot));
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
    const portablePath = getPortableDataPath();
    const targetPath = join(portablePath, targetFileName);

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
        // Ensure portable data directory exists
        if (!fs.existsSync(portablePath)) {
          fs.mkdirSync(portablePath, { recursive: true });
        }

        // If we are currently using internal data, we need to switch to the portable folder
        // But first, we should make sure the portable folder has both files if possible,
        // effectively "upgrading" the internal state to external state.
        if (currentDataRoot !== portablePath) {
           const internalRoot = currentDataRoot;
           ['groups.csv', 'contacts.csv'].forEach(f => {
              // Don't overwrite the one we are about to import
              if (f === targetFileName) return;

              const internalFile = join(internalRoot, f);
              const externalFile = join(portablePath, f);

              // Copy internal file to external if it exists internally and missing externally
              if (fs.existsSync(internalFile) && !fs.existsSync(externalFile)) {
                  try {
                      fs.copyFileSync(internalFile, externalFile);
                  } catch (e) {
                      console.error(`Failed to copy companion file ${f} during migration`, e);
                  }
              }
           });
        }

        fs.copyFileSync(sourcePath, targetPath);

        // Switch to new root if needed
        if (currentDataRoot !== portablePath) {
            console.log(`Switching data root from ${currentDataRoot} to ${portablePath}`);
            currentDataRoot = portablePath;

            if (fileManager) {
                fileManager.destroy();
            }

            // Re-initialize file manager with new root
            fileManager = new FileManager(mainWindow, currentDataRoot);
        } else {
            // Just reload if we are already on the right root
            fileManager?.readAndEmit();
        }

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
    currentDataRoot = resolveInitialDataRoot();
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
