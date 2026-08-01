import { expect, test } from '@playwright/test';

test.describe('reader resource access', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.__LOMREADER_TEST__ !== undefined);
  });

  test('can fetch chapter HTML through the publication API in the browser', async ({
    page,
  }) => {
    const chapterHtml = await page.evaluate(async () => {
      return window.__LOMREADER_TEST__!.getChapter1Html();
    });

    expect(chapterHtml.toLowerCase()).toContain('<html');
    expect(chapterHtml.length).toBeGreaterThan(1000);
  });

  test('resolves relative hrefs consistently with server-loaded publications', async ({
    page,
  }) => {
    const resolved = await page.evaluate(() => {
      return window.__LOMREADER_TEST__!.resolveCssHref();
    });

    expect(resolved).toBe('epub/css/core.css');
  });

  test('exposes publication planes on the test hook', async ({ page }) => {
    const summary = await page.evaluate(() => {
      const publication = window.__LOMREADER_TEST__!.publication;

      return {
        manifestCount: publication.manifest.publicationResources.length,
        spineCount: publication.spine.itemrefs.length,
        contentCount: publication.content.resources.length,
      };
    });

    expect(summary.manifestCount).toBe(45);
    expect(summary.spineCount).toBe(38);
    expect(summary.contentCount).toBeGreaterThan(0);
  });
});
