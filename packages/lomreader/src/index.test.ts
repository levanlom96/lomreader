import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { createReader } from './reader';
import { loadArchive } from './epub/archive';
import { findPackageDocumentPath } from './epub/parse-container';
import { parsePackageDocument } from './epub/parse-package';
import { buildContentPlane } from './epub/planes';

const fixturePath = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../../../apps/epub-server/public/epubs/hypatia.epub',
);

async function loadFixture(): Promise<Uint8Array> {
  const buffer = await readFile(fixturePath);
  return new Uint8Array(buffer);
}

describe('createReader', () => {
  it('returns a reader with the current library version', () => {
    const reader = createReader();

    expect(reader.version).toBe('0.0.1');
  });
});

describe('EPUB planes', () => {
  it('parses manifest, spine, and content planes from hypatia.epub', async () => {
    const archive = await loadArchive(await loadFixture());
    const packagePath = findPackageDocumentPath(archive);
    const packageDocument = parsePackageDocument(archive, packagePath);
    const content = buildContentPlane(archive, packageDocument);

    expect(packagePath).toBe('epub/content.opf');
    expect(packageDocument.version).toBe('3.0');
    expect(packageDocument.uniqueIdentifier).toBe(
      'https://standardebooks.org/ebooks/charles-kingsley/hypatia',
    );

    expect(packageDocument.manifest.publicationResources.length).toBeGreaterThan(30);
    expect(packageDocument.manifest.linkedResources.length).toBeGreaterThan(0);
    expect(packageDocument.spine.itemrefs.length).toBeGreaterThan(30);
    expect(packageDocument.spine.itemrefs[0]?.item.href).toBe('text/titlepage.xhtml');

    const cssResources = content.resources.filter(
      (resource) => resource.item.mediaType === 'text/css',
    );

    expect(cssResources.length).toBeGreaterThanOrEqual(3);
    expect(content.resources.some((resource) => resource.usedBy.length > 0)).toBe(
      true,
    );
  });
});

describe('reader.open', () => {
  it('loads an EPUB from a URL and exposes the three planes', async () => {
    const bytes = await loadFixture();
    const reader = createReader({
      fetch: async () =>
        new Response(new Blob([Buffer.from(bytes)]), {
          status: 200,
          headers: { 'Content-Type': 'application/epub+zip' },
        }),
    });

    const publication = await reader.open(
      'http://localhost:3001/epubs/hypatia.epub',
    );

    expect(publication.url).toBe('http://localhost:3001/epubs/hypatia.epub');
    expect(publication.manifest.publicationResources).toHaveLength(45);
    expect(publication.spine.itemrefs).toHaveLength(38);
    expect(publication.content.resources.length).toBeGreaterThan(3);

    const firstChapter = publication.spine.itemrefs.find(
      (itemref) => itemref.idref === 'chapter-1.xhtml',
    );

    expect(firstChapter?.item.path).toBe('epub/text/chapter-1.xhtml');

    const chapterText = await publication.getText('epub/text/chapter-1.xhtml');
    expect(chapterText).toContain('<?xml');
    expect(chapterText.toLowerCase()).toContain('<html');
  });
});
