import { expect, test } from '@playwright/test';
import { injectMockApi } from './mocks';

test.describe('Application Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the mock API before any navigation
    await injectMockApi(page);
    await page.goto('/');
  });

  test('navigates between tabs and visual check', async ({ page }) => {
    const composeTab = page.locator('button.sidebar-item', { hasText: 'Compose' });
    const peopleTab = page.locator('button.sidebar-item', { hasText: 'People' });
    const liveTab = page.locator('button.sidebar-item', { hasText: 'Live' });

    // Check initial state (Compose)
    await expect(composeTab).toHaveClass(/active/);
    await expect(page.getByText('GROUPS', { exact: true })).toBeVisible();

    // Visual test for Compose tab
    // Masking the clock in the header as it changes
    await expect(page).toHaveScreenshot('compose-tab.png', {
      mask: [page.locator('.clock')]
    });

    // Navigate to People (formerly Directory)
    await peopleTab.click();
    await expect(peopleTab).toHaveClass(/active/);
    await expect(page.getByPlaceholder('Search people...')).toBeVisible();

    // Visual test for People tab
    await expect(page).toHaveScreenshot('people-tab.png', {
      mask: [page.locator('.clock')]
    });

    // Navigate to Live (formerly Radar)
    await liveTab.click();
    await expect(liveTab).toHaveClass(/active/);
  });

  test('assembler logic: selection and manual entry', async ({ page }) => {
    // Verify groups from mock are loaded
    const groupName = 'Alpha Team';
    // Match "Alpha Team" followed by count, e.g., "Alpha Team 2"
    await expect(page.getByRole('button', { name: new RegExp(groupName) })).toBeVisible();

    // Toggle Group
    await page.getByRole('button', { name: new RegExp(groupName) }).click();

    // Verify logs populated
    await expect(page.getByText('alpha1@agency.net')).toBeVisible();
    await expect(page.getByText('alpha2@agency.net')).toBeVisible();

    // Check badge count
    await expect(page.locator('h2:has-text("Composition") + span')).toHaveText('2');

    // Manual Entry
    const adhocEmail = 'adhoc@agency.net';
    await page.getByPlaceholder('Add by email...').fill(adhocEmail);
    await page.getByPlaceholder('Add by email...').press('Enter');

    // Verify ad-hoc added immediately to the list
    const adhocRow = page.locator('.contact-row', { has: page.getByText(adhocEmail) });
    await expect(adhocRow).toBeVisible();

    // Visual check for selection state
    await expect(page).toHaveScreenshot('compose-selection.png', {
      mask: [page.locator('.clock')]
    });

    // Trigger Add Contact Modal
    await adhocRow.hover();
    await adhocRow.getByRole('button', { name: 'SAVE' }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // Visual check for Modal
    await expect(dialog).toHaveScreenshot('add-contact-modal.png');

    await page.getByPlaceholder('e.g. Alice Smith').fill('Adhoc User');
    await page.getByRole('button', { name: 'Create Contact', exact: true }).click();

    // Verify "MANUAL" tag is present
    await expect(adhocRow.locator('.source-label')).toHaveText('MANUAL');

    // Check badge count
    await expect(page.locator('h2:has-text("Composition") + span')).toHaveText('3');

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // Verify empty state
    await expect(page.getByText('No recipients selected')).toBeVisible();
  });

  test('directory search adds to assembler', async ({ page }) => {
    const peopleTab = page.locator('button.sidebar-item', { hasText: 'People' });
    const composeTab = page.locator('button.sidebar-item', { hasText: 'Compose' });

    // Go to People (Directory)
    await peopleTab.click();

    // Search
    const searchInput = page.getByPlaceholder('Search people...');
    await searchInput.fill('Jane');

    // Verify filter
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();

    // Add to assembler
    await page.getByRole('button', { name: 'ADD', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Added' })).toBeVisible();

    // Go back to Compose (Assembler)
    await composeTab.click();

    // Verify added
    await expect(page.getByText('jane.smith@agency.net')).toBeVisible();

    // Verify it's marked as MANUAL
    const janeRow = page.locator('.contact-row', { has: page.getByText('jane.smith@agency.net') });
    await expect(janeRow.locator('.source-label')).toHaveText('MANUAL');
  });
});
