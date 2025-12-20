import fs from 'fs';
import fsPromises from 'fs/promises';
import { join } from 'path';
import { app } from 'electron';

// Default headers for each file type - used when creating new files
const DEFAULT_HEADERS: Record<string, string> = {
  'groups.csv': 'Group,Members',
  'contacts.csv': 'Name,Email,Phone,Title',
  'servers.csv': 'Server,IP,Port,Protocol,Owner,Comment',
  'oncall.csv': 'Team,Primary,Backup'
};

// Async version for non-blocking startup
// IMPORTANT: Never copies bundled sample data - only creates empty files with headers
export async function ensureDataFilesAsync(targetRoot: string, bundledDataPath: string, isPackaged: boolean) {
  // Always ensure directory exists, even in dev
  try {
    await fsPromises.mkdir(targetRoot, { recursive: true });
  } catch (e) {
    console.error('Failed to create persistent data directory:', e);
  }

  // Ensure groups.csv and contacts.csv exist - create with headers only, never copy bundled data
  const files = ['groups.csv', 'contacts.csv'];
  for (const file of files) {
    const targetPath = join(targetRoot, file);
    try {
      await fsPromises.access(targetPath);
      // File exists, skip
    } catch {
      // File doesn't exist - create empty file with headers only (NO bundled data)
      try {
        const headers = DEFAULT_HEADERS[file] || '';
        await fsPromises.writeFile(targetPath, headers + '\n', 'utf-8');
        console.log(`[dataUtils] Created empty ${file} with headers only (no sample data)`);
      } catch (e) {
        console.error(`Failed to create ${file}:`, e);
      }
    }
  }
}

// Sync version for compatibility (used during path changes)
// IMPORTANT: Never copies bundled sample data - only creates empty files with headers
export function ensureDataFiles(targetRoot: string, bundledDataPath: string, isPackaged: boolean) {
  // Always ensure directory exists, even in dev (if we switch to using appData in dev too)
  if (!fs.existsSync(targetRoot)) {
    try {
      fs.mkdirSync(targetRoot, { recursive: true });
    } catch (e) {
      console.error('Failed to create persistent data directory:', e);
    }
  }

  // Ensure groups.csv and contacts.csv exist - create with headers only, never copy bundled data
  const files = ['groups.csv', 'contacts.csv'];
  for (const file of files) {
    const targetPath = join(targetRoot, file);
    if (!fs.existsSync(targetPath)) {
      // Create empty file with headers only (NO bundled data to prevent contamination)
      try {
        const headers = DEFAULT_HEADERS[file] || '';
        fs.writeFileSync(targetPath, headers + '\n', 'utf-8');
        console.log(`[dataUtils] Created empty ${file} with headers only (no sample data)`);
      } catch (e) {
        console.error(`Failed to create ${file}:`, e);
      }
    }
  }
}

// Async version for non-blocking file copying with parallel operations
// IMPORTANT: Never falls back to bundled sample data - creates empty files with headers instead
export async function copyDataFilesAsync(sourceRoot: string, targetRoot: string, bundledDataPath: string): Promise<boolean> {
  const essentialFiles = ['contacts.csv', 'groups.csv', 'oncall.csv', 'history.json'];

  // Ensure target exists
  try {
    await fsPromises.mkdir(targetRoot, { recursive: true });
  } catch (e) {
    console.error('Failed to create target directory:', e);
  }

  // Build array of copy operations to run in parallel
  const copyOperations: Promise<boolean>[] = essentialFiles.map(async (file) => {
    const source = join(sourceRoot, file);
    const target = join(targetRoot, file);

    // Check if target exists
    try {
      await fsPromises.access(target);
      return false; // Target exists, skip
    } catch {
      // Target doesn't exist, proceed
    }

    // Try sourceRoot first (user's existing data)
    try {
      await fsPromises.access(source);
      await fsPromises.copyFile(source, target);
      console.log(`Copied ${file} from ${sourceRoot} to ${targetRoot}`);
      return true;
    } catch {
      // Source doesn't exist - create empty file with headers (NO bundled data)
      const headers = DEFAULT_HEADERS[file];
      if (headers) {
        try {
          await fsPromises.writeFile(target, headers + '\n', 'utf-8');
          console.log(`Created empty ${file} with headers only (no sample data)`);
          return true;
        } catch {
          // Failed to create
        }
      }
      return false;
    }
  });

  // Execute all copy operations in parallel
  const results = await Promise.all(copyOperations);
  return results.some(copied => copied);
}

// Sync version for compatibility (used during path changes)
// IMPORTANT: Never falls back to bundled sample data - creates empty files with headers instead
export function copyDataFiles(sourceRoot: string, targetRoot: string, bundledDataPath: string) {
  const essentialFiles = ['contacts.csv', 'groups.csv', 'oncall.csv', 'history.json'];
  let filesCopied = false;

  // Ensure target exists
  if (!fs.existsSync(targetRoot)) {
    try { fs.mkdirSync(targetRoot, { recursive: true }); } catch (e) { console.error(e); }
  }

  for (const file of essentialFiles) {
    const source = join(sourceRoot, file);
    const target = join(targetRoot, file);
    // Only copy if target DOES NOT exist
    if (!fs.existsSync(target)) {
      // Try sourceRoot (user's existing data)
      if (fs.existsSync(source)) {
        try {
          fs.copyFileSync(source, target);
          filesCopied = true;
          console.log(`Copied ${file} from ${sourceRoot} to ${targetRoot}`);
        } catch (e) {
          console.error(`Failed to copy ${file}:`, e);
        }
      } else {
        // Source doesn't exist - create empty file with headers (NO bundled data)
        const headers = DEFAULT_HEADERS[file];
        if (headers) {
          try {
            fs.writeFileSync(target, headers + '\n', 'utf-8');
            filesCopied = true;
            console.log(`Created empty ${file} with headers only (no sample data)`);
          } catch (e) {
            console.error(`Failed to create ${file}:`, e);
          }
        }
      }
    }
  }
  return filesCopied;
}

// Async version for non-blocking startup
export async function loadConfigAsync(): Promise<{ dataRoot?: string }> {
  try {
    const configPath = join(app.getPath('userData'), 'config.json');
    try {
      const content = await fsPromises.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      // File doesn't exist
      return {};
    }
  } catch (error) {
    console.error('Failed to load config:', error);
    return {};
  }
}

// Sync version for compatibility
export function loadConfig(): { dataRoot?: string } {
  try {
    const configPath = join(app.getPath('userData'), 'config.json');
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Failed to load config:', error);
  }
  return {};
}

// Async version for non-blocking config save
export async function saveConfigAsync(config: { dataRoot?: string }): Promise<void> {
  try {
    const configPath = join(app.getPath('userData'), 'config.json');
    await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}

// Sync version for compatibility
export function saveConfig(config: { dataRoot?: string }) {
  try {
    const configPath = join(app.getPath('userData'), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}
