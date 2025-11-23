import chokidar from 'chokidar';
import xlsx from 'xlsx';
import { join, dirname } from 'path';
import { app, BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap } from '@shared/ipc';
import fs from 'fs';

const GROUP_FILE = 'groups.xlsx';
const CONTACT_FILE = 'contacts.xlsx';
const DEBOUNCE_MS = 100;

export class FileManager {
  private watcher: chokidar.FSWatcher | null = null;
  private rootDir: string;
  private mainWindow: BrowserWindow;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(window: BrowserWindow) {
    this.mainWindow = window;

    if (!app.isPackaged) {
      const appPath = app.getAppPath();
      if (appPath.includes('dist')) {
        this.rootDir = join(appPath, '..', '..');
      } else {
        this.rootDir = appPath;
      }
    } else {
      this.rootDir = dirname(app.getPath('exe'));
    }

    console.log(`[FileManager] Initialized. Watching root: ${this.rootDir}`);
    this.startWatching();
    this.readAndEmit();
  }

  private startWatching() {
    const pathsToWatch = [
      join(this.rootDir, GROUP_FILE),
      join(this.rootDir, CONTACT_FILE)
    ];

    this.watcher = chokidar.watch(pathsToWatch, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100
      }
    });

    this.watcher.on('all', (event, path) => {
      console.log(`[FileManager] File event: ${event} on ${path}`);
      this.debouncedRead();
    });
  }

  private debouncedRead() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.readAndEmit();
    }, DEBOUNCE_MS);
  }

  public readAndEmit() {
    console.log('[FileManager] Reading data files...');
    try {
      const groups = this.parseGroups();
      const contacts = this.parseContacts();

      const payload: AppData = {
        groups,
        contacts,
        lastUpdated: Date.now()
      };

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.DATA_UPDATED, payload);
        console.log('[FileManager] Data emitted to renderer.');
      }
    } catch (error) {
      console.error('[FileManager] Error reading files:', error);
    }
  }

  private parseGroups(): GroupMap {
    const path = join(this.rootDir, GROUP_FILE);
    if (!fs.existsSync(path)) return {};

    const workbook = xlsx.readFile(path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (!data || data.length === 0) return {};

    const groups: GroupMap = {};
    const maxCols = data[0].length;
    for (let col = 0; col < maxCols; col++) {
      const groupName = data[0][col];
      if (!groupName) continue;
      const emails: string[] = [];
      for (let row = 1; row < data.length; row++) {
        const email = data[row][col];
        if (email) emails.push(String(email).trim());
      }
      groups[String(groupName).trim()] = emails;
    }
    return groups;
  }

  private parseContacts(): Contact[] {
    const path = join(this.rootDir, CONTACT_FILE);
    if (!fs.existsSync(path)) return [];

    const workbook = xlsx.readFile(path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const data = xlsx.utils.sheet_to_json(worksheet);
    return data.map((row: any) => {
      // Case-insensitive field lookup
      const getField = (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          const key = Object.keys(row).find(k => k.toLowerCase() === fieldName.toLowerCase());
          if (key && row[key]) return String(row[key]).trim();
        }
        return '';
      };

      const name = getField(['name', 'Name', 'full name', 'Full Name']);
      const email = getField(['email', 'Email', 'e-mail', 'E-mail']);
      const phone = getField(['phone', 'Phone', 'Phone Number', 'phone number']);
      const department = getField(['department', 'Department', 'dept', 'Dept']);

      return {
        name,
        email,
        phone,
        department,
        _searchString: `${name} ${email} ${phone} ${department}`.toLowerCase(),
        raw: row
      };
    });
  }

  public destroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
