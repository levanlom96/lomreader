import { describe, expect, it } from 'vitest';
import {
  classifyContentResource,
  discoverReferences,
  isEpubContentDocument,
  resolveManifestReference,
} from './content-discovery';

describe('content-discovery', () => {
  describe('isEpubContentDocument', () => {
    it('identifies XHTML and SVG content documents', () => {
      expect(
        isEpubContentDocument({
          id: 'x',
          href: 'a.xhtml',
          mediaType: 'application/xhtml+xml',
          properties: [],
          path: 'EPUB/a.xhtml',
        }),
      ).toBe(true);
      expect(
        isEpubContentDocument({
          id: 's',
          href: 'a.svg',
          mediaType: 'image/svg+xml',
          properties: [],
          path: 'EPUB/a.svg',
        }),
      ).toBe(true);
    });
  });

  describe('classifyContentResource', () => {
    it('classifies core media types', () => {
      expect(classifyContentResource('text/css')).toBe('core-media-type');
      expect(classifyContentResource('image/png')).toBe('core-media-type');
    });

    it('classifies foreign and exempt resources', () => {
      expect(classifyContentResource('image/heic')).toBe('foreign');
      expect(classifyContentResource('application/pls+xml')).toBe('exempt');
    });
  });

  describe('discoverReferences', () => {
    it('finds references in XHTML documents', () => {
      const html = `
        <html>
          <head>
            <link rel="stylesheet" href="../styles/main.css"/>
            <script src="../scripts/app.js"></script>
          </head>
          <body>
            <img src="../images/cover.png"/>
            <a href="https://example.com">Remote</a>
          </body>
        </html>
      `;

      expect(discoverReferences(html, 'application/xhtml+xml')).toEqual(
        expect.arrayContaining([
          '../styles/main.css',
          '../scripts/app.js',
          '../images/cover.png',
          'https://example.com',
        ]),
      );
    });

    it('finds url() and @import references in CSS', () => {
      const css = `
        @import url("extra.css");
        body { background: url("../images/bg.png"); }
      `;

      expect(discoverReferences(css, 'text/css')).toEqual(
        expect.arrayContaining(['extra.css', '../images/bg.png']),
      );
    });

    it('ignores data URLs in CSS', () => {
      const css = `body { background: url("data:image/png;base64,abc"); }`;

      expect(discoverReferences(css, 'text/css')).toEqual([]);
    });
  });

  describe('resolveManifestReference', () => {
    it('resolves local hrefs relative to a source path', () => {
      expect(
        resolveManifestReference('../styles/main.css', 'EPUB/text/chapter.xhtml'),
      ).toBe('EPUB/styles/main.css');
    });

    it('returns undefined for remote and fragment-only hrefs', () => {
      expect(resolveManifestReference('#note-1', 'EPUB/text/chapter.xhtml')).toBeUndefined();
      expect(
        resolveManifestReference('https://example.com/x', 'EPUB/text/chapter.xhtml'),
      ).toBeUndefined();
    });
  });
});
