import chokidar from 'chokidar';
import * as XLSX from 'xlsx';
import { join, dirname } from 'path';
import { app, BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap } from '@shared/ipc';
import fs from 'fs';

// Constants
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

    // Determine root directory (Project root in Dev, Exe dir in Prod)
    if (!app.isPackaged) {
      this.rootDir = process.cwd();
    } else {
      this.rootDir = dirname(app.getPath('exe'));
    }

    console.log(`[FileManager] Initialized. Watching root: ${this.rootDir}`);
    this.startWatching();
    this.readAndEmit(); // Initial read
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

  private readAndEmit() {
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
      // We could emit an error state here if needed
    }
  }

  private parseGroups(): GroupMap {
    const path = join(this.rootDir, GROUP_FILE);
    if (!fs.existsSync(path)) return {};

    const workbook = XLSX.readFile(path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // Parse as array of arrays
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    if (!data || data.length === 0) return {};

    // Logic: Column 0 is Group Name, 1-N are emails?
    // Wait, prompt said: "Iterates columns. Row 0 = Group Name. Rows 1-N = Emails."
    // So we need to transpose or iterate by col index.

    const groups: GroupMap = {};
    const maxCols = data[0].length;

    for (let col = 0; col < maxCols; col++) {
      const groupName = data[0][col];
      if (!groupName) continue;

      const emails: string[] = [];
      for (let row = 1; row < data.length; row++) {
        const cell = data[row][col];
        if (cell && typeof cell === 'string' && cell.includes('@')) {
          emails.push(cell.trim());
        }
      }

      if (emails.length > 0) {
        groups[groupName as string] = emails;
      }
    }

    return groups;
  }

  private parseContacts(): Contact[] {
    const path = join(this.rootDir, CONTACT_FILE);
    if (!fs.existsSync(path)) return [];

    const workbook = XLSX.readFile(path);
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const data = XLSX.utils.sheet_to_json(worksheet) as any[]; // Array of objects

    return data.map(row => {
      // Fuzzy Logic for keys
      const getVal = (possibleKeys: string[]) => {
        for (const k of possibleKeys) {
          // Case insensitive key match
          const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
          if (foundKey) return row[foundKey];
        }
        return '';
      };

      const name = getVal(['name', 'full name', 'person']);
      const email = getVal(['email', 'e-mail', 'mail', 'smtp']);
      const phone = getVal(['phone', 'phone number', 'tel', 'mobile']);
      const department = getVal(['department', 'dept', 'role']);

      // Normalization
      const normalizedPhone = String(phone).replace(/[^0-9+]/g, '');

      return {
        name: String(name || 'Unknown'),
        email: String(email || ''),
        phone: normalizedPhone,
        department: String(department || ''),
        _searchString: `${name} ${email} ${normalizedPhone} ${department}`.toLowerCase(),
        raw: row
      };
    }).filter(c => c.email || c.name !== 'Unknown');
  }
}
