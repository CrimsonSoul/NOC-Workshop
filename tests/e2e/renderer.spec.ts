import { expect, test } from '@playwright/test';

const primaryHeader = 'NOCWORKSHOP';

test.describe('renderer shell', () => {
  test('renders layout and captures baseline screenshot', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText(primaryHeader)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh data' })).toBeVisible();

    const screenshotPath = test.info().outputPath('renderer-home.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await test.info().attach('home-screenshot', {
      path: screenshotPath,
      contentType: 'image/png'
    });
  });
});
