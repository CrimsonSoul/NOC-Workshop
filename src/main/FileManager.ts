/**
 * FileManager - Core file management class
 *
 * This class orchestrates file watching, caching, and data emission.
 * The actual CRUD operations are delegated to the operation modules
 * in /operations/ directory.
 *
 * @module FileManager
 */

import chokidar from "chokidar";
import { join } from "path";
import { BrowserWindow } from "electron";
import {
  IPC_CHANNELS,
  type AppData,
  type Contact,
  type GroupMap,
  type Server,
  type DataError,
  type ImportProgress,
  type OnCallRow,
} from "@shared/ipc";
import fs from "fs/promises";
import { existsSync } from "fs";
import { generateDummyDataAsync } from "./dataUtils";
import { stringifyCsv } from "./csvUtils";

// Import operation modules
import {
  FileContext,
  GROUP_FILES,
  CONTACT_FILES,
  SERVER_FILES,
  ONCALL_FILES,
  // Group operations
  parseGroups,
  addGroup as addGroupOp,
  removeGroup as removeGroupOp,
  renameGroup as renameGroupOp,
  updateGroupMembership as updateGroupMembershipOp,
  importGroupsWithMapping as importGroupsWithMappingOp,
  // Contact operations
  parseContacts,
  addContact as addContactOp,
  removeContact as removeContactOp,
  importContactsWithMapping as importContactsWithMappingOp,
  // Server operations
  parseServers,
  addServer as addServerOp,
  removeServer as removeServerOp,
  importServersWithMapping as importServersWithMappingOp,
  cleanupServerContacts as cleanupServerContactsOp,
  // OnCall operations
  parseOnCall,
  updateOnCallTeam as updateOnCallTeamOp,
  removeOnCallTeam as removeOnCallTeamOp,
  renameOnCallTeam as renameOnCallTeamOp,
  saveAllOnCall as saveAllOnCallOp,
} from "./operations";

const DEBOUNCE_MS = 100;

type FileType = "groups" | "contacts" | "servers" | "oncall";

/**
 * FileManager handles file watching, caching, and IPC emission.
 * Implements FileContext to provide shared utilities to operation modules.
 */
export class FileManager implements FileContext {
  private watcher: chokidar.FSWatcher | null = null;
  public readonly rootDir: string;
  public readonly bundledDataPath: string;
  private mainWindow: BrowserWindow;
  private debounceTimer: NodeJS.Timeout | null = null;
  // Counter to track pending internal writes (avoids race conditions with single boolean flag)
  private internalWriteCount = 0;
  // Cache for incremental updates
  private cachedData: {
    groups: GroupMap;
    contacts: Contact[];
    servers: Server[];
    onCall: OnCallRow[];
  } = {
    groups: {},
    contacts: [],
    servers: [],
    onCall: [],
  };
  // Track which files need updating in debounce window
  private pendingFileUpdates: Set<FileType> = new Set();

  constructor(window: BrowserWindow, rootDir: string, bundledPath: string) {
    this.mainWindow = window;
    this.rootDir = rootDir;
    this.bundledDataPath = bundledPath;

    console.log(`[FileManager] Initialized. Root: ${this.rootDir}`);
    // Don't start watching or reading yet - do it lazily after window is shown
  }

  // Initialize watching and load data (call after window is shown for faster startup)
  public init() {
    this.startWatching();
    this.readAndEmit();
    this.performBackup("init");
  }

  private startWatching() {
    const pathsToWatch = [
      ...GROUP_FILES,
      ...CONTACT_FILES,
      ...SERVER_FILES,
      ...ONCALL_FILES,
    ].map((file) => join(this.rootDir, file));

    this.watcher = chokidar.watch(pathsToWatch, {
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 100,
        pollInterval: 100,
      },
    });

    this.watcher.on("all", (event, changedPath) => {
      if (this.internalWriteCount > 0) {
        return;
      }

      // Identify which file type changed
      const fileName = changedPath.split(/[/\\]/).pop() || "";
      if (GROUP_FILES.includes(fileName)) {
        this.pendingFileUpdates.add("groups");
      } else if (CONTACT_FILES.includes(fileName)) {
        this.pendingFileUpdates.add("contacts");
      } else if (SERVER_FILES.includes(fileName)) {
        this.pendingFileUpdates.add("servers");
      } else if (ONCALL_FILES.includes(fileName)) {
        this.pendingFileUpdates.add("oncall");
      }

      this.debouncedRead();
    });
  }

  // === FileContext Implementation ===

  public resolveExistingFile(fileNames: string[]): string | null {
    for (const fileName of fileNames) {
      const path = join(this.rootDir, fileName);
      if (existsSync(path)) return path;
    }
    return null;
  }

  private debouncedRead() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.readAndEmitIncremental();
    }, DEBOUNCE_MS);
  }

  // Incremental update: only parse files that changed
  private async readAndEmitIncremental() {
    const filesToUpdate = new Set(this.pendingFileUpdates);
    this.pendingFileUpdates.clear();

    // If no specific files tracked (shouldn't happen, but fallback), do full read
    if (filesToUpdate.size === 0) {
      await this.readAndEmit();
      return;
    }

    this.emitReloadStarted();

    try {
      // Parse only the files that changed, in parallel if multiple
      const updates = await Promise.all([
        filesToUpdate.has("groups") ? parseGroups(this) : Promise.resolve(null),
        filesToUpdate.has("contacts")
          ? parseContacts(this)
          : Promise.resolve(null),
        filesToUpdate.has("servers")
          ? parseServers(this)
          : Promise.resolve(null),
        filesToUpdate.has("oncall") ? parseOnCall(this) : Promise.resolve(null),
      ]);

      // Update cache with new values (only if parsed)
      if (updates[0] !== null) this.cachedData.groups = updates[0];
      if (updates[1] !== null) this.cachedData.contacts = updates[1];
      if (updates[2] !== null) this.cachedData.servers = updates[2];
      if (updates[3] !== null) this.cachedData.onCall = updates[3];

      const payload: AppData = {
        groups: this.cachedData.groups,
        contacts: this.cachedData.contacts,
        servers: this.cachedData.servers,
        onCall: this.cachedData.onCall,
        lastUpdated: Date.now(),
      };

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.DATA_UPDATED, payload);
      }
      this.emitReloadCompleted(true);
    } catch (error) {
      console.error("[FileManager] Error in incremental update:", error);
      this.emitReloadCompleted(false);
    }
  }

  private emitReloadStarted() {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.DATA_RELOAD_STARTED);
    }
  }

  private emitReloadCompleted(success: boolean) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(
        IPC_CHANNELS.DATA_RELOAD_COMPLETED,
        success
      );
    }
  }

  public emitError(error: DataError) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.DATA_ERROR, error);
      console.error(
        `[FileManager] Error: ${error.type} - ${error.message}`,
        error.details
      );
    }
  }

  public emitProgress(progress: ImportProgress) {
    if (!this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send(IPC_CHANNELS.IMPORT_PROGRESS, progress);
    }
  }

  public async readAndEmit() {
    this.emitReloadStarted();
    try {
      // Parse all files in parallel for faster data loading
      const [groups, contacts, servers, onCall] = await Promise.all([
        parseGroups(this),
        parseContacts(this),
        parseServers(this),
        parseOnCall(this),
      ]);

      // Update cache for future incremental updates
      this.cachedData = { groups, contacts, servers, onCall };

      const payload: AppData = {
        groups,
        contacts,
        servers,
        onCall,
        lastUpdated: Date.now(),
      };

      if (!this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send(IPC_CHANNELS.DATA_UPDATED, payload);
      }
      this.emitReloadCompleted(true);
    } catch (error) {
      console.error("[FileManager] Error reading files:", error);
      this.emitReloadCompleted(false);
    }
  }

  public async isDummyData(fileName: string): Promise<boolean> {
    try {
      const currentPath = join(this.rootDir, fileName);
      const bundledPath = join(this.bundledDataPath, fileName);

      if (!existsSync(currentPath) || !existsSync(bundledPath)) return false;

      const currentContent = await fs.readFile(currentPath, "utf-8");
      const bundledContent = await fs.readFile(bundledPath, "utf-8");

      const normCurrent = currentContent.replace(/\r\n/g, "\n").trim();
      const normBundled = bundledContent.replace(/\r\n/g, "\n").trim();

      return normCurrent === normBundled;
    } catch (e) {
      console.error("[FileManager] isDummyData check failed:", e);
      return false;
    }
  }

  // === Write Operations ===

  public async writeAndEmit(path: string, content: string) {
    this.internalWriteCount++;
    try {
      const tmpPath = `${path}.tmp`;
      await fs.writeFile(tmpPath, content, "utf-8");
      await fs.rename(tmpPath, path);
      await this.readAndEmit();
    } finally {
      // Delay decrement to allow filesystem events to propagate before re-enabling watcher
      setTimeout(() => {
        this.internalWriteCount--;
      }, 500);
    }
  }

  public async rewriteFileDetached(path: string, content: string) {
    this.internalWriteCount++;
    try {
      const tmpPath = `${path}.tmp`;
      await fs.writeFile(tmpPath, content, "utf-8");
      await fs.rename(tmpPath, path);
      console.log(`[FileManager] Rewrote ${path}`);
    } catch (err) {
      console.error(`[FileManager] Failed to rewrite ${path}`, err);
    } finally {
      // Delay decrement to allow filesystem events to propagate before re-enabling watcher
      setTimeout(() => {
        this.internalWriteCount--;
      }, 1000);
    }
  }

  // Helper to stringify with sanitization
  public safeStringify(data: any[][]): string {
    return stringifyCsv(data);
  }

  // === Delegated Operations ===

  // Contact operations
  public async removeContact(email: string): Promise<boolean> {
    return removeContactOp(this, email);
  }

  public async addContact(contact: Partial<Contact>): Promise<boolean> {
    return addContactOp(this, contact);
  }

  // Group operations
  public async addGroup(groupName: string): Promise<boolean> {
    return addGroupOp(this, groupName);
  }

  public async updateGroupMembership(
    groupName: string,
    email: string,
    remove: boolean
  ): Promise<boolean> {
    return updateGroupMembershipOp(this, groupName, email, remove);
  }

  public async removeGroup(groupName: string): Promise<boolean> {
    return removeGroupOp(this, groupName);
  }

  public async renameGroup(oldName: string, newName: string): Promise<boolean> {
    return renameGroupOp(this, oldName, newName);
  }

  public async importGroupsWithMapping(sourcePath: string): Promise<boolean> {
    return importGroupsWithMappingOp(this, sourcePath);
  }

  public async importContactsWithMapping(sourcePath: string): Promise<boolean> {
    return importContactsWithMappingOp(this, sourcePath);
  }

  // Server operations
  public async addServer(server: Partial<Server>): Promise<boolean> {
    return addServerOp(this, server);
  }

  public async removeServer(name: string): Promise<boolean> {
    return removeServerOp(this, name);
  }

  public async importServersWithMapping(
    sourcePath: string
  ): Promise<{ success: boolean; message?: string }> {
    return importServersWithMappingOp(this, sourcePath);
  }

  public async cleanupServerContacts() {
    return cleanupServerContactsOp(this);
  }

  // OnCall operations
  public async updateOnCallTeam(
    team: string,
    rows: OnCallRow[]
  ): Promise<boolean> {
    return updateOnCallTeamOp(this, team, rows);
  }

  public async removeOnCallTeam(team: string): Promise<boolean> {
    return removeOnCallTeamOp(this, team);
  }

  public async renameOnCallTeam(
    oldName: string,
    newName: string
  ): Promise<boolean> {
    return renameOnCallTeamOp(this, oldName, newName);
  }

  public async saveAllOnCall(rows: OnCallRow[]): Promise<boolean> {
    return saveAllOnCallOp(this, rows);
  }

  // Utility operations
  public async generateDummyData(): Promise<boolean> {
    console.log("[FileManager] generateDummyData called");
    const success = await generateDummyDataAsync(this.rootDir);
    console.log("[FileManager] generateDummyDataAsync result:", success);
    if (success) {
      console.log("[FileManager] Triggering readAndEmit...");
      await this.readAndEmit();
    }
    return success;
  }

  public async performBackup(reason: string = "auto") {
    try {
      const backupDir = join(this.rootDir, "backups");
      // Ensure backup root exists
      await fs.mkdir(backupDir, { recursive: true });

      // Use higher resolution timestamp for "on change" backups
      const now = new Date();
      const offset = now.getTimezoneOffset() * 60000;
      const localTime = new Date(now.getTime() - offset);
      const datePart = localTime.toISOString().slice(0, 10);
      const timePart = localTime.toISOString().slice(11, 19).replace(/:/g, "-");
      const backupFolderName = `${datePart}_${timePart}`;

      const backupPath = join(backupDir, backupFolderName);

      // Create folder and copy files
      await fs.mkdir(backupPath, { recursive: true });

      const filesToBackup = [
        ...GROUP_FILES,
        ...CONTACT_FILES,
        ...SERVER_FILES,
        ...ONCALL_FILES,
      ];
      for (const file of filesToBackup) {
        const sourcePath = join(this.rootDir, file);
        const destPath = join(backupPath, file);
        try {
          await fs.copyFile(sourcePath, destPath);
        } catch (err: any) {
          // Ignore if file doesn't exist (might be fresh install)
          if (err.code !== "ENOENT") {
            console.error(`[FileManager] Failed to backup ${file}:`, err);
          }
        }
      }

      // Retention Policy: Keep last 30 DAYS worth of data
      // We will parse the folder names to find their date
      const backups = await fs.readdir(backupDir);
      const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
      const nowMs = Date.now();

      for (const dirName of backups) {
        // Match YYYY-MM-DD_...
        const match = dirName.match(/^(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const folderDate = new Date(match[1]);
          // Simple cleanup: if older than 30 days, delete
          if (nowMs - folderDate.getTime() > THIRTY_DAYS_MS) {
            const dirPath = join(backupDir, dirName);
            await fs.rm(dirPath, { recursive: true, force: true });
            console.log(`[FileManager] Pruned old backup: ${dirName}`);
          }
        }
      }
    } catch (error) {
      console.error("[FileManager] Backup failed:", error);
    }
  }

  public destroy() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}
