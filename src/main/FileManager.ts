import chokidar from 'chokidar';
import { join } from 'path';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap, type Server, type DataError, type ImportProgress } from '@shared/ipc';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { parseCsvAsync, sanitizeField, desanitizeField, stringifyCsv } from './csvUtils';
import { cleanAndFormatPhoneNumber } from './phoneUtils';
import { HeaderMatcher } from './HeaderMatcher';
import { validateContacts, validateServers } from './csvValidation';
import { STD_SERVER_HEADERS, STD_CONTACT_HEADERS, SERVER_COLUMN_ALIASES, CONTACT_COLUMN_ALIASES } from '@shared/csvTypes';

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];
const SERVER_FILES = ['servers.csv'];
const DEBOUNCE_MS = 100;

export class FileManager {
  private watcher: chokidar.FSWatcher | null = null;
  private rootDir: string;
  private bundledDataPath: string;
  private mainWindow: BrowserWindow;
  private debounceTimer: NodeJS.Timeout | null = null;
  private isInternalWrite = false;

  constructor(window: BrowserWindow, rootDir: string, bundledPath: string) {
    this.mainWindow = window;
    this.rootDir = rootDir;
    this.bundledDataPath = bundledPath;

    console.log(`[FileManager] Initialized. Root: ${this.rootDir}`);
    // Don't start watching or reading yet - do it lazily after window is shown
  }

  // Initialize watching and load data (call after window is shown for faster startup)
  public init() {
    console.log(`[FileManager] Starting file watching and initial data load...`);
    this.startWatching();
    this.readAndEmit();
  }

  private startWatching() {
    const pathsToWatch = [...GROUP_FILES, ...CONTACT_FILES, ...SERVER_FILES].map(file => join(this.rootDir, file));

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

  private emitError(error: DataError) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.DATA_ERROR, error);
      console.error(`[FileManager] Error: ${error.type} - ${error.message}`, error.details);
    }
  }

  private emitProgress(progress: ImportProgress) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.IMPORT_PROGRESS, progress);
    }
  }

  public async readAndEmit() {
    console.log('[FileManager] Reading data files...');
    this.emitReloadStarted();
    try {
      const groups = await this.parseGroups();
      const contacts = await this.parseContacts();
      const servers = await this.parseServers();

      const payload: AppData = {
        groups,
        contacts,
        servers,
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

  private async isDummyData(fileName: string): Promise<boolean> {
    try {
      const currentPath = join(this.rootDir, fileName);
      const bundledPath = join(this.bundledDataPath, fileName);

      if (!existsSync(currentPath) || !existsSync(bundledPath)) return false;

      const currentContent = await fs.readFile(currentPath, 'utf-8');
      const bundledContent = await fs.readFile(bundledPath, 'utf-8');

      const normCurrent = currentContent.replace(/\r\n/g, '\n').trim();
      const normBundled = bundledContent.replace(/\r\n/g, '\n').trim();

      return normCurrent === normBundled;
    } catch (e) {
      console.error('[FileManager] isDummyData check failed:', e);
      return false;
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

        // Use HeaderMatcher for flexible column matching
        const matcher = new HeaderMatcher(header);
        const phoneIdx = matcher.findColumn(CONTACT_COLUMN_ALIASES.phone);

        let needsWrite = false;

        // Clean phone numbers in memory if needed
        if (phoneIdx !== -1) {
             for (let i = 1; i < data.length; i++) {
                 const rawPhone = desanitizeField(data[i][phoneIdx]);
                 if (rawPhone) {
                     const cleaned = cleanAndFormatPhoneNumber(String(rawPhone));
                     if (cleaned !== rawPhone) {
                         data[i][phoneIdx] = cleaned; // We will sanitize on write
                         needsWrite = true;
                     }
                 }
             }
        }

        if (needsWrite) {
             console.log('[FileManager] Detected messy phone numbers. Cleaning and rewriting contacts.csv...');
             const csvOutput = stringifyCsv(data);
             this.rewriteFileDetached(path, csvOutput);
        }

        const results = rows.map((rowValues: any[]) => {
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

        // Validate contacts and emit warnings
        const validation = validateContacts(results);
        if (validation.warnings.length > 0) {
            const error: DataError = {
                type: 'validation',
                message: `Found ${validation.warnings.length} validation warnings in contacts.csv`,
                file: 'contacts.csv',
                details: validation.warnings
            };
            this.emitError(error);
        }

        return results;
    } catch (e) {
        const error: DataError = {
            type: 'parse',
            message: 'Error parsing contacts.csv',
            file: 'contacts.csv',
            details: e instanceof Error ? e.message : String(e)
        };
        this.emitError(error);
        return [];
    }
  }

  private async parseServers(): Promise<Server[]> {
      const path = this.resolveExistingFile(SERVER_FILES);
      if (!path) return [];

      try {
          const contents = await fs.readFile(path, 'utf-8');
          const lines = contents.split(/\r?\n/);

          let headerLineIndex = 0;
          const possibleHeaders = ['VM-M', 'Server Name', 'Name'];

          for(let i = 0; i < Math.min(lines.length, 20); i++) {
              const line = lines[i].toLowerCase();
              if (possibleHeaders.some(h => line.includes(h.toLowerCase()))) {
                  headerLineIndex = i;
                  break;
              }
          }

          const cleanContents = lines.slice(headerLineIndex).join('\n');
          const data = await parseCsvAsync(cleanContents);

          if (data.length < 2) return [];

          const header = data[0].map((h: any) => desanitizeField(String(h).trim().toLowerCase()));
          const rows = data.slice(1);

          // Use HeaderMatcher for flexible column matching
          const matcher = new HeaderMatcher(header);

          const nameIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.name);
          const baIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.businessArea);
          const lobIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.lob);
          const commentIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.comment);
          const ownerIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.owner);
          const contactIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.contact);
          const osIdx = matcher.findColumn(SERVER_COLUMN_ALIASES.os);

          if (nameIdx === -1) {
              const error: DataError = {
                  type: 'parse',
                  message: 'No Name column found in servers.csv',
                  file: 'servers.csv'
              };
              this.emitError(error);
              return [];
          }

          let needsRewrite = false;
          if (headerLineIndex > 0) needsRewrite = true;

          const currentHeaderStr = data[0].map((h: string) => String(h).trim()).join(',');
          const stdHeaderStr = [...STD_SERVER_HEADERS].join(',');

          if (currentHeaderStr !== stdHeaderStr) {
               needsRewrite = true;
          }

          const results: Server[] = [];
          const cleanDataForRewrite: string[][] = [[...STD_SERVER_HEADERS]];

          for(const rowValues of rows) {
              const getVal = (idx: number) => {
                  if (idx === -1 || idx >= rowValues.length) return '';
                  return desanitizeField(rowValues[idx]);
              };

              const name = getVal(nameIdx);
              if (!name) continue;

              const businessArea = getVal(baIdx);
              const lob = getVal(lobIdx);
              const comment = getVal(commentIdx);
              const owner = getVal(ownerIdx);
              const contact = getVal(contactIdx);
              const os = getVal(osIdx);

              const raw: Record<string, string> = {
                  'name': name,
                  'business area': businessArea,
                  'lob': lob,
                  'comment': comment,
                  'owner': owner,
                  'it contact': contact,
                  'os': os
              };

              results.push({
                  name,
                  businessArea,
                  lob,
                  comment,
                  owner,
                  contact,
                  os,
                  _searchString: `${name} ${businessArea} ${lob} ${owner} ${contact} ${os} ${comment}`.toLowerCase(),
                  raw
              });

              cleanDataForRewrite.push([name, businessArea, lob, comment, owner, contact, os]);
          }

          // Validate servers and emit warnings
          const validation = validateServers(results);
          if (validation.warnings.length > 0) {
              const error: DataError = {
                  type: 'validation',
                  message: `Found ${validation.warnings.length} validation warnings in servers.csv`,
                  file: 'servers.csv',
                  details: validation.warnings
              };
              this.emitError(error);
          }

          if (needsRewrite) {
              console.log('[FileManager] servers.csv has old headers or is dirty. Rewriting with standard headers...');
              const csvOutput = stringifyCsv(cleanDataForRewrite);
              this.rewriteFileDetached(path, csvOutput);
          }

          return results;
      } catch (e) {
          const error: DataError = {
              type: 'parse',
              message: 'Error parsing servers.csv',
              file: 'servers.csv',
              details: e instanceof Error ? e.message : String(e)
          };
          this.emitError(error);
          return [];
      }
  }

  private async rewriteFileDetached(path: string, content: string) {
      this.isInternalWrite = true;
      try {
          const tmpPath = `${path}.tmp`;
          await fs.writeFile(tmpPath, content, 'utf-8');
          await fs.rename(tmpPath, path);
          console.log(`[FileManager] Rewrote ${path}`);
      } catch (err) {
          console.error(`[FileManager] Failed to rewrite ${path}`, err);
      } finally {
          setTimeout(() => { this.isInternalWrite = false; }, 1000);
      }
  }

  // --- Write Operations ---

  private async writeAndEmit(path: string, content: string) {
    this.isInternalWrite = true;
    try {
      const tmpPath = `${path}.tmp`;
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, path);
      await this.readAndEmit();
    } finally {
      setTimeout(() => {
        this.isInternalWrite = false;
      }, 500);
    }
  }

  // Helper to stringify with sanitization
  private safeStringify(data: any[][]): string {
      return stringifyCsv(data);
  }

  public async removeContact(email: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, CONTACT_FILES[0]);
      if (!existsSync(path)) return false;

      const contents = await fs.readFile(path, 'utf-8');
      const data = await parseCsvAsync(contents);

      if (data.length < 2) return false;

      const header = data[0].map((h: any) => desanitizeField(String(h).toLowerCase()));
      const emailIdx = header.findIndex((h: string) => ['email', 'e-mail'].includes(h));

      if (emailIdx === -1) return false;

      const newData = [data[0]];
      let removed = false;

      for (let i = 1; i < data.length; i++) {
        const val = desanitizeField(data[i][emailIdx]);
        if (val === email) {
          removed = true;
        } else {
          newData.push(data[i]);
        }
      }

      if (removed) {
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
      }

      const data = await parseCsvAsync(contents);

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

      const nameIdx = ensureColWorking(['name', 'full name'], 'Name');
      const emailIdx = ensureColWorking(['email', 'e-mail'], 'Email');
      const titleIdx = ensureColWorking(['title', 'role', 'position'], 'Title');
      const phoneIdx = ensureColWorking(['phone', 'phone number'], 'Phone');

      if (contact.phone) {
          contact.phone = cleanAndFormatPhoneNumber(contact.phone);
      }

      let rowIndex = -1;
      if (emailIdx !== -1 && contact.email) {
          rowIndex = workingData.findIndex((row, idx) => idx > 0 && row[emailIdx] === contact.email);
      }

      if (rowIndex !== -1) {
          const row = workingData[rowIndex];
          if (nameIdx !== -1 && contact.name !== undefined) row[nameIdx] = contact.name;
          if (titleIdx !== -1 && contact.title !== undefined) row[titleIdx] = contact.title;
          if (phoneIdx !== -1 && contact.phone !== undefined) row[phoneIdx] = contact.phone;
      } else {
          const newRow = new Array(workingHeader.length).fill('');
          const setVal = (idx: number, val?: string) => { if (idx !== -1 && val !== undefined) newRow[idx] = val; };

          setVal(nameIdx, contact.name);
          setVal(emailIdx, contact.email);
          setVal(titleIdx, contact.title);
          setVal(phoneIdx, contact.phone);

          workingData.push(newRow);
      }

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

          // Read source first to ensure validity
          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const sourceDataRaw = await parseCsvAsync(sourceContent);
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));
          if (sourceData.length === 0) return false;

          // Check if current groups are dummy data
          if (await this.isDummyData(GROUP_FILES[0])) {
             console.log('[FileManager] Detected dummy groups. Clearing before import.');
             try {
                await fs.unlink(targetPath);
             } catch (e) {
                console.error('[FileManager] Failed to delete dummy groups file:', e);
             }
          }

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

          // Read source first
          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const sourceDataRaw = await parseCsvAsync(sourceContent);
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));
          if (sourceData.length < 2) return false;

          // Check if current contacts are dummy data
          if (await this.isDummyData(CONTACT_FILES[0])) {
              console.log('[FileManager] Detected dummy contacts. Clearing before import.');
              try {
                  await fs.unlink(targetPath);
              } catch (e) {
                  console.error('[FileManager] Failed to delete dummy contacts file:', e);
              }
          }

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
              const title = srcTitleIdx !== -1 ? srcRow[srcTitleIdx] : '';
              let phone = srcPhoneIdx !== -1 ? srcRow[srcPhoneIdx] : '';

              if (phone) phone = cleanAndFormatPhoneNumber(String(phone));

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

  public async addServer(server: Partial<Server>): Promise<boolean> {
      try {
          const path = join(this.rootDir, SERVER_FILES[0]);
          let contents = '';
          if (existsSync(path)) {
              contents = await fs.readFile(path, 'utf-8');
          }

          const data = await parseCsvAsync(contents);
          const workingData = data.map(row => row.map(cell => desanitizeField(cell)));

          if (workingData.length === 0) {
              workingData.push([...STD_SERVER_HEADERS]);
          }

          let workingHeader = workingData[0];
          const matcher = new HeaderMatcher(workingHeader);

          const nameIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.name, STD_SERVER_HEADERS[0], workingData);
          const businessAreaIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.businessArea, STD_SERVER_HEADERS[1], workingData);
          const lobIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.lob, STD_SERVER_HEADERS[2], workingData);
          const commentIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.comment, STD_SERVER_HEADERS[3], workingData);
          const ownerIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.owner, STD_SERVER_HEADERS[4], workingData);
          const contactIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.contact, STD_SERVER_HEADERS[5], workingData);
          const osIdx = matcher.ensureColumn(SERVER_COLUMN_ALIASES.os, STD_SERVER_HEADERS[6], workingData);

          // Update or Add
          let rowIndex = -1;
          if (server.name) {
              const lowerName = server.name.toLowerCase();
              rowIndex = workingData.findIndex((row, idx) => idx > 0 && row[nameIdx]?.trim().toLowerCase() === lowerName);
          }

          const setVal = (row: any[], idx: number, val?: string) => {
               if (idx !== -1 && val !== undefined) row[idx] = val;
          };

          if (rowIndex !== -1) {
               const row = workingData[rowIndex];
               setVal(row, nameIdx, server.name);
               setVal(row, businessAreaIdx, server.businessArea);
               setVal(row, lobIdx, server.lob);
               setVal(row, commentIdx, server.comment);
               setVal(row, ownerIdx, server.owner);
               setVal(row, contactIdx, server.contact);
               setVal(row, osIdx, server.os);
          } else {
               const newRow = new Array(workingHeader.length).fill('');
               setVal(newRow, nameIdx, server.name);
               setVal(newRow, businessAreaIdx, server.businessArea);
               setVal(newRow, lobIdx, server.lob);
               setVal(newRow, commentIdx, server.comment);
               setVal(newRow, ownerIdx, server.owner);
               setVal(newRow, contactIdx, server.contact);
               setVal(newRow, osIdx, server.os);
               workingData.push(newRow);
          }

          const csvOutput = this.safeStringify(workingData);
          await this.writeAndEmit(path, csvOutput);
          return true;
      } catch (e) {
          console.error('[FileManager] addServer error:', e);
          return false;
      }
  }

  public async removeServer(name: string): Promise<boolean> {
      try {
          const path = join(this.rootDir, SERVER_FILES[0]);
          if (!existsSync(path)) return false;

          const contents = await fs.readFile(path, 'utf-8');
          const data = await parseCsvAsync(contents);
          const workingData = data.map(row => row.map(c => desanitizeField(c)));

          if (workingData.length < 2) return false;

          const header = workingData[0].map(h => String(h).toLowerCase());
          const nameIdx = header.findIndex(h => ['name', 'server name', 'vm-m'].includes(h));

          if (nameIdx === -1) return false;

          const newData = [workingData[0]];
          let removed = false;

          for (let i = 1; i < workingData.length; i++) {
              if (workingData[i][nameIdx]?.trim().toLowerCase() === name.toLowerCase()) {
                  removed = true;
              } else {
                  newData.push(workingData[i]);
              }
          }

          if (removed) {
              const csvOutput = this.safeStringify(newData);
              await this.writeAndEmit(path, csvOutput);
              return true;
          }
          return false;
      } catch (e) {
          console.error('[FileManager] removeServer error:', e);
          return false;
      }
  }

  public async importServersWithMapping(sourcePath: string): Promise<{ success: boolean; message?: string }> {
      try {
          const targetPath = join(this.rootDir, SERVER_FILES[0]);

          // Read source first
          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const lines = sourceContent.split(/\r?\n/);
          if (lines.length === 0) return { success: false, message: 'Empty source file' };

          // Check if current servers are dummy data
          if (await this.isDummyData(SERVER_FILES[0])) {
              console.log('[FileManager] Detected dummy servers. Clearing before import.');
              try {
                  await fs.unlink(targetPath);
              } catch (e) {
                  console.error('[FileManager] Failed to delete dummy servers file:', e);
              }
          }
          let headerLineIndex = -1;

          for(let i = 0; i < Math.min(lines.length, 20); i++) {
              if (lines[i].toLowerCase().includes('vm-m') || lines[i].toLowerCase().includes('server name') || lines[i].toLowerCase().includes('name')) {
                  headerLineIndex = i;
                  break;
              }
          }

          if (headerLineIndex === -1) {
              return { success: false, message: 'Could not find "VM-M", "Server Name", or "Name" header in the first 20 lines.' };
          }

          const cleanContents = lines.slice(headerLineIndex).join('\n');
          const sourceDataRaw = await parseCsvAsync(cleanContents);
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));

          if (sourceData.length < 2) {
               return { success: false, message: 'File appears to be empty or missing data rows.' };
          }

          const sourceHeader = sourceData[0].map((h: any) => String(h).toLowerCase().trim());
          const sourceRows = sourceData.slice(1);

          const mapHeader = (candidates: string[]) => sourceHeader.findIndex((h: string) => candidates.includes(h));

          const s_nameIdx = mapHeader(['vm-m', 'server name', 'name', 'vm name']);
          const s_baIdx = mapHeader(['business area', 'businessarea']);
          const s_lobIdx = mapHeader(['lob', 'line of business']);
          const s_commentIdx = mapHeader(['comment', 'comments', 'notes']);
          const s_ownerIdx = mapHeader(['lob owner', 'owner', 'lobowner']);
          const s_contactIdx = mapHeader(['it tech support contact', 'it support', 'contact', 'tech support', 'it contact']);
          const s_osTypeIdx = mapHeader(['server os', 'os type', 'os']);

          if (s_nameIdx === -1) {
              return { success: false, message: 'No "VM-M" or "Server Name" column found in the header.' };
          }

          let targetData: any[][] = [];

          // Load or Init Target with Standard Headers
          const STD_HEADERS = ['Name', 'Business Area', 'LOB', 'Comment', 'Owner', 'IT Contact', 'OS'];

          if (existsSync(targetPath)) {
              const existing = await fs.readFile(targetPath, 'utf-8');
              const dataRaw = await parseCsvAsync(existing);
              targetData = dataRaw.map(r => r.map(c => desanitizeField(c)));
          }

          if (targetData.length === 0) {
               targetData.push(STD_HEADERS);
          }

          const targetHeader = targetData[0].map(h => String(h).toLowerCase());

          const ensureTargetCol = (name: string) => {
              let idx = targetHeader.findIndex(h => h === name.toLowerCase());
              if (idx === -1) {
                  targetHeader.push(name.toLowerCase());
                  targetData[0].push(name); // Use proper case for display
                  for (let i = 1; i < targetData.length; i++) targetData[i].push('');
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          const t_nameIdx = ensureTargetCol('Name');
          const t_baIdx = ensureTargetCol('Business Area');
          const t_lobIdx = ensureTargetCol('LOB');
          const t_commentIdx = ensureTargetCol('Comment');
          const t_ownerIdx = ensureTargetCol('Owner');
          const t_contactIdx = ensureTargetCol('IT Contact');
          const t_osIdx = ensureTargetCol('OS');

          for (const row of sourceRows) {
              const name = row[s_nameIdx]?.trim();
              if (!name) continue;

              let matchRowIdx = -1;
              for (let i = 1; i < targetData.length; i++) {
                  if (targetData[i][t_nameIdx]?.trim().toLowerCase() === name.toLowerCase()) {
                      matchRowIdx = i;
                      break;
                  }
              }

              const getValue = (idx: number) => (idx !== -1 && row[idx]) ? row[idx].trim() : '';

              if (matchRowIdx !== -1) {
                  const tRow = targetData[matchRowIdx];
                  if (s_baIdx !== -1) tRow[t_baIdx] = getValue(s_baIdx);
                  if (s_lobIdx !== -1) tRow[t_lobIdx] = getValue(s_lobIdx);
                  if (s_commentIdx !== -1) tRow[t_commentIdx] = getValue(s_commentIdx);
                  if (s_ownerIdx !== -1) tRow[t_ownerIdx] = getValue(s_ownerIdx);
                  if (s_contactIdx !== -1) tRow[t_contactIdx] = getValue(s_contactIdx);
                  if (s_osTypeIdx !== -1) tRow[t_osIdx] = getValue(s_osTypeIdx);
              } else {
                  const newRow = new Array(targetData[0].length).fill('');
                  newRow[t_nameIdx] = name;
                  newRow[t_baIdx] = getValue(s_baIdx);
                  newRow[t_lobIdx] = getValue(s_lobIdx);
                  newRow[t_commentIdx] = getValue(s_commentIdx);
                  newRow[t_ownerIdx] = getValue(s_ownerIdx);
                  newRow[t_contactIdx] = getValue(s_contactIdx);
                  newRow[t_osIdx] = getValue(s_osTypeIdx);
                  targetData.push(newRow);
              }
          }

          const csvOutput = this.safeStringify(targetData);
          await this.writeAndEmit(targetPath, csvOutput);

          // Trigger cleanup after successful import
          await this.cleanupServerContacts();

          return { success: true };
      } catch (e: any) {
          console.error('[FileManager] importServersWithMapping error:', e);
          return { success: false, message: e.message };
      }
  }

  public async cleanupServerContacts() {
      console.log('[FileManager] Starting Server Contact Cleanup...');
      try {
          const servers = await this.parseServers();
          const contacts = await this.parseContacts();
          const path = join(this.rootDir, SERVER_FILES[0]);

          if (servers.length === 0 || contacts.length === 0) return;

          // Map Email -> Name
          const emailToName = new Map<string, string>();
          for (const c of contacts) {
              if (c.email && c.name) {
                  emailToName.set(c.email.toLowerCase(), c.name);
              }
          }

          let changed = false;

          // Re-read file to get grid (since parseServers returns objects)
          const content = await fs.readFile(path, 'utf-8');
          const dataRaw = await parseCsvAsync(content);
          const data = dataRaw.map(r => r.map(c => desanitizeField(c)));

          if (data.length < 2) return;

          const header = data[0].map((h: any) => String(h).toLowerCase().trim());
          const ownerIdx = header.findIndex(h => h === 'owner' || h === 'lob owner');
          const contactIdx = header.findIndex(h => h === 'it contact' || h === 'it tech support contact');

          if (ownerIdx === -1 && contactIdx === -1) return;

          for (let i = 1; i < data.length; i++) {
              const row = data[i];

              const tryReplace = (idx: number) => {
                  if (idx !== -1 && row[idx]) {
                      const val = String(row[idx]).trim();
                      if (val.includes('@')) {
                          const match = emailToName.get(val.toLowerCase());
                          if (match && match !== val) {
                              row[idx] = match;
                              changed = true;
                          }
                      }
                  }
              };

              tryReplace(ownerIdx);
              tryReplace(contactIdx);
          }

          if (changed) {
              const csvOutput = this.safeStringify(data);
              await this.writeAndEmit(path, csvOutput);
              console.log('[FileManager] Server contacts cleanup completed. Updated file.');
          } else {
              console.log('[FileManager] No server contacts needed cleanup.');
          }

      } catch (e) {
          console.error('[FileManager] Error in cleanupServerContacts:', e);
      }
  }

  public destroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
