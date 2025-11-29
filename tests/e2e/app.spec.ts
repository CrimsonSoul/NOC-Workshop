import { expect, test } from '@playwright/test';
import { injectMockApi } from './mocks';

test.describe('Application Shell', () => {
  test.beforeEach(async ({ page }) => {
    // Inject the mock API before any navigation
    await injectMockApi(page);
    await page.goto('/');
  });

  test('navigates between tabs', async ({ page }) => {
    // Check initial state (Assembler)
    await expect(page.getByRole('button', { name: 'Assembler' })).toHaveClass(/is-active/);

    // Fix: Groups title might be text inside a div, be specific about the panel title
    // The panel implementation uses a specific div for title.
    // We can just search for "Groups" text that is visible and not the button.
    await expect(page.locator('div').filter({ hasText: /^Groups$/ }).first()).toBeVisible();

    // Navigate to Directory
    await page.getByRole('button', { name: 'Directory' }).click();
    await expect(page.getByRole('button', { name: 'Directory' })).toHaveClass(/is-active/);

    // Check for Directory specific element (Search input placeholder)
    await expect(page.getByPlaceholder('Search the directory...')).toBeVisible();

    // Navigate to Radar
    await page.getByRole('button', { name: 'Radar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Radar', exact: true })).toHaveClass(/is-active/);

    // Take screenshot of Radar
    const screenshotPath = test.info().outputPath('radar-tab.png');
    await page.screenshot({ path: screenshotPath });
    await test.info().attach('radar-tab', { path: screenshotPath, contentType: 'image/png' });
  });

  test('assembler logic: selection and manual entry', async ({ page }) => {
    // Verify groups from mock are loaded
    const groupName = 'Alpha Team';
    await expect(page.getByRole('button', { name: groupName })).toBeVisible();

    // Toggle Group
    await page.getByRole('button', { name: groupName }).click();

    // Verify logs populated
    await expect(page.getByText('alpha1@agency.net')).toBeVisible();
    await expect(page.getByText('alpha2@agency.net')).toBeVisible();
    await expect(page.getByText('Log (2)')).toBeVisible();

    // Manual Entry
    const adhocEmail = 'adhoc@agency.net';
    await page.getByPlaceholder('operator@agency.net').fill(adhocEmail);
    await page.getByPlaceholder('operator@agency.net').press('Enter');

    // Verify ad-hoc added
    await expect(page.getByText(adhocEmail)).toBeVisible();

    // Fix: "ADHOC" tag strict mode violation.
    // The ADHOC tag is a small span.
    await expect(page.locator('span').filter({ hasText: /^ADHOC$/ }).first()).toBeVisible();

    await expect(page.getByText('Log (3)')).toBeVisible();

    // Capture screenshot of populated assembler
    const screenshotPath = test.info().outputPath('assembler-populated.png');
    await page.screenshot({ path: screenshotPath });
    await test.info().attach('assembler-populated', { path: screenshotPath, contentType: 'image/png' });

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // Verify empty
    await expect(page.getByText('No entries in log')).toBeVisible();
    await expect(page.getByRole('button', { name: groupName })).not.toHaveClass(/primary/); // Should revert to secondary
  });

  test('directory search adds to assembler', async ({ page }) => {
    // Go to Directory
    await page.getByRole('button', { name: 'Directory' }).click();

    // Search - Fix placeholder selector
    const searchInput = page.getByPlaceholder('Search the directory...');
    await searchInput.fill('Jane');

    // Verify filter
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();

    // Add to assembler - "ADD +" button
    // We need to be specific because there might be multiple "ADD +" buttons if list is long,
    // but here filtered list has 1 item.
    await page.getByRole('button', { name: 'ADD +' }).click();
    await expect(page.getByRole('button', { name: '✓ ADDED' })).toBeVisible();

    // Go back to Assembler
    await page.getByRole('button', { name: 'Assembler' }).click();

    // Verify added
    await expect(page.getByText('jane.smith@agency.net')).toBeVisible();

    // Verify it's marked as ADHOC (manual add)
    await expect(page.locator('span').filter({ hasText: /^ADHOC$/ }).first()).toBeVisible();
  });
});
