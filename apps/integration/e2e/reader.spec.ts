import { expect, test } from '@playwright/test';

test.describe('lomreader integration harness', () => {
  test('loads the reader and displays the library version', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByTestId('reader-harness')).toBeVisible();
    await expect(page.getByTestId('reader-version')).toHaveText('0.0.1');
  });

  test('links to the EPUB server for fixture loading', async ({ page, request }) => {
    await page.goto('/');

    const epubLink = page.getByTestId('epub-server-link');
    await expect(epubLink).toHaveAttribute('href', 'http://localhost:3001/epubs/');

    const health = await request.get('http://localhost:3001/health');
    expect(health.ok()).toBeTruthy();
    await expect(health.json()).resolves.toEqual({ status: 'ok' });
  });
});
