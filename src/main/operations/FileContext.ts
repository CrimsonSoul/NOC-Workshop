/**
 * FileContext - Shared interface for file operations modules
 *
 * This interface provides access to common file I/O operations and paths
 * that the individual operation modules need. This avoids circular dependencies
 * and keeps the modules focused on their specific domain logic.
 */

import type { DataError, ImportProgress } from "@shared/ipc";

export interface FileContext {
  /** Root directory for data files */
  readonly rootDir: string;

  /** Path to bundled default data files */
  readonly bundledDataPath: string;

  /**
   * Write content to a file and emit a data update event
   * Uses atomic write (write to temp, then rename)
   */
  writeAndEmit(path: string, content: string): Promise<void>;

  /**
   * Rewrite a file without triggering immediate data reload
   * Used for auto-cleanup operations like phone number formatting
   */
  rewriteFileDetached(path: string, content: string): Promise<void>;

  /** Emit a data error to the renderer */
  emitError(error: DataError): void;

  /** Emit import progress to the renderer */
  emitProgress(progress: ImportProgress): void;

  /** Stringify data array to CSV with proper sanitization */
  safeStringify(data: any[][]): string;

  /** Find the first existing file from a list of candidates */
  resolveExistingFile(fileNames: string[]): string | null;

  /** Check if a file contains the default dummy data */
  isDummyData(fileName: string): Promise<boolean>;

  /** Trigger a backup of all data files */
  performBackup(reason: string): Promise<void>;

  /** Force a full re-read and emit of all data */
  readAndEmit(): Promise<void>;
}

// File name constants - shared across all operations
export const GROUP_FILES = ["groups.csv"];
export const CONTACT_FILES = ["contacts.csv"];
export const SERVER_FILES = ["servers.csv"];
export const ONCALL_FILES = ["oncall.csv"];
