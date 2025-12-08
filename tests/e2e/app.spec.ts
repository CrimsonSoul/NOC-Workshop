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
    await expect(page.getByRole('heading', { name: 'Groups' })).toBeVisible();

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
    await expect(page.getByRole('button', { name: groupName })).toBeVisible();

    // Toggle Group
    await page.getByRole('button', { name: groupName }).click();

    // Verify logs populated
    await expect(page.getByText('alpha1@agency.net')).toBeVisible();
    await expect(page.getByText('alpha2@agency.net')).toBeVisible();
    // Update text matcher for Log count - case insensitive
    await expect(page.getByText('2 recipients selected')).toBeVisible();

    // Manual Entry
    const adhocEmail = 'adhoc@agency.net';
    // Update placeholder matcher
    await page.getByPlaceholder('Enter email address...').fill(adhocEmail);
    await page.getByPlaceholder('Enter email address...').press('Enter');

    // The mock data doesn't include this email, so the app will trigger the Add Contact Modal.
    // We need to handle that modal flow.
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByPlaceholder('e.g. Alice Smith').fill('Adhoc User');
    await page.getByRole('button', { name: 'Create Contact', exact: true }).click();

    // Verify ad-hoc added
    await expect(page.getByText(adhocEmail)).toBeVisible();

    // Fix: "MANUAL" tag strict mode violation.
    await expect(page.getByText('MANUAL', { exact: true }).first()).toBeVisible();

    await expect(page.getByText('3 recipients selected')).toBeVisible();

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

    // Add to assembler - "Add" button (case insensitive or exact, updated to "Add")
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Added' })).toBeVisible();

    // Go back to Compose (Assembler)
    await page.getByRole('button', { name: 'Compose' }).click();

    // Verify added
    await expect(page.getByText('jane.smith@agency.net')).toBeVisible();

    // Verify it's marked as MANUAL
    await expect(page.getByText('MANUAL', { exact: true }).first()).toBeVisible();
  });
});
