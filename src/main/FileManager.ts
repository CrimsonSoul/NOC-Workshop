import chokidar from 'chokidar';
import { join } from 'path';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap } from '@shared/ipc';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];
const DEBOUNCE_MS = 100;

function parseCsv(contents: string): any[][] {
  return parse(contents, {
    trim: true,
    skip_empty_lines: true
  });
}

export class FileManager {
  private watcher: chokidar.FSWatcher | null = null;
  private rootDir: string;
  private mainWindow: BrowserWindow;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(window: BrowserWindow, rootDir: string) {
    this.mainWindow = window;
    this.rootDir = rootDir;

    console.log(`[FileManager] Initialized. Watching root: ${this.rootDir}`);
    this.startWatching();
    this.readAndEmit();
  }

  private startWatching() {
    const pathsToWatch = [...GROUP_FILES, ...CONTACT_FILES].map(file => join(this.rootDir, file));

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

  private resolveExistingFile(fileNames: string[]): string | null {
    for (const fileName of fileNames) {
      const path = join(this.rootDir, fileName);
      if (fs.existsSync(path)) return path;
    }
    return null;
  }

  private debouncedRead() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.readAndEmit();
    }, DEBOUNCE_MS);
  }

  private emitReloadStarted() {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.DATA_RELOAD_STARTED);
    }
  }

  private emitReloadCompleted(success: boolean) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.DATA_RELOAD_COMPLETED, success);
    }
  }

  public readAndEmit() {
    console.log('[FileManager] Reading data files...');
    this.emitReloadStarted();
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
      this.emitReloadCompleted(true);
    } catch (error) {
      console.error('[FileManager] Error reading files:', error);
      this.emitReloadCompleted(false);
    }
  }

  private parseGroups(): GroupMap {
    const path = this.resolveExistingFile(GROUP_FILES);
    if (!path) return {};

    const contents = fs.readFileSync(path, 'utf-8');
    const data = parseCsv(contents);

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
    const path = this.resolveExistingFile(CONTACT_FILES);
    if (!path) return [];

    const contents = fs.readFileSync(path, 'utf-8');
    const data = parseCsv(contents);

    if (data.length < 2) return [];

    const header = data[0].map(h => h.toLowerCase());
    const rows = data.slice(1);

    return rows.map(rowValues => {
      const row: { [key: string]: string } = {};
      header.forEach((h, i) => {
        row[h] = rowValues[i];
      });

      const getField = (fieldNames: string[]) => {
        for (const fieldName of fieldNames) {
          if (row[fieldName.toLowerCase()]) return row[fieldName.toLowerCase()].trim();
        }
        return '';
      };

      const name = getField(['name', 'full name']);
      const email = getField(['email', 'e-mail']);
      const phone = getField(['phone', 'phone number']);
      const title = getField(['title', 'role', 'position', 'department', 'dept']);

      return {
        name,
        email,
        phone,
        title,
        _searchString: `${name} ${email} ${phone} ${title}`.toLowerCase(),
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
