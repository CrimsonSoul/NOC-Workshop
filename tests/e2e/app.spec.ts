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

    // Update locator for Groups title
    await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

    // Navigate to Directory
    await page.getByRole('button', { name: 'Directory' }).click();
    await expect(page.getByRole('button', { name: 'Directory' })).toHaveClass(/is-active/);

    // Update locator for Directory search input
    await expect(page.getByPlaceholder('Filter directory...')).toBeVisible();

    // Navigate to Radar
    await page.getByRole('button', { name: 'Radar', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Radar', exact: true })).toHaveClass(/is-active/);
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
    // Update text matcher for Log count
    await expect(page.getByText('2 RECIPIENTS SELECTED')).toBeVisible();

    // Manual Entry
    const adhocEmail = 'adhoc@agency.net';
    // Update placeholder matcher
    await page.getByPlaceholder('Enter email address...').fill(adhocEmail);
    await page.getByPlaceholder('Enter email address...').press('Enter');

    // Verify ad-hoc added
    await expect(page.getByText(adhocEmail)).toBeVisible();

    // Fix: "ADHOC" tag strict mode violation.
    await expect(page.getByText('MANUAL', { exact: true }).first()).toBeVisible();

    await expect(page.getByText('3 RECIPIENTS SELECTED')).toBeVisible();

    // Reset
    await page.getByRole('button', { name: 'Reset' }).click();

    // Verify empty state
    await expect(page.getByText('No recipients selected')).toBeVisible();
  });

  test('directory search adds to assembler', async ({ page }) => {
    // Go to Directory
    await page.getByRole('button', { name: 'Directory' }).click();

    // Search
    const searchInput = page.getByPlaceholder('Filter directory...');
    await searchInput.fill('Jane');

    // Verify filter
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('John Doe')).not.toBeVisible();

    // Add to assembler - "ADD +" button
    await page.getByRole('button', { name: 'ADD +' }).click();
    await expect(page.getByRole('button', { name: 'ADDED' })).toBeVisible();

    // Go back to Assembler
    await page.getByRole('button', { name: 'Assembler' }).click();

    // Verify added
    await expect(page.getByText('jane.smith@agency.net')).toBeVisible();

    // Verify it's marked as MANUAL
    await expect(page.getByText('MANUAL', { exact: true }).first()).toBeVisible();
  });
});
