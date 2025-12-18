import { ipcMain, dialog, shell } from 'electron';
import { BrowserWindow } from 'electron';
import { join, relative, isAbsolute, resolve, normalize } from 'path';
import fs from 'fs';
import { IPC_CHANNELS } from '../shared/ipc';
import { FileManager } from './FileManager';
import { BridgeLogger } from './BridgeLogger';
import { rateLimiters } from './rateLimiter';

/**
 * Check if a path is a Windows UNC path (\\server\share)
 */
function isUncPath(path: string): boolean {
  return /^[/\\]{2}[^/\\]+[/\\]+[^/\\]+/.test(path);
}

/**
 * Safely resolve a path to its real location, following symlinks
 * Returns null if the path doesn't exist or can't be resolved
 */
function safeRealPath(path: string): string | null {
  try {
    return fs.realpathSync(path);
  } catch {
    // Path doesn't exist or can't be resolved
    return null;
  }
}

export function setupIpcHandlers(
  getMainWindow: () => BrowserWindow | null,
  getFileManager: () => FileManager | null,
  getBridgeLogger: () => BridgeLogger | null,
  getDataRoot: () => string,
  onDataPathChange: (newPath: string) => void,
  getDefaultDataPath: () => string
) {
  // Config IPCs
  ipcMain.handle(IPC_CHANNELS.GET_DATA_PATH, async () => {
    return getDataRoot();
  });

  ipcMain.handle(IPC_CHANNELS.CHANGE_DATA_FOLDER, async () => {
    const mainWindow = getMainWindow();
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Select New Data Folder',
      properties: ['openDirectory']
    });

    if (canceled || filePaths.length === 0) return { success: false, error: 'Cancelled' };

    try {
      onDataPathChange(filePaths[0]);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.RESET_DATA_FOLDER, async () => {
    const defaultPath = getDefaultDataPath();
    try {
      onDataPathChange(defaultPath);
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  });

  // Helper for hardened path validation
  // Protects against: symlink attacks, path traversal, UNC path escapes
  const validatePath = (requestedPath: string): boolean => {
    const root = getDataRoot();
    if (!requestedPath || !root) return false;

    // Block UNC paths entirely (Windows network paths like \\server\share)
    if (isUncPath(requestedPath)) {
      console.warn(`[Security] Blocked UNC path: ${requestedPath}`);
      return false;
    }

    // Normalize and resolve the path to handle ../ sequences
    const normalizedPath = normalize(requestedPath);

    // Block if normalization reveals UNC path
    if (isUncPath(normalizedPath)) {
      console.warn(`[Security] Blocked normalized UNC path: ${normalizedPath}`);
      return false;
    }

    // Resolve to absolute path
    const absPath = resolve(root, normalizedPath);

    // First check: simple path containment
    const rel = relative(root, absPath);
    if (rel.startsWith('..') || isAbsolute(rel)) {
      return false;
    }

    // Second check: resolve symlinks if path exists
    // This prevents symlink-based escapes from the data root
    const realRoot = safeRealPath(root);
    if (!realRoot) {
      console.warn(`[Security] Could not resolve real path for root: ${root}`);
      return false;
    }

    // If the path exists, verify its real location
    const realPath = safeRealPath(absPath);
    if (realPath) {
      const realRel = relative(realRoot, realPath);
      if (realRel.startsWith('..') || isAbsolute(realRel)) {
        console.warn(`[Security] Path escapes root via symlink: ${requestedPath} -> ${realPath}`);
        return false;
      }
    }

    return true;
  };

  // FS IPCs
  ipcMain.handle(IPC_CHANNELS.OPEN_PATH, async (_event, path: string) => {
    if (!validatePath(path)) {
      console.error(`Blocked access to path outside data root: ${path}`);
      return;
    }
    await shell.openPath(path);
  });

  const getGroupsFilePath = () => {
    const root = getDataRoot();
    const candidates = ['groups.csv'];
    for (const file of candidates) {
        const fullPath = join(root, file);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return join(root, candidates[0]);
  };

  const getContactsFilePath = () => {
    const root = getDataRoot();
    const candidates = ['contacts.csv'];
    for (const file of candidates) {
        const fullPath = join(root, file);
        if (fs.existsSync(fullPath)) return fullPath;
    }
    return join(root, candidates[0]);
  };

  ipcMain.handle(IPC_CHANNELS.OPEN_GROUPS_FILE, async () => {
    await shell.openPath(getGroupsFilePath());
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_CONTACTS_FILE, async () => {
    await shell.openPath(getContactsFilePath());
  });

  // Import Handlers (rate limited to prevent DoS)
  const handleMergeImport = async (type: 'groups' | 'contacts', title: string) => {
    // Rate limit file imports (expensive operations)
    const rateLimitResult = rateLimiters.fileImport.tryConsume();
    if (!rateLimitResult.allowed) {
      console.warn(`[RateLimit] Import blocked, retry after ${rateLimitResult.retryAfterMs}ms`);
      return { success: false, rateLimited: true };
    }

    const mainWindow = getMainWindow();
    const fileManager = getFileManager();
    if (!mainWindow) return false;

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title,
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return false;

    if (type === 'contacts') {
        return fileManager?.importContactsWithMapping(filePaths[0]) ?? false;
    } else {
        return fileManager?.importGroupsWithMapping(filePaths[0]) ?? false;
    }
  };

  ipcMain.handle(IPC_CHANNELS.IMPORT_GROUPS_FILE, async () => {
    return handleMergeImport('groups', 'Merge Groups CSV');
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_FILE, async () => {
    return handleMergeImport('contacts', 'Merge Contacts CSV');
  });

  ipcMain.handle(IPC_CHANNELS.OPEN_EXTERNAL, async (_event, url: string) => {
    // Basic protocol validation
    if (!url.match(/^(https?|mailto):/i)) {
      console.error(`Blocked opening external URL with unsafe protocol: ${url}`);
      return;
    }
    await shell.openExternal(url);
  });

  ipcMain.handle(IPC_CHANNELS.DATA_RELOAD, async () => {
    // Rate limit data reloads
    const rateLimitResult = rateLimiters.dataReload.tryConsume();
    if (!rateLimitResult.allowed) {
      console.warn(`[RateLimit] Data reload blocked, retry after ${rateLimitResult.retryAfterMs}ms`);
      return { success: false, rateLimited: true };
    }
    getFileManager()?.readAndEmit();
  });

  let authCallback: ((username: string, password: string) => void) | null = null;
  // Note: we can't easily move the app.on('login') handler here without passing app.
  // But we can handle the IPCs related to auth.

  // Auth IPCs are handled in index.ts because they require access to the authCallback closure

  // Actually, let's keep AUTH in index.ts for now as it's tied to app lifecycle events.
  // Or we can expose a function to register the callback.

  ipcMain.on(IPC_CHANNELS.RADAR_DATA, (_event, payload) => {
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC_CHANNELS.RADAR_DATA, payload);
    }
  });

  ipcMain.on(IPC_CHANNELS.LOG_BRIDGE, (_event, groups: string[]) => {
    getBridgeLogger()?.logBridge(groups);
  });

  ipcMain.handle(IPC_CHANNELS.GET_METRICS, async () => {
    return getBridgeLogger()?.getMetrics();
  });

  ipcMain.handle(IPC_CHANNELS.RESET_METRICS, async () => {
    return getBridgeLogger()?.reset() ?? false;
  });

  // Weather Handlers
  ipcMain.handle(IPC_CHANNELS.GET_WEATHER, async (_event, lat, lon) => {
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&temperature_unit=fahrenheit&windspeed_unit=mph&precipitation_unit=inch`
      );
      if (!res.ok) throw new Error('Failed to fetch weather data');
      return await res.json();
    } catch (err: any) {
      console.error('[Weather] Fetch error:', err);
      throw err;
    }
  });

  ipcMain.handle(IPC_CHANNELS.SEARCH_LOCATION, async (_event, query) => {
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      if (!res.ok) throw new Error('Geocoding failed');
      return await res.json();
    } catch (err: any) {
      console.error('[Weather] Search error:', err);
      throw err;
    }
  });

  // Weather Alerts (NWS API - US only)
  ipcMain.handle(IPC_CHANNELS.GET_WEATHER_ALERTS, async (_event, lat: number, lon: number) => {
    try {
      // NWS requires a point lookup first to get the zone/county for alerts
      const pointRes = await fetch(
        `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`,
        { headers: { 'User-Agent': 'Relay-Weather-App', 'Accept': 'application/geo+json' } }
      );

      if (!pointRes.ok) {
        // Location might be outside US - return empty alerts
        if (pointRes.status === 404) {
          return [];
        }
        throw new Error('Failed to get location info from NWS');
      }

      const pointData = await pointRes.json();
      const countyZone = pointData.properties?.county;
      const forecastZone = pointData.properties?.forecastZone;

      // Fetch alerts for the area
      const alertRes = await fetch(
        `https://api.weather.gov/alerts/active?point=${lat.toFixed(4)},${lon.toFixed(4)}`,
        { headers: { 'User-Agent': 'Relay-Weather-App', 'Accept': 'application/geo+json' } }
      );

      if (!alertRes.ok) {
        throw new Error('Failed to fetch weather alerts');
      }

      const alertData = await alertRes.json();
      const features = alertData.features || [];

      // Map to our WeatherAlert type
      return features.map((f: any) => ({
        id: f.properties?.id || f.id,
        event: f.properties?.event || 'Unknown Event',
        headline: f.properties?.headline || '',
        description: f.properties?.description || '',
        severity: f.properties?.severity || 'Unknown',
        urgency: f.properties?.urgency || 'Unknown',
        certainty: f.properties?.certainty || 'Unknown',
        effective: f.properties?.effective || '',
        expires: f.properties?.expires || '',
        senderName: f.properties?.senderName || 'National Weather Service',
        areaDesc: f.properties?.areaDesc || ''
      }));
    } catch (err: any) {
      console.error('[Weather] Alerts fetch error:', err);
      return []; // Return empty array on error to not break the UI
    }
  });

  // --- Data Mutation Handlers (rate limited) ---

  // Helper to check mutation rate limit
  const checkMutationRateLimit = () => {
    const result = rateLimiters.dataMutation.tryConsume();
    if (!result.allowed) {
      console.warn(`[RateLimit] Data mutation blocked, retry after ${result.retryAfterMs}ms`);
    }
    return result.allowed;
  };

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT, async (_event, contact) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.addContact(contact) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_CONTACT, async (_event, email) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.removeContact(email) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_GROUP, async (_event, groupName) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.addGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.ADD_CONTACT_TO_GROUP, async (_event, groupName, email) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.updateGroupMembership(groupName, email, false) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_CONTACT_FROM_GROUP, async (_event, groupName, email) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.updateGroupMembership(groupName, email, true) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_GROUP, async (_event, groupName) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.removeGroup(groupName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.RENAME_GROUP, async (_event, oldName, newName) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.renameGroup(oldName, newName) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_CONTACTS_WITH_MAPPING, async () => {
    return handleMergeImport('contacts', 'Merge Contacts CSV');
  });

  // Server Handlers (rate limited)
  ipcMain.handle(IPC_CHANNELS.ADD_SERVER, async (_event, server) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.addServer(server) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.REMOVE_SERVER, async (_event, name) => {
    if (!checkMutationRateLimit()) return { success: false, rateLimited: true };
    return getFileManager()?.removeServer(name) ?? false;
  });

  ipcMain.handle(IPC_CHANNELS.IMPORT_SERVERS_FILE, async () => {
    // Rate limit file imports
    const rateLimitResult = rateLimiters.fileImport.tryConsume();
    if (!rateLimitResult.allowed) {
      console.warn(`[RateLimit] Server import blocked, retry after ${rateLimitResult.retryAfterMs}ms`);
      return { success: false, rateLimited: true };
    }

    const mainWindow = getMainWindow();
    const fileManager = getFileManager();
    if (!mainWindow) return { success: false, message: 'Main window not found' };

    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Servers CSV',
      filters: [{ name: 'CSV Files', extensions: ['csv'] }],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) return { success: false, message: 'Cancelled' };
    return fileManager?.importServersWithMapping(filePaths[0]) ?? { success: false, message: 'File Manager not initialized' };
  });

  // Window Controls
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, () => {
    getMainWindow()?.minimize();
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, () => {
    const mw = getMainWindow();
    if (mw?.isMaximized()) {
      mw.unmaximize();
    } else {
      mw?.maximize();
    }
  });
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, () => {
    getMainWindow()?.close();
  });
}
