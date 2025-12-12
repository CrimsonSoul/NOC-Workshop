import { Page } from '@playwright/test';
import { AppData, BridgeAPI, GroupMap, Contact, RadarSnapshot } from '../../src/shared/ipc';

export const MOCK_DATA: AppData = {
  groups: {
    'Alpha Team': ['alpha1@agency.net', 'alpha2@agency.net'],
    'Beta Squad': ['beta1@agency.net']
  },
  contacts: [
    {
      name: 'John Doe',
      email: 'john.doe@agency.net',
      phone: '555-0100',
      title: 'Officer',
      _searchString: 'john doe officer',
      raw: {}
    },
    {
      name: 'Jane Smith',
      email: 'jane.smith@agency.net',
      phone: '555-0101',
      title: 'Analyst',
      _searchString: 'jane smith analyst',
      raw: {}
    }
  ],
  servers: [],
  lastUpdated: Date.now()
};

export const MOCK_RADAR: RadarSnapshot = {
  counters: { ok: 5, pending: 2, internalError: 0 },
  statusVariant: 'success',
  statusText: 'All Systems Operational',
  lastUpdated: Date.now()
};

export async function injectMockApi(page: Page) {
  await page.addInitScript((data) => {
    // Create the mock API object
    const mockApi: BridgeAPI = {
      openPath: async () => {},
      openExternal: async () => {},
      openGroupsFile: async () => {},
      openContactsFile: async () => {},
      importGroupsFile: async () => true,
      importContactsFile: async () => true,
      importServersFile: async () => true,
      subscribeToData: (callback) => {
        // Immediately callback with data
        callback(data.mockData);
      },
      onReloadStart: (callback) => {
        (window as any).__triggerReloadStart = callback;
      },
      onReloadComplete: (callback) => {
        (window as any).__triggerReloadComplete = callback;
      },
      reloadData: async () => {
        // Simulate a reload cycle
        if ((window as any).__triggerReloadStart) (window as any).__triggerReloadStart();
        setTimeout(() => {
            if ((window as any).__triggerReloadComplete) (window as any).__triggerReloadComplete(true);
        }, 500);
      },
      onAuthRequested: () => {},
      submitAuth: () => {},
      cancelAuth: () => {},
      subscribeToRadar: (callback) => {
         callback(data.mockRadar);
      },
      logBridge: () => {},
      getMetrics: async () => ({
        bridgesLast7d: 10,
        bridgesLast30d: 50,
        bridgesLast6m: 200,
        bridgesLast1y: 1000,
        topGroups: []
      }),
      resetMetrics: async () => true,
      addContact: async () => true,
      removeContact: async () => true,
      addServer: async () => true,
      removeServer: async () => true,
      addGroup: async () => true,
      addContactToGroup: async () => true,
      removeContactFromGroup: async () => true,
      importContactsWithMapping: async () => true,
      changeDataFolder: async () => true,
      resetDataFolder: async () => true,
      getDataPath: async () => '/mock/data/path',
      removeGroup: async () => true,
      renameGroup: async () => true,
      windowMinimize: () => {},
      windowMaximize: () => {},
      windowClose: () => {}
    };

    // Expose it as window.api
    (window as any).api = mockApi;
  }, { mockData: MOCK_DATA, mockRadar: MOCK_RADAR });
}
