import { test, expect } from '@playwright/test';

test('verify AssemblerTab render and interaction', async ({ page }) => {
  // Mock window.api to prevent errors
  await page.addInitScript(() => {
    window.api = {
        getGroups: () => Promise.resolve({
            'Engineering': ['alice@example.com', 'bob@example.com'],
            'Marketing': ['carol@example.com']
        }),
        getContacts: () => Promise.resolve([
            { name: 'Alice', email: 'alice@example.com', title: 'Engineer', phone: '123' },
            { name: 'Bob', email: 'bob@example.com', title: 'Engineer', phone: '456' },
            { name: 'Carol', email: 'carol@example.com', title: 'Marketer', phone: '789' }
        ]),
        // Mock subscription methods used in App.tsx
        subscribeToData: (callback) => {
            // Simulate initial data load
            setTimeout(() => {
                callback({
                    groups: {
                        'Engineering': ['alice@example.com', 'bob@example.com'],
                        'Marketing': ['carol@example.com']
                    },
                    contacts: [
                        { name: 'Alice', email: 'alice@example.com', title: 'Engineer', phone: '123' },
                        { name: 'Bob', email: 'bob@example.com', title: 'Engineer', phone: '456' },
                        { name: 'Carol', email: 'carol@example.com', title: 'Marketer', phone: '789' }
                    ],
                    servers: [],
                    lastUpdated: Date.now()
                });
            }, 100);
            return () => {};
        },
        onReloadStart: () => {},
        onReloadComplete: () => {},
        logBridge: () => {},
        addContact: () => Promise.resolve(true),
        addGroup: () => Promise.resolve(true),
        removeGroup: () => Promise.resolve(true),
        renameGroup: () => Promise.resolve(true),
        openExternal: () => {}
    };
  });

  await page.goto('http://127.0.0.1:4173');

  // Wait for sidebar to load
  await expect(page.getByText('Compose')).toBeVisible();

  // Wait for groups to appear in sidebar (AssemblerTab)
  await expect(page.getByText('Engineering')).toBeVisible();
  await expect(page.getByText('Marketing')).toBeVisible();

  // Click 'Engineering' group
  await page.getByRole('button', { name: 'Engineering' }).click();

  // Verify list populates
  await expect(page.getByText('alice@example.com')).toBeVisible();
  await expect(page.getByText('bob@example.com')).toBeVisible();

  // Verify sorting header interactions (click Name header)
  await page.getByText('Name', { exact: true }).click();

  // Click 'Marketing' group
  await page.getByRole('button', { name: 'Marketing' }).click();

  // Verify list updates
  await expect(page.getByText('carol@example.com')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'verification/assembler_optimized.png' });
});
