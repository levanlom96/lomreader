import { describe, expect, it } from 'vitest';
import { PageMeasurer } from './page-measurer';
import { derivePageViewport } from './page-shell';

function sizedContainer(width = 400, height = 600): HTMLElement {
  const container = document.createElement('div');
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });

  return container;
}

function longChapterBody(paragraphCount = 40): string {
  const paragraphs = Array.from({ length: paragraphCount }, (_, index) => {
    const words = Array.from({ length: 40 }, () => 'word').join(' ');

    return `<p>Paragraph ${index + 1}. ${words}.</p>`;
  }).join('');

  return `<style>p { margin: 0 0 1em; line-height: 1.5; }</style>${paragraphs}`;
}

function measurementHtml(body: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter</title></head>
<body>${body}</body>
</html>`;
}

describe('PageMeasurer', () => {
  it('returns at least one page range for chapter content', async () => {
    const container = sizedContainer();
    const viewport = derivePageViewport(container, '1-up');
    const measurer = new PageMeasurer();

    try {
      const ranges = await measurer.measurePreparedDocument(
        measurementHtml(longChapterBody()),
        viewport,
      );

      expect(ranges.length).toBeGreaterThan(0);
      expect(ranges[0]?.startBlock).toBe(0);
    } finally {
      measurer.destroy();
    }
  });
});
