import { expect, test } from '@playwright/test';

test.describe('lomreader integration harness', () => {
  test('loads hypatia.epub and exposes manifest, spine, and content planes', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('reader-harness')).toBeVisible();
    await expect(page.getByTestId('reader-version')).toHaveText('0.0.1');
    await expect(page.getByTestId('epub-url')).toHaveText(
      'http://localhost:3001/epubs/hypatia.epub',
    );
    await expect(page.getByTestId('publication-identifier')).toContainText(
      'standardebooks.org/ebooks/charles-kingsley/hypatia',
    );
    await expect(page.getByTestId('manifest-count')).toHaveText('45');
    await expect(page.getByTestId('spine-count')).toHaveText('38');
    await expect(page.getByTestId('content-count')).not.toHaveText('0');
    await expect(page.getByTestId('first-spine-href')).toHaveText('text/titlepage.xhtml');
  });

  test('can reach the EPUB fixture through the EPUB server', async ({ request }) => {
    const health = await request.get('http://localhost:3001/health');
    expect(health.ok()).toBeTruthy();

    const epub = await request.get('http://localhost:3001/epubs/hypatia.epub');
    expect(epub.ok()).toBeTruthy();
    expect(epub.headers()['content-type']).toContain('application/epub');
  });
});
