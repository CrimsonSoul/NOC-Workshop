import { expect, test } from '@playwright/test';
import { injectMockApi } from './mocks';

test.describe('Application Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the mock API before any navigation
    await injectMockApi(page);
    await page.goto('/');
  });

  test('navigates between tabs', async ({ page }) => {
    // Check initial state (Compose)
    await expect(page.getByRole('button', { name: 'Compose' })).toHaveClass(/active/);

    // Update locator for Groups title
    await expect(page.getByText('GROUPS', { exact: true })).toBeVisible();

    // Navigate to People (formerly Directory)
    await page.getByRole('button', { name: 'People' }).click();
    await expect(page.getByRole('button', { name: 'People' })).toHaveClass(/active/);

    // Update locator for People search input
    await expect(page.getByPlaceholder('Search people...')).toBeVisible();

    // Navigate to Live (formerly Radar)
    await page.getByRole('button', { name: 'Live', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Live', exact: true })).toHaveClass(/active/);
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
    // Update text matcher for Log count - case insensitive
    // Replaced "2 recipients selected" with check for badge count
    await expect(page.locator('h2:has-text("Composition") + span')).toHaveText('2');

    // Manual Entry
    const adhocEmail = 'adhoc@agency.net';
    // Update placeholder matcher
    await page.getByPlaceholder('Add by email...').fill(adhocEmail);
    await page.getByPlaceholder('Add by email...').press('Enter');

    // Verify ad-hoc added immediately to the list
    // Use locator to specifically target the row, avoiding conflict with toast message
    const adhocRow = page.locator('.contact-row', { has: page.getByText(adhocEmail) });
    await expect(adhocRow).toBeVisible();

    // The mock data doesn't include this email, so the app will trigger the Add Contact Modal ONLY if we click SAVE.
    // Locate the row and find the SAVE button.
    // Hover to reveal actions if necessary, though click might work directly if it's just CSS opacity
    await adhocRow.hover();
    await adhocRow.getByRole('button', { name: 'SAVE' }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('e.g. Alice Smith').fill('Adhoc User');
    await page.getByRole('button', { name: 'Create Contact', exact: true }).click();

    // Verify "MANUAL" tag is present (using scoped class to avoid strict mode violation)
    await expect(adhocRow.locator('.source-label')).toHaveText('MANUAL');

    // Replaced "3 recipients selected" with check for badge count
    await expect(page.locator('h2:has-text("Composition") + span')).toHaveText('3');

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // Verify empty state
    await expect(page.getByText('No recipients selected')).toBeVisible();
  });

  test('directory search adds to assembler', async ({ page }) => {
    // Go to People (Directory)
    await page.getByRole('button', { name: 'People' }).click();

    // Search
    const searchInput = page.getByPlaceholder('Search people...');
    await searchInput.fill('Jane');

    // Verify filter
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();

    // Add to assembler - "ADD" button (case sensitive, matching UI)
    await page.getByRole('button', { name: 'ADD', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Added' })).toBeVisible();

    // Go back to Compose (Assembler)
    await page.getByRole('button', { name: 'Compose' }).click();

    // Verify added
    await expect(page.getByText('jane.smith@agency.net')).toBeVisible();

    // Verify it's marked as MANUAL
    const janeRow = page.locator('.contact-row', { has: page.getByText('jane.smith@agency.net') });
    await expect(janeRow.locator('.source-label')).toHaveText('MANUAL');
  });
});
