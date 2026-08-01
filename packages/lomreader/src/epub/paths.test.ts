import { describe, expect, it } from 'vitest';
import {
  decodePath,
  directoryOf,
  isRemoteHref,
  normalizeContainerPath,
  resolveRelativePath,
} from './paths';

describe('paths', () => {
  describe('normalizeContainerPath', () => {
    it('converts backslashes and strips leading slashes', () => {
      expect(normalizeContainerPath('\\epub\\content.opf')).toBe('epub/content.opf');
      expect(normalizeContainerPath('/META-INF/container.xml')).toBe(
        'META-INF/container.xml',
      );
    });
  });

  describe('resolveRelativePath', () => {
    it('resolves manifest hrefs relative to the OPF path', () => {
      expect(resolveRelativePath('epub/content.opf', 'text/chapter-1.xhtml')).toBe(
        'epub/text/chapter-1.xhtml',
      );
    });

    it('resolves parent-directory segments', () => {
      expect(
        resolveRelativePath('epub/text/chapter.xhtml', '../styles/main.css'),
      ).toBe('epub/styles/main.css');
    });

    it('handles current-directory segments', () => {
      expect(resolveRelativePath('epub/content.opf', './text/chapter.xhtml')).toBe(
        'epub/text/chapter.xhtml',
      );
    });
  });

  describe('directoryOf', () => {
    it('returns parent directory without trailing slash', () => {
      expect(directoryOf('epub/text/chapter.xhtml')).toBe('epub/text');
      expect(directoryOf('mimetype')).toBe('');
    });
  });

  describe('isRemoteHref', () => {
    it('detects remote URLs', () => {
      expect(isRemoteHref('https://example.com/font.woff2')).toBe(true);
      expect(isRemoteHref('mailto:author@example.com')).toBe(true);
      expect(isRemoteHref('../styles/main.css')).toBe(false);
      expect(isRemoteHref('#fragment')).toBe(false);
    });
  });

  describe('decodePath', () => {
    it('decodes percent-encoded paths safely', () => {
      expect(decodePath('chapter%201.xhtml')).toBe('chapter 1.xhtml');
      expect(decodePath('plain.xhtml')).toBe('plain.xhtml');
    });
  });
});
