import { describe, expect, it } from 'vitest';
import { createReader } from './reader';
import {
  loadHypatiaEpub,
  mockFetchWithBytes,
  mockFetchWithStatus,
  openEpubFromBytes,
} from '../test/helpers';
import { buildMinimalEpub } from '../test/fixtures/build-epub';

describe('createReader', () => {
  it('returns a reader with the current library version', () => {
    expect(createReader().version).toBe('0.0.1');
  });

  it('throws when fetch is not a function', () => {
    expect(() =>
      createReader({ fetch: 'invalid' as unknown as typeof fetch }),
    ).toThrow(/fetch implementation/);
  });
});

describe('LomReader.open', () => {
  it('loads a minimal EPUB and exposes all three planes', async () => {
    const publication = await openEpubFromBytes(buildMinimalEpub());

    expect(publication.manifest.publicationResources.length).toBeGreaterThan(0);
    expect(publication.spine.itemrefs.length).toBeGreaterThan(0);
    expect(publication.content.resources.length).toBeGreaterThan(0);
  });

  it('reads text and bytes from the archive', async () => {
    const publication = await openEpubFromBytes(buildMinimalEpub());

    const css = await publication.getText('EPUB/styles/main.css');
    expect(css).toContain('background-image');

    const bytes = await publication.getBytes('EPUB/text/chapter.xhtml');
    expect(bytes.byteLength).toBeGreaterThan(0);
  });

  it('resolves hrefs relative to a source path', async () => {
    const publication = await openEpubFromBytes(buildMinimalEpub());

    expect(
      publication.resolveHref('../styles/main.css', 'EPUB/text/chapter.xhtml'),
    ).toBe('EPUB/styles/main.css');
  });

  it('throws when fetch fails', async () => {
    const reader = createReader({ fetch: mockFetchWithStatus(404, 'Not Found') });

    await expect(reader.open('http://test.local/missing.epub')).rejects.toThrow(
      /Failed to fetch EPUB \(404/,
    );
  });

  it('throws when reading a missing resource', async () => {
    const publication = await openEpubFromBytes(buildMinimalEpub());

    await expect(publication.getText('EPUB/missing.txt')).rejects.toThrow(
      /Resource not found/,
    );
    await expect(publication.getBytes('EPUB/missing.txt')).rejects.toThrow(
      /Resource not found/,
    );
  });

  it('loads hypatia.epub end-to-end', async () => {
    const bytes = await loadHypatiaEpub();
    const reader = createReader({ fetch: mockFetchWithBytes(bytes) });
    const publication = await reader.open('http://localhost:3001/epubs/hypatia.epub');

    expect(publication.manifest.publicationResources).toHaveLength(45);
    expect(publication.spine.itemrefs).toHaveLength(38);

    const chapter = await publication.getText('epub/text/chapter-1.xhtml');
    expect(chapter.toLowerCase()).toContain('<html');
  });
});
