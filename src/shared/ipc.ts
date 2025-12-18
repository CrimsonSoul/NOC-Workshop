export type GroupMap = Record<string, string[]>;
export type Contact = {
    name: string;
    email: string;
    phone: string;
    title: string;
    _searchString: string;
    raw: Record<string, any>;
};

export type Server = {
    name: string;
    businessArea: string;
    lob: string;
    comment: string;
    owner: string; // Email
    contact: string; // Email
    os: string;
    _searchString: string;
    raw: Record<string, any>;
};

export type AppData = {
    groups: GroupMap;
    contacts: Contact[];
    servers: Server[];
    lastUpdated: number;
};

export type AuthRequest = {
    host: string;
    isProxy: boolean;
    nonce: string; // One-time token for secure auth response
    hasCachedCredentials?: boolean; // Whether credentials are available from cache
};

export type RadarCounters = {
    ok?: number;
    pending?: number;
    internalError?: number;
};

export type RadarStatusVariant = 'success' | 'warning' | 'danger' | 'info';

export type RadarSnapshot = {
    counters: RadarCounters;
    statusText?: string;
    statusColor?: string;
    statusVariant?: RadarStatusVariant;
    lastUpdated: number;
};

export type DataError = {
    type: 'validation' | 'parse' | 'write' | 'read';
    message: string;
    file?: string;
    details?: any;
};

export type ImportProgress = {
    stage: 'reading' | 'validating' | 'processing' | 'writing' | 'complete';
    totalRows: number;
    processedRows: number;
    percentage: number;
    message: string;
};

export type BridgeAPI = {
    openPath: (path: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    openGroupsFile: () => Promise<void>;
    openContactsFile: () => Promise<void>;
    importGroupsFile: () => Promise<boolean>;
    importContactsFile: () => Promise<boolean>;
    importServersFile: () => Promise<boolean>;
    subscribeToData: (callback: (data: AppData) => void) => void;
    onReloadStart: (callback: () => void) => void;
    onReloadComplete: (callback: (success: boolean) => void) => void;
    onDataError: (callback: (error: DataError) => void) => void;
    onImportProgress: (callback: (progress: ImportProgress) => void) => void;
    reloadData: () => Promise<void>;
    onAuthRequested: (callback: (request: AuthRequest) => void) => void;
    submitAuth: (nonce: string, username: string, password: string, remember?: boolean) => Promise<boolean>;
    cancelAuth: (nonce: string) => void;
    useCachedAuth: (nonce: string) => Promise<boolean>;
    subscribeToRadar: (callback: (data: RadarSnapshot) => void) => void;
    logBridge: (groups: string[]) => void;
    getMetrics: () => Promise<MetricsData>;
    resetMetrics: () => Promise<boolean>;
    getWeather: (lat: number, lon: number) => Promise<any>;
    searchLocation: (query: string) => Promise<any>;
    addContact: (contact: Partial<Contact>) => Promise<boolean>;
    removeContact: (email: string) => Promise<boolean>;
    addServer: (server: Partial<Server>) => Promise<boolean>;
    removeServer: (name: string) => Promise<boolean>;
    addGroup: (groupName: string) => Promise<boolean>;
    addContactToGroup: (groupName: string, email: string) => Promise<boolean>;
    removeContactFromGroup: (groupName: string, email: string) => Promise<boolean>;
    importContactsWithMapping: () => Promise<boolean>;
    changeDataFolder: () => Promise<boolean>;
    resetDataFolder: () => Promise<boolean>;
    getDataPath: () => Promise<string>;
    removeGroup: (groupName: string) => Promise<boolean>;
    renameGroup: (oldName: string, newName: string) => Promise<boolean>;
    windowMinimize: () => void;
    windowMaximize: () => void;
    windowClose: () => void;
};

export const IPC_CHANNELS = {
    REMOVE_GROUP: 'data:removeGroup',
    WINDOW_MINIMIZE: 'window:minimize',
    WINDOW_MAXIMIZE: 'window:maximize',
    WINDOW_CLOSE: 'window:close',
    CHANGE_DATA_FOLDER: 'config:changeDataFolder',
    RESET_DATA_FOLDER: 'config:resetDataFolder',
    GET_DATA_PATH: 'config:getDataPath',
    OPEN_PATH: 'fs:openPath',
    OPEN_EXTERNAL: 'shell:openExternal',
    OPEN_GROUPS_FILE: 'fs:openGroupsFile',
    OPEN_CONTACTS_FILE: 'fs:openContactsFile',
    IMPORT_GROUPS_FILE: 'fs:importGroupsFile',
    IMPORT_CONTACTS_FILE: 'fs:importContactsFile',
    IMPORT_SERVERS_FILE: 'fs:importServersFile',
    ADD_CONTACT: 'data:addContact',
    REMOVE_CONTACT: 'data:removeContact',
    ADD_SERVER: 'data:addServer',
    REMOVE_SERVER: 'data:removeServer',
    ADD_GROUP: 'data:addGroup',
    ADD_CONTACT_TO_GROUP: 'data:addContactToGroup',
    REMOVE_CONTACT_FROM_GROUP: 'data:removeContactFromGroup',
    RENAME_GROUP: 'data:renameGroup',
    IMPORT_CONTACTS_WITH_MAPPING: 'data:importContactsWithMapping',
    DATA_UPDATED: 'data:updated',
    DATA_RELOAD: 'data:reload',
    DATA_RELOAD_STARTED: 'data:reload-started',
    DATA_RELOAD_COMPLETED: 'data:reload-completed',
    DATA_ERROR: 'data:error',
    IMPORT_PROGRESS: 'data:importProgress',
    AUTH_REQUESTED: 'auth:requested',
    AUTH_SUBMIT: 'auth:submit',
    AUTH_CANCEL: 'auth:cancel',
    AUTH_USE_CACHED: 'auth:useCached',
    RADAR_DATA: 'radar:data',
    LOG_BRIDGE: 'metrics:logBridge',
    GET_METRICS: 'metrics:get',
    RESET_METRICS: 'metrics:reset',
    GET_WEATHER: 'weather:get',
    SEARCH_LOCATION: 'weather:search'
} as const;

export type BridgeEvent = {
  timestamp: number;
  groups: string[];
};

export type MetricsData = {
  bridgesLast7d: number;
  bridgesLast30d: number;
  bridgesLast6m: number;
  bridgesLast1y: number;
  topGroups: { name: string; count: number }[];
};
