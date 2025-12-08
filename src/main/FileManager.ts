import chokidar from 'chokidar';
import { join } from 'path';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap } from '@shared/ipc';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { parseCsvAsync, sanitizeField, desanitizeField } from './csvUtils';

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];
const DEBOUNCE_MS = 100;

export class FileManager {
  private watcher: chokidar.FSWatcher | null = null;
  private rootDir: string;
  private mainWindow: BrowserWindow;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isInternalWrite = false;

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
      if (this.isInternalWrite) {
        console.log(`[FileManager] Ignoring internal write event: ${event} on ${path}`);
        return;
      }
      console.log(`[FileManager] File event: ${event} on ${path}`);
      this.debouncedRead();
    });
  }

  private resolveExistingFile(fileNames: string[]): string | null {
    for (const fileName of fileNames) {
      const path = join(this.rootDir, fileName);
      if (existsSync(path)) return path;
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

  public async readAndEmit() {
    console.log('[FileManager] Reading data files...');
    this.emitReloadStarted();
    try {
      const groups = await this.parseGroups();
      const contacts = await this.parseContacts();

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

  private async parseGroups(): Promise<GroupMap> {
    const path = this.resolveExistingFile(GROUP_FILES);
    if (!path) return {};

    try {
        const contents = await fs.readFile(path, 'utf-8');
        const data = await parseCsvAsync(contents);

        if (!data || data.length === 0) return {};

        const groups: GroupMap = {};
        const maxCols = data[0].length;
        for (let col = 0; col < maxCols; col++) {
          const groupName = desanitizeField(data[0][col]);
          if (!groupName) continue;
          const emails: string[] = [];
          for (let row = 1; row < data.length; row++) {
            const email = desanitizeField(data[row][col]);
            if (email) emails.push(String(email).trim());
          }
          groups[String(groupName).trim()] = emails;
        }
        return groups;
    } catch (e) {
        console.error('Error parsing groups:', e);
        return {};
    }
  }

  private async parseContacts(): Promise<Contact[]> {
    const path = this.resolveExistingFile(CONTACT_FILES);
    if (!path) return [];

    try {
        const contents = await fs.readFile(path, 'utf-8');
        const data = await parseCsvAsync(contents);

        if (data.length < 2) return [];

        const header = data[0].map((h: any) => desanitizeField(String(h).trim().toLowerCase()));
        const rows = data.slice(1);

        return rows.map((rowValues: any[]) => {
          const row: { [key: string]: string } = {};
          header.forEach((h: string, i: number) => {
            row[h] = desanitizeField(rowValues[i]);
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
    } catch (e) {
        console.error('Error parsing contacts:', e);
        return [];
    }
  }

  // --- Write Operations ---

  private async writeAndEmit(path: string, content: string) {
    this.isInternalWrite = true;
    try {
      // Atomic write: write to .tmp file then rename
      const tmpPath = `${path}.tmp`;
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, path);

      await this.readAndEmit();
    } finally {
      // Small delay to ensure chokidar event is ignored
      setTimeout(() => {
        this.isInternalWrite = false;
      }, 500);
    }
  }

  // Helper to stringify with sanitization
  private safeStringify(data: any[][]): string {
      const sanitizedData = data.map(row => row.map(cell => sanitizeField(cell)));
      return stringify(sanitizedData);
  }

  public async removeContact(email: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, CONTACT_FILES[0]);
      if (!existsSync(path)) return false;

      const contents = await fs.readFile(path, 'utf-8');
      const data = await parseCsvAsync(contents); // Raw data (potentially sanitized on disk)

      if (data.length < 2) return false;

      const header = data[0].map((h: any) => desanitizeField(String(h).toLowerCase()));
      const emailIdx = header.findIndex((h: string) => ['email', 'e-mail'].includes(h));

      if (emailIdx === -1) return false;

      const newData = [data[0]]; // Keep header (already sanitized/raw from disk)
      let removed = false;

      // Note: data[i][emailIdx] might be sanitized (e.g. '=foo' -> ''=foo')
      // So we need to compare desanitized values
      for (let i = 1; i < data.length; i++) {
        const val = desanitizeField(data[i][emailIdx]);
        if (val === email) {
          removed = true;
          // Skip this row (delete)
        } else {
          newData.push(data[i]);
        }
      }

      if (removed) {
        // newData contains raw disk values (already sanitized), so we use standard stringify
        // Wait, if we mutated it, we might have mixed sanitized and unsanitized.
        // removeContact doesn't mutate fields, just removes rows.
        // So existing fields are already sanitized.
        const csvOutput = stringify(newData);
        await this.writeAndEmit(path, csvOutput);
        return true;
      }
      return false;

    } catch (e) {
      console.error('[FileManager] removeContact error:', e);
      return false;
    }
  }

  public async addContact(contact: Partial<Contact>): Promise<boolean> {
    try {
      const path = join(this.rootDir, CONTACT_FILES[0]);
      let contents = '';
      if (existsSync(path)) {
        contents = await fs.readFile(path, 'utf-8');
      } else {
        contents = '';
      }

      const data = await parseCsvAsync(contents); // Raw data from disk

      // Header is usually row 0. We need to desanitize to find columns.
      let header: string[] = [];
      if (data.length > 0) {
        header = data[0].map(h => desanitizeField(String(h)));
      } else {
        header = ['Name', 'Title', 'Email', 'Phone'];
        // If creating new, we will sanitize later
        data.push(header); // This puts raw strings in data[0] temporarily
      }

      const findIdx = (names: string[]) => header.findIndex(h => names.includes(h.toLowerCase()));

      // Re-read header incase we pushed (though we pushed raw)
      if (data.length > 0) header = data[0].map(h => desanitizeField(String(h)));

      let nameIdx = findIdx(['name', 'full name']);
      let emailIdx = findIdx(['email', 'e-mail']);
      let titleIdx = findIdx(['title', 'role', 'position']);
      let phoneIdx = findIdx(['phone', 'phone number']);

      // Ensure we have columns
      const ensureCol = (names: string[], defaultName: string) => {
          const idx = findIdx(names);
          if (idx === -1) {
              header.push(defaultName);
              // Modifying data[0] requires updating the raw array
              // Since we're adding a safe string 'Name', 'Email', etc., no sanitization needed usually,
              // but consistency matters.
              // data[0] currently holds mix of Sanitized (from disk) and Unsanitized (if we pushed above).
              // Let's standardise: Working entirely with Desanitized data in memory, then Sanitize-All at end.
              return header.length - 1;
          }
          return idx;
      };

      // Strategy: Convert EVERYTHING to desanitized in memory first.
      const workingData = data.map(row => row.map(cell => desanitizeField(cell)));
      let workingHeader = workingData.length > 0 ? workingData[0] : [];

      const findIdxWorking = (names: string[]) => workingHeader.findIndex(h => names.includes(h.toLowerCase()));
      const ensureColWorking = (names: string[], defaultName: string) => {
           let idx = findIdxWorking(names);
           if (idx === -1) {
               workingHeader.push(defaultName);
               for(let i=1; i<workingData.length; i++) workingData[i].push('');
               idx = workingHeader.length - 1;
           }
           return idx;
      };

      if (workingData.length === 0) {
           workingHeader = ['Name', 'Title', 'Email', 'Phone'];
           workingData.push(workingHeader);
      }

      nameIdx = ensureColWorking(['name', 'full name'], 'Name');
      emailIdx = ensureColWorking(['email', 'e-mail'], 'Email');
      titleIdx = ensureColWorking(['title', 'role', 'position'], 'Title');
      phoneIdx = ensureColWorking(['phone', 'phone number'], 'Phone');

      let rowIndex = -1;
      if (emailIdx !== -1 && contact.email) {
          rowIndex = workingData.findIndex((row, idx) => idx > 0 && row[emailIdx] === contact.email);
      }

      if (rowIndex !== -1) {
          // Update existing
          const row = workingData[rowIndex];
          if (nameIdx !== -1 && contact.name) row[nameIdx] = contact.name;
          if (titleIdx !== -1 && contact.title) row[titleIdx] = contact.title;
          if (phoneIdx !== -1 && contact.phone) row[phoneIdx] = contact.phone;
      } else {
          // Add new
          const newRow = new Array(workingHeader.length).fill('');
          const setVal = (idx: number, val?: string) => { if (idx !== -1 && val) newRow[idx] = val; };

          setVal(nameIdx, contact.name);
          setVal(emailIdx, contact.email);
          setVal(titleIdx, contact.title);
          setVal(phoneIdx, contact.phone);

          workingData.push(newRow);
      }

      // Sanitize ALL and Write
      const csvOutput = this.safeStringify(workingData);
      await this.writeAndEmit(path, csvOutput);
      return true;
    } catch (e) {
      console.error('[FileManager] addContact error:', e);
      return false;
    }
  }

  public async addGroup(groupName: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, GROUP_FILES[0]);
      let contents = '';
      if (existsSync(path)) {
        contents = await fs.readFile(path, 'utf-8');
      }

      const data = await parseCsvAsync(contents);

      // Work with desanitized data
      const workingData = data.map(row => row.map(c => desanitizeField(c)));

      if (workingData.length === 0) {
        workingData.push([groupName]);
      } else {
        if (workingData[0].includes(groupName)) return true;

        workingData[0].push(groupName);
        for (let i = 1; i < workingData.length; i++) {
          workingData[i].push('');
        }
      }

      const csvOutput = this.safeStringify(workingData);
      await this.writeAndEmit(path, csvOutput);
      return true;
    } catch (e) {
      console.error('[FileManager] addGroup error:', e);
      return false;
    }
  }

  public async updateGroupMembership(groupName: string, email: string, remove: boolean): Promise<boolean> {
     try {
      const path = join(this.rootDir, GROUP_FILES[0]);
      if (!existsSync(path)) return false;

      const contents = await fs.readFile(path, 'utf-8');
      const data = await parseCsvAsync(contents);
      const workingData = data.map(row => row.map(c => desanitizeField(c)));

      if (workingData.length === 0) return false;

      const groupIdx = workingData[0].indexOf(groupName);
      if (groupIdx === -1) return false;

      let rowIndex = -1;
      for (let i = 1; i < workingData.length; i++) {
        if (workingData[i][groupIdx] === email) {
          rowIndex = i;
          break;
        }
      }

      if (remove) {
        if (rowIndex !== -1) {
          workingData[rowIndex][groupIdx] = '';
           for (let i = rowIndex; i < workingData.length - 1; i++) {
               workingData[i][groupIdx] = workingData[i + 1][groupIdx];
           }
           workingData[workingData.length - 1][groupIdx] = '';
        }
      } else {
        if (rowIndex !== -1) return true;

        let added = false;
        for (let i = 1; i < workingData.length; i++) {
            if (!workingData[i][groupIdx]) {
                workingData[i][groupIdx] = email;
                added = true;
                break;
            }
        }
        if (!added) {
            const newRow = new Array(workingData[0].length).fill('');
            newRow[groupIdx] = email;
            workingData.push(newRow);
        }
      }

      const csvOutput = this.safeStringify(workingData);
      await this.writeAndEmit(path, csvOutput);
      return true;
     } catch (e) {
         console.error('[FileManager] updateGroupMembership error:', e);
         return false;
     }
  }

  public async removeGroup(groupName: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, GROUP_FILES[0]);
      if (!existsSync(path)) return false;

      const contents = await fs.readFile(path, 'utf-8');
      const data = await parseCsvAsync(contents);
      const workingData = data.map(row => row.map(c => desanitizeField(c)));

      if (workingData.length === 0) return false;

      const groupIdx = workingData[0].indexOf(groupName);
      if (groupIdx === -1) return false;

      for (let i = 0; i < workingData.length; i++) {
        workingData[i].splice(groupIdx, 1);
      }

      const csvOutput = this.safeStringify(workingData);
      await this.writeAndEmit(path, csvOutput);
      return true;
    } catch (e) {
      console.error('[FileManager] removeGroup error:', e);
      return false;
    }
  }

  public async renameGroup(oldName: string, newName: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, GROUP_FILES[0]);
      if (!existsSync(path)) return false;

      const contents = await fs.readFile(path, 'utf-8');
      const data = await parseCsvAsync(contents);
      const workingData = data.map(row => row.map(c => desanitizeField(c)));

      if (workingData.length === 0) return false;

      const groupIdx = workingData[0].indexOf(oldName);
      if (groupIdx === -1) return false;

      if (workingData[0].includes(newName)) {
        const targetIdx = workingData[0].indexOf(newName);
        for (let i = 1; i < workingData.length; i++) {
            const email = workingData[i][groupIdx];
            if (email) {
                if (!workingData[i][targetIdx]) {
                    workingData[i][targetIdx] = email;
                }
            }
        }
        for (let i = 0; i < workingData.length; i++) {
            workingData[i].splice(groupIdx, 1);
        }
      } else {
         workingData[0][groupIdx] = newName;
      }

      const csvOutput = this.safeStringify(workingData);
      await this.writeAndEmit(path, csvOutput);
      return true;

    } catch (e) {
      console.error('[FileManager] renameGroup error:', e);
      return false;
    }
  }

  public async importGroupsWithMapping(sourcePath: string): Promise<boolean> {
      try {
          const targetPath = join(this.rootDir, GROUP_FILES[0]);

          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const sourceDataRaw = await parseCsvAsync(sourceContent);
          // Source might contain injection attempts, so we desanitize then sanitize our way
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));
          if (sourceData.length === 0) return false;

          const sourceHeader = sourceData[0].map((h: any) => String(h).trim());
          const sourceRows = sourceData.slice(1);

          let targetData: any[][] = [];
          const existingContent = existsSync(targetPath) ? await fs.readFile(targetPath, 'utf-8') : '';

          if (existsSync(targetPath)) {
             const rawTarget = await parseCsvAsync(existingContent);
             targetData = rawTarget.map(r => r.map(c => desanitizeField(c)));
          }

          if (targetData.length === 0) {
              targetData.push([]);
          }

          const targetHeader = targetData[0];

          const getTargetGroupIdx = (groupName: string) => {
              let idx = targetHeader.findIndex((h: string) => h === groupName);
              if (idx === -1) {
                  targetHeader.push(groupName);
                  for (let i = 1; i < targetData.length; i++) {
                      targetData[i].push('');
                  }
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          for (let col = 0; col < sourceHeader.length; col++) {
              const groupName = sourceHeader[col];
              if (!groupName) continue;

              const targetColIdx = getTargetGroupIdx(groupName);
              const sourceEmails = new Set<string>();
              for (const row of sourceRows) {
                  const email = row[col];
                  if (email && String(email).trim()) {
                      sourceEmails.add(String(email).trim());
                  }
              }

              const existingEmails = new Set<string>();
              for (let i = 1; i < targetData.length; i++) {
                  const email = targetData[i][targetColIdx];
                  if (email && String(email).trim()) {
                      existingEmails.add(String(email).trim());
                  }
              }

              for (const email of sourceEmails) {
                  if (!existingEmails.has(email)) {
                      let added = false;
                      for (let i = 1; i < targetData.length; i++) {
                          if (!targetData[i][targetColIdx]) {
                              targetData[i][targetColIdx] = email;
                              added = true;
                              break;
                          }
                      }
                      if (!added) {
                          const newRow = new Array(targetHeader.length).fill('');
                          newRow[targetColIdx] = email;
                          targetData.push(newRow);
                      }
                  }
              }
          }

          const csvOutput = this.safeStringify(targetData);
          await this.writeAndEmit(targetPath, csvOutput);
          return true;

      } catch (e) {
          console.error('[FileManager] importGroupsWithMapping error:', e);
          return false;
      }
  }

  public async importContactsWithMapping(sourcePath: string): Promise<boolean> {
      try {
          const targetPath = join(this.rootDir, CONTACT_FILES[0]);

          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const sourceDataRaw = await parseCsvAsync(sourceContent);
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));
          if (sourceData.length < 2) return false;

          const sourceHeader = sourceData[0].map((h: any) => String(h).toLowerCase().trim());
          const sourceRows = sourceData.slice(1);

          const mapHeader = (candidates: string[]) => sourceHeader.findIndex((h: string) => candidates.includes(h));
          const srcNameIdx = mapHeader(['name', 'full name', 'contact name']);
          const srcEmailIdx = mapHeader(['email', 'e-mail', 'mail', 'email address']);
          const srcPhoneIdx = mapHeader(['phone', 'phone number', 'mobile']);
          const srcTitleIdx = mapHeader(['title', 'role', 'position', 'job title']);

          if (srcEmailIdx === -1) {
              console.error('[FileManager] Import failed: No email column found.');
              return false;
          }

          let targetData: any[][] = [];
          const existingContent = existsSync(targetPath) ? await fs.readFile(targetPath, 'utf-8') : '';

          if (existsSync(targetPath)) {
             const rawTarget = await parseCsvAsync(existingContent);
             targetData = rawTarget.map(r => r.map(c => desanitizeField(c)));
          }

          if (targetData.length === 0) {
              targetData.push(['Name', 'Email', 'Phone', 'Title']);
          }

          const targetHeader = targetData[0].map((h: any) => String(h).toLowerCase());

          const getTargetIdx = (name: string) => {
              let idx = targetHeader.findIndex((h: string) => h === name.toLowerCase());
              if (idx === -1) {
                  targetHeader.push(name.toLowerCase());
                  targetData[0].push(name);
                  for(let i=1; i<targetData.length; i++) targetData[i].push('');
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          const tgtNameIdx = getTargetIdx('Name');
          const tgtEmailIdx = getTargetIdx('Email');
          const tgtPhoneIdx = getTargetIdx('Phone');
          const tgtTitleIdx = getTargetIdx('Title');

          for (const srcRow of sourceRows) {
              const email = srcRow[srcEmailIdx]?.trim();
              if (!email) continue;

              const name = srcNameIdx !== -1 ? srcRow[srcNameIdx] : '';
              const phone = srcPhoneIdx !== -1 ? srcRow[srcPhoneIdx] : '';
              const title = srcTitleIdx !== -1 ? srcRow[srcTitleIdx] : '';

              let matchRowIdx = -1;
              for (let i = 1; i < targetData.length; i++) {
                  if (targetData[i][tgtEmailIdx]?.trim().toLowerCase() === email.toLowerCase()) {
                      matchRowIdx = i;
                      break;
                  }
              }

              if (matchRowIdx !== -1) {
                  if (name) targetData[matchRowIdx][tgtNameIdx] = name;
                  if (phone) targetData[matchRowIdx][tgtPhoneIdx] = phone;
                  if (title) targetData[matchRowIdx][tgtTitleIdx] = title;
              } else {
                  const newRow = new Array(targetData[0].length).fill('');
                  newRow[tgtEmailIdx] = email;
                  newRow[tgtNameIdx] = name;
                  newRow[tgtPhoneIdx] = phone;
                  newRow[tgtTitleIdx] = title;
                  targetData.push(newRow);
              }
          }

          const csvOutput = this.safeStringify(targetData);
          await this.writeAndEmit(targetPath, csvOutput);
          return true;

      } catch (e) {
          console.error('[FileManager] importContactsWithMapping error:', e);
          return false;
      }
  }

  public destroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
