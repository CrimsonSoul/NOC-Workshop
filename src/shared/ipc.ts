export type GroupMap = Record<string, string[]>;
export type Contact = {
    name: string;
    email: string;
    phone: string;
    title: string;
    _searchString: string;
    raw: Record<string, any>;
};

export type AppData = {
    groups: GroupMap;
    contacts: Contact[];
    lastUpdated: number;
};

export type AuthRequest = {
    host: string;
    isProxy: boolean;
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

export type BridgeAPI = {
    openPath: (path: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    openGroupsFile: () => Promise<void>;
    openContactsFile: () => Promise<void>;
    importGroupsFile: () => Promise<boolean>;
    importContactsFile: () => Promise<boolean>;
    subscribeToData: (callback: (data: AppData) => void) => void;
    onReloadStart: (callback: () => void) => void;
    onReloadComplete: (callback: (success: boolean) => void) => void;
    reloadData: () => Promise<void>;
    onAuthRequested: (callback: (request: AuthRequest) => void) => void;
    submitAuth: (username: string, password: string) => void;
    cancelAuth: () => void;
    subscribeToRadar: (callback: (data: RadarSnapshot) => void) => void;
    radarPreloadPath: string;
    logBridge: (groups: string[]) => void;
    getMetrics: () => Promise<MetricsData>;
    addContact: (contact: Partial<Contact>) => Promise<boolean>;
    addGroup: (groupName: string) => Promise<boolean>;
    addContactToGroup: (groupName: string, email: string) => Promise<boolean>;
    removeContactFromGroup: (groupName: string, email: string) => Promise<boolean>;
    importContactsWithMapping: () => Promise<boolean>;
};

export const IPC_CHANNELS = {
    OPEN_PATH: 'fs:openPath',
    OPEN_EXTERNAL: 'shell:openExternal',
    OPEN_GROUPS_FILE: 'fs:openGroupsFile',
    OPEN_CONTACTS_FILE: 'fs:openContactsFile',
    IMPORT_GROUPS_FILE: 'fs:importGroupsFile',
    IMPORT_CONTACTS_FILE: 'fs:importContactsFile',
    ADD_CONTACT: 'data:addContact',
    ADD_GROUP: 'data:addGroup',
    ADD_CONTACT_TO_GROUP: 'data:addContactToGroup',
    REMOVE_CONTACT_FROM_GROUP: 'data:removeContactFromGroup',
    IMPORT_CONTACTS_WITH_MAPPING: 'data:importContactsWithMapping',
    DATA_UPDATED: 'data:updated',
    DATA_RELOAD: 'data:reload',
    DATA_RELOAD_STARTED: 'data:reload-started',
    DATA_RELOAD_COMPLETED: 'data:reload-completed',
    AUTH_REQUESTED: 'auth:requested',
    AUTH_SUBMIT: 'auth:submit',
    AUTH_CANCEL: 'auth:cancel',
    RADAR_DATA: 'radar:data',
    LOG_BRIDGE: 'metrics:logBridge',
    GET_METRICS: 'metrics:get'
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
