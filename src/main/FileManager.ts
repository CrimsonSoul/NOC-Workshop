import chokidar from 'chokidar';
import { join } from 'path';
import { BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS, type AppData, type Contact, type GroupMap } from '@shared/ipc';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';

const GROUP_FILES = ['groups.csv'];
const CONTACT_FILES = ['contacts.csv'];
const DEBOUNCE_MS = 100;

function parseCsv(contents: string): any[][] {
  // Strip BOM if present
  const cleanContents = contents.replace(/^\uFEFF/, '');
  return parse(cleanContents, {
    trim: true,
    skip_empty_lines: true
  });
}

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

    const header = data[0].map(h => h.trim().toLowerCase());
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

  // --- Write Operations ---

  private async writeAndEmit(path: string, content: string) {
    this.isInternalWrite = true;
    try {
      fs.writeFileSync(path, content, 'utf-8');
      this.readAndEmit();
    } finally {
      // Small delay to ensure chokidar event is ignored
      setTimeout(() => {
        this.isInternalWrite = false;
      }, 500);
    }
  }

  public async removeContact(email: string): Promise<boolean> {
    try {
      const path = join(this.rootDir, CONTACT_FILES[0]);
      if (!fs.existsSync(path)) return false;

      const contents = fs.readFileSync(path, 'utf-8');
      const data = parseCsv(contents);

      if (data.length < 2) return false;

      const header = data[0].map(h => h.toLowerCase());
      const emailIdx = header.findIndex(h => ['email', 'e-mail'].includes(h));

      if (emailIdx === -1) return false;

      const newData = [data[0]]; // Keep header
      let removed = false;

      for (let i = 1; i < data.length; i++) {
        if (data[i][emailIdx] === email) {
          removed = true;
          // Skip this row (delete)
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
      if (fs.existsSync(path)) {
        contents = fs.readFileSync(path, 'utf-8');
      } else {
        // Create if missing
        contents = '';
        // If the directory doesn't exist, we might fail writing later, but rootDir should exist by now.
      }

      const data = parseCsv(contents);

      // If empty or just header, we can append. If completely empty, init header.
      let header: string[] = [];
      if (data.length > 0) {
        header = data[0];
      } else {
        header = ['Name', 'Title', 'Email', 'Phone']; // Default header
        data.push(header);
      }

      // Find indices for standard fields
      // NOTE: h.toLowerCase() is compared against the names array.
      // But we need to check if names INCLUDES h.toLowerCase().
      const findIdx = (names: string[]) => header.findIndex(h => names.includes(h.toLowerCase()));

      // Update header ref in case it was modified (though pushing to data[0] updates it)
      if (data.length > 0) header = data[0];

      let nameIdx = findIdx(['name', 'full name']);
      let emailIdx = findIdx(['email', 'e-mail']);
      let titleIdx = findIdx(['title', 'role', 'position']);
      let phoneIdx = findIdx(['phone', 'phone number']);

      // Ensure we have columns
      const ensureCol = (names: string[], defaultName: string) => {
          if (findIdx(names) === -1) {
              header.push(defaultName);
              // Update all existing rows with empty string
              for (let i = 1; i < data.length; i++) {
                  data[i].push('');
              }
              return header.length - 1;
          }
          return findIdx(names);
      };

      nameIdx = ensureCol(['name', 'full name'], 'Name');
      emailIdx = ensureCol(['email', 'e-mail'], 'Email');
      titleIdx = ensureCol(['title', 'role', 'position'], 'Title');
      phoneIdx = ensureCol(['phone', 'phone number'], 'Phone');

      // If we modified header (which we shouldn't if file exists, but for robustness)
      // Actually, better to just map to existing columns and append empty string for others
      // Re-eval: simpler to just append a new row matching current header structure

      // Check if updating existing contact
      let rowIndex = -1;
      // We assume email is unique identifier
      if (emailIdx !== -1 && contact.email) {
          rowIndex = data.findIndex((row, idx) => idx > 0 && row[emailIdx] === contact.email);
      }

      if (rowIndex !== -1) {
          // Update existing
          const row = data[rowIndex];
          if (nameIdx !== -1 && contact.name) row[nameIdx] = contact.name;
          if (titleIdx !== -1 && contact.title) row[titleIdx] = contact.title;
          if (phoneIdx !== -1 && contact.phone) row[phoneIdx] = contact.phone;
          // Email is same
      } else {
          // Add new
          const newRow = new Array(header.length).fill('');
          const setVal = (idx: number, val?: string) => { if (idx !== -1 && val) newRow[idx] = val; };

          setVal(nameIdx, contact.name);
          setVal(emailIdx, contact.email);
          setVal(titleIdx, contact.title);
          setVal(phoneIdx, contact.phone);

          data.push(newRow);
      }

      const csvOutput = stringify(data);
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
      if (fs.existsSync(path)) {
        contents = fs.readFileSync(path, 'utf-8');
      } else {
        contents = '';
      }

      const data = parseCsv(contents); // Array of arrays

      if (data.length === 0) {
        data.push([groupName]); // New file
      } else {
        // Check if group exists
        // Need to check case-insensitive or exact? Usually exact for groups.
        if (data[0].includes(groupName)) return true; // Already exists

        // Add header
        data[0].push(groupName);
        // Pad other rows
        // IMPORTANT: Ensure we pad all existing rows, otherwise next read might fail or be jagged
        for (let i = 1; i < data.length; i++) {
          data[i].push('');
        }
      }

      const csvOutput = stringify(data);
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
      if (!fs.existsSync(path)) return false;

      const contents = fs.readFileSync(path, 'utf-8');
      const data = parseCsv(contents);

      if (data.length === 0) return false;

      const groupIdx = data[0].indexOf(groupName);
      if (groupIdx === -1) return false; // Group not found

      // Find email in this column
      let rowIndex = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][groupIdx] === email) {
          rowIndex = i;
          break;
        }
      }

      if (remove) {
        if (rowIndex !== -1) {
          data[rowIndex][groupIdx] = ''; // clear it

          // Optional: If row is completely empty now, could remove it?
          // But that's complex if other cols have data.
          // Better: If we leave a gap, does our parser handle it?
          // parseGroups loops: `if (email) emails.push(...)` so empty string is fine.
          // However, shifting up is cleaner to avoid sparse files growing indefinitely.
          // Let's shift this column up.
           for (let i = rowIndex; i < data.length - 1; i++) {
               data[i][groupIdx] = data[i + 1][groupIdx];
           }
           data[data.length - 1][groupIdx] = '';
           // We can trim trailing empty rows from the whole file if desired, but not strictly necessary.
        }
      } else {
        // Add
        if (rowIndex !== -1) return true; // Already there

        // Find first empty slot in this column
        let added = false;
        for (let i = 1; i < data.length; i++) {
            if (!data[i][groupIdx]) {
                data[i][groupIdx] = email;
                added = true;
                break;
            }
        }
        if (!added) {
            // New row needed
            const newRow = new Array(data[0].length).fill('');
            newRow[groupIdx] = email;
            data.push(newRow);
        }
      }

      const csvOutput = stringify(data);
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
      if (!fs.existsSync(path)) return false;

      const contents = fs.readFileSync(path, 'utf-8');
      const data = parseCsv(contents);

      if (data.length === 0) return false;

      const groupIdx = data[0].indexOf(groupName);
      if (groupIdx === -1) return false; // Group not found

      // Remove column
      for (let i = 0; i < data.length; i++) {
        data[i].splice(groupIdx, 1);
      }

      // If header is empty now, file is empty?
      // Just write it back.

      const csvOutput = stringify(data);
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
      if (!fs.existsSync(path)) return false;

      const contents = fs.readFileSync(path, 'utf-8');
      const data = parseCsv(contents);

      if (data.length === 0) return false;

      // Ensure exact match for old group
      const groupIdx = data[0].indexOf(oldName);
      if (groupIdx === -1) return false;

      // Check if new name already exists
      if (data[0].includes(newName)) {
        // Renaming to an existing group name would require merging.
        // For now, let's treat this as an error or just merge automatically?
        // Merging is safer for data integrity than erroring.
        // Let's MERGE.
        const targetIdx = data[0].indexOf(newName);
        // Move all emails from old col to new col
        for (let i = 1; i < data.length; i++) {
            const email = data[i][groupIdx];
            if (email) {
                // Add to target if not empty
                if (!data[i][targetIdx]) {
                    data[i][targetIdx] = email;
                }
            }
        }
        // Remove old column
        for (let i = 0; i < data.length; i++) {
            data[i].splice(groupIdx, 1);
        }
      } else {
         // Simple Rename
         data[0][groupIdx] = newName;
      }

      const csvOutput = stringify(data);
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

          // Read source
          const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
          const sourceData = parseCsv(sourceContent);
          if (sourceData.length === 0) return false;

          const sourceHeader = sourceData[0].map(h => String(h).trim());
          const sourceRows = sourceData.slice(1);

          // Read existing
          let targetData: any[][] = [];
          const existingContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';

          if (fs.existsSync(targetPath)) {
             targetData = parseCsv(existingContent);
          }

          // Initialize if empty
          if (targetData.length === 0) {
              targetData.push([]);
          }

          const targetHeader = targetData[0]; // Reference to header row

          // Helper: ensure group column exists
          const getTargetGroupIdx = (groupName: string) => {
              let idx = targetHeader.findIndex(h => h === groupName);
              if (idx === -1) {
                  targetHeader.push(groupName);
                  // Pad existing rows
                  for (let i = 1; i < targetData.length; i++) {
                      targetData[i].push('');
                  }
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          // Iterate source columns (groups)
          for (let col = 0; col < sourceHeader.length; col++) {
              const groupName = sourceHeader[col];
              if (!groupName) continue;

              const targetColIdx = getTargetGroupIdx(groupName);

              // Get all emails in this group from source
              const sourceEmails = new Set<string>();
              for (const row of sourceRows) {
                  const email = row[col];
                  if (email && String(email).trim()) {
                      sourceEmails.add(String(email).trim());
                  }
              }

              // Get existing emails in target group
              const existingEmails = new Set<string>();
              for (let i = 1; i < targetData.length; i++) {
                  const email = targetData[i][targetColIdx];
                  if (email && String(email).trim()) {
                      existingEmails.add(String(email).trim());
                  }
              }

              // Add new emails
              for (const email of sourceEmails) {
                  if (!existingEmails.has(email)) {
                      // Find empty slot or append row
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

          const csvOutput = stringify(targetData);
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

          // Read source
          const sourceContent = fs.readFileSync(sourcePath, 'utf-8');
          const sourceData = parseCsv(sourceContent);
          if (sourceData.length < 2) return false;

          const sourceHeader = sourceData[0].map(h => h.toLowerCase().trim());
          const sourceRows = sourceData.slice(1);

          // Map headers
          const mapHeader = (candidates: string[]) => sourceHeader.findIndex(h => candidates.includes(h));
          const srcNameIdx = mapHeader(['name', 'full name', 'contact name']);
          const srcEmailIdx = mapHeader(['email', 'e-mail', 'mail', 'email address']);
          const srcPhoneIdx = mapHeader(['phone', 'phone number', 'mobile']);
          const srcTitleIdx = mapHeader(['title', 'role', 'position', 'job title']);

          if (srcEmailIdx === -1) {
              console.error('[FileManager] Import failed: No email column found.');
              return false;
          }

          // Read existing to determine if we should overwrite or merge
          let targetData: any[][] = [];
          const existingContent = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, 'utf-8') : '';

          if (fs.existsSync(targetPath)) {
             targetData = parseCsv(existingContent);
          }

          // Initialize target if empty
          if (targetData.length === 0) {
              targetData.push(['Name', 'Email', 'Phone', 'Title']);
          }

          const targetHeader = targetData[0].map(h => h.toLowerCase());

          // Helper to get target index or add column
          const getTargetIdx = (name: string) => {
              let idx = targetHeader.findIndex(h => h === name.toLowerCase());
              if (idx === -1) {
                  targetHeader.push(name.toLowerCase());
                  targetData[0].push(name);
                  // Pad existing rows
                  for(let i=1; i<targetData.length; i++) targetData[i].push('');
                  idx = targetHeader.length - 1;
              }
              return idx;
          };

          const tgtNameIdx = getTargetIdx('Name');
          const tgtEmailIdx = getTargetIdx('Email');
          const tgtPhoneIdx = getTargetIdx('Phone');
          const tgtTitleIdx = getTargetIdx('Title');

          // Process rows
          for (const srcRow of sourceRows) {
              const email = srcRow[srcEmailIdx]?.trim();
              if (!email) continue;

              const name = srcNameIdx !== -1 ? srcRow[srcNameIdx] : '';
              const phone = srcPhoneIdx !== -1 ? srcRow[srcPhoneIdx] : '';
              const title = srcTitleIdx !== -1 ? srcRow[srcTitleIdx] : '';

              // Find existing row by email
              let matchRowIdx = -1;
              for (let i = 1; i < targetData.length; i++) {
                  if (targetData[i][tgtEmailIdx]?.trim().toLowerCase() === email.toLowerCase()) {
                      matchRowIdx = i;
                      break;
                  }
              }

              if (matchRowIdx !== -1) {
                  // Update
                  if (name) targetData[matchRowIdx][tgtNameIdx] = name;
                  if (phone) targetData[matchRowIdx][tgtPhoneIdx] = phone;
                  if (title) targetData[matchRowIdx][tgtTitleIdx] = title;
              } else {
                  // Insert
                  const newRow = new Array(targetData[0].length).fill('');
                  newRow[tgtEmailIdx] = email;
                  newRow[tgtNameIdx] = name;
                  newRow[tgtPhoneIdx] = phone;
                  newRow[tgtTitleIdx] = title;
                  targetData.push(newRow);
              }
          }

          const csvOutput = stringify(targetData);
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
