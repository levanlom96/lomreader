import { expect, test } from '@playwright/test';

test.describe('reader rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__LOMREADER_TEST__ !== undefined);
  });

  test('renders an iframe with EPUB chapter content', async ({ page }) => {
    const iframe = page.frameLocator('[data-testid="reader-container"] iframe');

    await expect(page.getByTestId('reader-toolbar')).toBeVisible();
    await expect(page.locator('[data-testid="reader-container"] iframe')).toBeVisible();

    const bodyText = await iframe.locator('body').innerText();

    expect(bodyText.length).toBeGreaterThan(20);
  });

  test('navigates to the next linear spine item', async ({ page }) => {
    const position = page.getByTestId('reader-position');

    await expect(position).not.toHaveText('—');

    const before = await position.textContent();

    await page.getByTestId('reader-next').click();

    await expect(position).not.toHaveText(before ?? '');
  });
});
