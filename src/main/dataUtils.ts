import fs from 'fs';
import { join } from 'path';
import { app } from 'electron';

export function ensureDataFiles(targetRoot: string, bundledDataPath: string, isPackaged: boolean) {
  // Always ensure directory exists, even in dev (if we switch to using appData in dev too)
  if (!fs.existsSync(targetRoot)) {
    try {
      fs.mkdirSync(targetRoot, { recursive: true });
    } catch (e) {
      console.error('Failed to create persistent data directory:', e);
    }
  }

  // Ensure groups.csv and contacts.csv exist
  const files = ['groups.csv', 'contacts.csv'];
  for (const file of files) {
    const targetPath = join(targetRoot, file);
    if (!fs.existsSync(targetPath)) {
      // If we are in dev, bundledDataPath might be relative or different.
      // But typically we pass a valid path.
      if (fs.existsSync(bundledDataPath)) {
          const sourcePath = join(bundledDataPath, file);
          if (fs.existsSync(sourcePath)) {
            try {
              fs.copyFileSync(sourcePath, targetPath);
            } catch (e) {
              console.error(`Failed to copy default ${file}:`, e);
            }
          }
      }
    }
  }
}

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

export function saveConfig(config: { dataRoot?: string }) {
  try {
    const configPath = join(app.getPath('userData'), 'config.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save config:', error);
  }
}
