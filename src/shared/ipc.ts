export type GroupMap = Record<string, string[]>;
export type Contact = {
    name: string;
    email: string;
    phone: string;
    department: string;
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

export type BridgeAPI = {
    openPath: (path: string) => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    subscribeToData: (callback: (data: AppData) => void) => void;
    reloadData: () => Promise<void>;
    onAuthRequested: (callback: (request: AuthRequest) => void) => void;
    submitAuth: (username: string, password: string) => void;
    cancelAuth: () => void;
};

export const IPC_CHANNELS = {
    OPEN_PATH: 'fs:openPath',
    OPEN_EXTERNAL: 'shell:openExternal',
    DATA_UPDATED: 'data:updated',
    DATA_RELOAD: 'data:reload',
    AUTH_REQUESTED: 'auth:requested',
    AUTH_SUBMIT: 'auth:submit',
    AUTH_CANCEL: 'auth:cancel'
} as const;
