import chokidar from 'chokidar';
import { join } from 'path';
import { BrowserWindow } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap, type Server } from '@shared/ipc';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import { stringify } from 'csv-stringify/sync';
import { parseCsvAsync, sanitizeField, desanitizeField } from './csvUtils';

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];
const SERVER_FILES = ['servers.csv'];
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

  private async parseServers(): Promise<Server[]> {
      const path = this.resolveExistingFile(SERVER_FILES);
      if (!path) return [];

      try {
          const contents = await fs.readFile(path, 'utf-8');

          // Robust parsing logic:
          // 1. Scan first 20 lines for "VM-M" (Server Name) to detect header
          // 2. Parse from that line
          // 3. Filter garbage rows (empty VM-M)
          // 4. Rewrite if dirty

          const lines = contents.split(/\r?\n/);
          let headerLineIndex = 0;
          let isDirty = false;

          for(let i = 0; i < Math.min(lines.length, 20); i++) {
              if (lines[i].includes('VM-M')) { // Fast check
                  headerLineIndex = i;
                  if (i > 0) isDirty = true; // Skipped lines = dirty
                  break;
              }
          }

          const cleanContents = lines.slice(headerLineIndex).join('\n');
          const data = await parseCsvAsync(cleanContents);

          if (data.length < 2) return [];

          const header = data[0].map((h: any) => desanitizeField(String(h).trim().toLowerCase()));
          const rows = data.slice(1);

          const findCol = (candidates: string[]) => {
              return header.findIndex(h => candidates.includes(h));
          };

          const nameIdx = findCol(['vm-m', 'server name', 'name', 'vm name']);
          const businessAreaIdx = findCol(['business area', 'businessarea']);
          const lobIdx = findCol(['lob', 'line of business']);
          const commentIdx = findCol(['comment', 'comments', 'notes']);
          const ownerIdx = findCol(['lob owner', 'owner', 'lobowner']);
          const contactIdx = findCol(['it tech support contact', 'it support', 'contact', 'tech support']);
          const osTypeIdx = findCol(['server os', 'os type', 'os']);
          const osIdx = findCol(['os according to the configuration file', 'config os', 'configuration os']);

          if (nameIdx === -1) {
              console.error('[FileManager] No Name column found in servers.csv');
              return [];
          }

          // Check if we have extra columns (more than the ~8 we need + maybe a few allowed)
          // If we have > 20 columns, it's definitely the raw export -> trigger rewrite
          if (header.length > 20) isDirty = true;

          const results: Server[] = [];
          const cleanDataForRewrite: string[][] = [['VM-M', 'Business Area', 'LOB', 'Comment', 'LOB Owner', 'IT Tech Support Contact', 'Server OS', 'OS According to the Configuration File']];

          for(const rowValues of rows) {
              const getVal = (idx: number) => {
                  if (idx === -1 || idx >= rowValues.length) return '';
                  return desanitizeField(rowValues[idx]);
              };

              const name = getVal(nameIdx);
              if (!name) {
                  isDirty = true; // Found an empty row/sub-header -> dirty
                  continue;
              }

              const businessArea = getVal(businessAreaIdx);
              const lob = getVal(lobIdx);
              const comment = getVal(commentIdx);
              const owner = getVal(ownerIdx);
              const contact = getVal(contactIdx);
              const osType = getVal(osTypeIdx);
              const os = getVal(osIdx);

              const raw: Record<string, string> = {};
              raw['vm-m'] = name;
              raw['business area'] = businessArea;
              raw['lob'] = lob;
              raw['comment'] = comment;
              raw['lob owner'] = owner;
              raw['it tech support contact'] = contact;
              raw['server os'] = osType;
              raw['os according to the configuration file'] = os;

              results.push({
                  name,
                  businessArea,
                  lob,
                  comment,
                  owner,
                  contact,
                  osType,
                  os,
                  _searchString: `${name} ${businessArea} ${lob} ${owner} ${contact} ${osType} ${os} ${comment}`.toLowerCase(),
                  raw
              });

              cleanDataForRewrite.push([name, businessArea, lob, comment, owner, contact, osType, os]);
          }

          // If file was dirty (metadata lines, extra cols, or sub-headers), rewrite it
          if (isDirty) {
              console.log('[FileManager] servers.csv is dirty (raw export detected). Rewriting cleaned version...');
              // Use safeStringify to sanitize before writing
              const csvOutput = this.safeStringify(cleanDataForRewrite);
              // Write without triggering reload loop?
              // writeAndEmit triggers reload, but that's fine, the UI will just refresh with clean data.
              // But we are currently INSIDE readAndEmit -> parseServers.
              // If we call writeAndEmit, it calls readAndEmit again. Loop risk?
              // No, because writeAndEmit sets isInternalWrite = true.
              // However, readAndEmit calls parseServers.
              // If we await writeAndEmit here, we are recursing.
              // Better to fire and forget or schedule it?
              // Actually, we should just write it. The watcher will see it.
              // But we must suppress the watcher for this write, OR let it reload.

              // We can't await writeAndEmit inside parseServers because parseServers is awaited by readAndEmit.
              // This would be a deadlock if writeAndEmit also awaits readAndEmit.
              // Let's modify writeAndEmit or use a direct write.

              // We'll run it detached.
              this.rewriteServersFile(path, csvOutput).catch(err => console.error('Failed to rewrite servers.csv', err));
          }

          return results;
      } catch (e) {
          console.error('Error parsing servers:', e);
          return [];
      }
  }

  private async rewriteServersFile(path: string, content: string) {
      this.isInternalWrite = true;
      try {
          const tmpPath = `${path}.tmp`;
          await fs.writeFile(tmpPath, content, 'utf-8');
          await fs.rename(tmpPath, path);
          console.log('[FileManager] servers.csv cleaned and saved.');
      } finally {
          setTimeout(() => { this.isInternalWrite = false; }, 1000);
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
          // Use !== undefined so we can clear fields with ""
          if (nameIdx !== -1 && contact.name !== undefined) row[nameIdx] = contact.name;
          if (titleIdx !== -1 && contact.title !== undefined) row[titleIdx] = contact.title;
          if (phoneIdx !== -1 && contact.phone !== undefined) row[phoneIdx] = contact.phone;
      } else {
          // Add new
          const newRow = new Array(workingHeader.length).fill('');
          const setVal = (idx: number, val?: string) => { if (idx !== -1 && val !== undefined) newRow[idx] = val; };

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

  public async addServer(server: Partial<Server>): Promise<boolean> {
      try {
          const path = join(this.rootDir, SERVER_FILES[0]);
          let contents = '';
          if (existsSync(path)) {
              contents = await fs.readFile(path, 'utf-8');
          }

          const data = await parseCsvAsync(contents);
          const workingData = data.map(row => row.map(cell => desanitizeField(cell)));
          let workingHeader = workingData.length > 0 ? workingData[0] : [];

          const findIdx = (names: string[]) => workingHeader.findIndex(h => names.includes(h.toLowerCase()));
          const ensureCol = (names: string[], defaultName: string) => {
              let idx = findIdx(names);
              if (idx === -1) {
                  workingHeader.push(defaultName);
                  for(let i=1; i<workingData.length; i++) workingData[i].push('');
                  idx = workingHeader.length - 1;
              }
              return idx;
          };

          if (workingData.length === 0) {
              workingHeader = ['VM-M', 'Business Area', 'LOB', 'Comment', 'LOB Owner', 'IT Tech Support Contact', 'Server OS', 'OS According to the Configuration File'];
              workingData.push(workingHeader);
          }

          // Use the EXACT headers requested by the user for new columns, or map to existing if they vary
          // 'vm-m', 'server name', 'name', 'vm name'
          const nameIdx = ensureCol(['vm-m', 'server name', 'name', 'vm name'], 'VM-M');
          const businessAreaIdx = ensureCol(['business area', 'businessarea'], 'Business Area');
          const lobIdx = ensureCol(['lob', 'line of business'], 'LOB');
          const commentIdx = ensureCol(['comment', 'comments', 'notes'], 'Comment');
          const ownerIdx = ensureCol(['lob owner', 'owner', 'lobowner'], 'LOB Owner');
          const contactIdx = ensureCol(['it tech support contact', 'it support', 'contact', 'tech support'], 'IT Tech Support Contact');
          const osTypeIdx = ensureCol(['server os', 'os type', 'os'], 'Server OS');
          const osIdx = ensureCol(['os according to the configuration file', 'config os', 'configuration os'], 'OS According to the Configuration File');

          // Update or Add
          let rowIndex = -1;
          // Use name as primary key
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
               setVal(row, osTypeIdx, server.osType);
               setVal(row, osIdx, server.os);
          } else {
               const newRow = new Array(workingHeader.length).fill('');
               setVal(newRow, nameIdx, server.name);
               setVal(newRow, businessAreaIdx, server.businessArea);
               setVal(newRow, lobIdx, server.lob);
               setVal(newRow, commentIdx, server.comment);
               setVal(newRow, ownerIdx, server.owner);
               setVal(newRow, contactIdx, server.contact);
               setVal(newRow, osTypeIdx, server.osType);
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
          const nameIdx = header.findIndex(h => ['vm-m', 'server name', 'name', 'vm name'].includes(h));

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

  public async importServersWithMapping(sourcePath: string): Promise<boolean> {
      try {
          const targetPath = join(this.rootDir, SERVER_FILES[0]);
          const sourceContent = await fs.readFile(sourcePath, 'utf-8');
          const sourceDataRaw = await parseCsvAsync(sourceContent);
          const sourceData = sourceDataRaw.map(r => r.map(c => desanitizeField(c)));

          if (sourceData.length < 2) return false;

          const sourceHeader = sourceData[0].map((h: any) => String(h).toLowerCase().trim());
          const sourceRows = sourceData.slice(1);

          const mapHeader = (candidates: string[]) => sourceHeader.findIndex((h: string) => candidates.includes(h));

          const s_nameIdx = mapHeader(['vm-m', 'server name', 'name', 'vm name']);
          const s_baIdx = mapHeader(['business area', 'businessarea']);
          const s_lobIdx = mapHeader(['lob', 'line of business']);
          const s_commentIdx = mapHeader(['comment', 'comments', 'notes']);
          const s_ownerIdx = mapHeader(['lob owner', 'owner', 'lobowner']);
          const s_contactIdx = mapHeader(['it tech support contact', 'it support', 'contact', 'tech support']);
          const s_osTypeIdx = mapHeader(['server os', 'os type', 'os']);
          const s_osIdx = mapHeader(['os according to the configuration file', 'config os', 'configuration os']);

          // If no name, abort? No, maybe they have other cols. But name is key.
          if (s_nameIdx === -1) {
              console.error('Import servers failed: No name column found');
              return false;
          }

          let targetData: any[][] = [];
          if (existsSync(targetPath)) {
              const existing = await fs.readFile(targetPath, 'utf-8');
              targetData = (await parseCsvAsync(existing)).map(r => r.map(c => desanitizeField(c)));
          }

          if (targetData.length === 0) {
               targetData.push(['VM-M', 'Business Area', 'LOB', 'Comment', 'LOB Owner', 'IT Tech Support Contact', 'Server OS', 'OS According to the Configuration File']);
          }

          const targetHeader = targetData[0].map(h => String(h).toLowerCase());

          const ensureTargetCol = (candidates: string[], defaultName: string) => {
              let idx = targetHeader.findIndex(h => candidates.includes(h));
              if (idx === -1) {
                  targetHeader.push(defaultName.toLowerCase());
                  targetData[0].push(defaultName);
                  for (let i = 1; i < targetData.length; i++) targetData[i].push('');
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          const t_nameIdx = ensureTargetCol(['vm-m', 'server name', 'name', 'vm name'], 'VM-M');
          const t_baIdx = ensureTargetCol(['business area', 'businessarea'], 'Business Area');
          const t_lobIdx = ensureTargetCol(['lob', 'line of business'], 'LOB');
          const t_commentIdx = ensureTargetCol(['comment', 'comments', 'notes'], 'Comment');
          const t_ownerIdx = ensureTargetCol(['lob owner', 'owner', 'lobowner'], 'LOB Owner');
          const t_contactIdx = ensureTargetCol(['it tech support contact', 'it support', 'contact', 'tech support'], 'IT Tech Support Contact');
          const t_osTypeIdx = ensureTargetCol(['server os', 'os type', 'os'], 'Server OS');
          const t_osIdx = ensureTargetCol(['os according to the configuration file', 'config os', 'configuration os'], 'OS According to the Configuration File');

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
                  if (s_osTypeIdx !== -1) tRow[t_osTypeIdx] = getValue(s_osTypeIdx);
                  if (s_osIdx !== -1) tRow[t_osIdx] = getValue(s_osIdx);
              } else {
                  const newRow = new Array(targetData[0].length).fill('');
                  newRow[t_nameIdx] = name;
                  newRow[t_baIdx] = getValue(s_baIdx);
                  newRow[t_lobIdx] = getValue(s_lobIdx);
                  newRow[t_commentIdx] = getValue(s_commentIdx);
                  newRow[t_ownerIdx] = getValue(s_ownerIdx);
                  newRow[t_contactIdx] = getValue(s_contactIdx);
                  newRow[t_osTypeIdx] = getValue(s_osTypeIdx);
                  newRow[t_osIdx] = getValue(s_osIdx);
                  targetData.push(newRow);
              }
          }

          const csvOutput = this.safeStringify(targetData);
          await this.writeAndEmit(targetPath, csvOutput);
          return true;
      } catch (e) {
          console.error('[FileManager] importServersWithMapping error:', e);
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
