import { expect, test } from '@playwright/test';

/** Frozen values — keep in sync with packages/lomreader/test/hypatia.contract.test.ts */
const HYPATIA = {
  manifestCount: '45',
  spineCount: '38',
  firstSpineHref: 'text/titlepage.xhtml',
  chapter1Path: 'epub/text/chapter-1.xhtml',
  packageVersion: '3.0',
  identifierFragment: 'standardebooks.org/ebooks/charles-kingsley/hypatia',
} as const;

test.describe('lomreader integration harness', () => {
  test('loads hypatia.epub and exposes manifest, spine, and content planes', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(page.getByTestId('reader-harness')).toBeVisible();
    await expect(page.getByTestId('reader-status')).toHaveCount(0);
    await expect(page.getByTestId('reader-version')).toHaveText('0.0.1');
    await expect(page.getByTestId('epub-url')).toHaveText(
      'http://localhost:3001/epubs/hypatia.epub',
    );
    await expect(page.getByTestId('publication-identifier')).toContainText(
      HYPATIA.identifierFragment,
    );
    await expect(page.getByTestId('package-version')).toHaveText(HYPATIA.packageVersion);
    await expect(page.getByTestId('manifest-count')).toHaveText(HYPATIA.manifestCount);
    await expect(page.getByTestId('linked-resource-count')).not.toHaveText('0');
    await expect(page.getByTestId('spine-count')).toHaveText(HYPATIA.spineCount);
    await expect(page.getByTestId('content-count')).not.toHaveText('0');
    await expect(page.getByTestId('css-count')).not.toHaveText('0');
    await expect(page.getByTestId('first-spine-href')).toHaveText(HYPATIA.firstSpineHref);
    await expect(page.getByTestId('chapter-1-path')).toHaveText(HYPATIA.chapter1Path);
  });

  test('shows a loading state before the publication is ready', async ({ page }) => {
    await page.route('**/hypatia.epub', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/');

    await expect(page.getByTestId('reader-status')).toHaveText('Loading EPUB…');
    await expect(page.getByTestId('manifest-count')).toHaveText(HYPATIA.manifestCount, {
      timeout: 10_000,
    });
  });
});

test.describe('EPUB server fixtures', () => {
  test('serves hypatia.epub with the correct media type', async ({ request }) => {
    const health = await request.get('http://localhost:3001/health');
    expect(health.ok()).toBeTruthy();
    await expect(health.json()).resolves.toEqual({ status: 'ok' });

    const epub = await request.get('http://localhost:3001/epubs/hypatia.epub');
    expect(epub.ok()).toBeTruthy();
    expect(epub.headers()['content-type']).toContain('application/epub');

    const bytes = await epub.body();
    expect(bytes.byteLength).toBeGreaterThan(10_000);
  });
});
