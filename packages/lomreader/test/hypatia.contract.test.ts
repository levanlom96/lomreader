import { describe, expect, it } from 'vitest';
import { prepareContentDocument } from '../src/render/prepare-document';
import { loadHypatiaEpub, openEpubFromBytes, parseEpubBytes } from './helpers';

/**
 * Frozen contract for hypatia.epub — update only when parser changes are intentional.
 * @see docs/testing.md
 */
export const HYPATIA_CONTRACT = {
  packagePath: 'epub/content.opf',
  version: '3.0',
  identifier: 'https://standardebooks.org/ebooks/charles-kingsley/hypatia',
  publicationResourceCount: 45,
  linkedResourceCountMin: 1,
  spineItemrefCount: 38,
  firstSpineHref: 'text/titlepage.xhtml',
  firstSpineIdref: 'titlepage.xhtml',
  chapter1Idref: 'chapter-1.xhtml',
  chapter1Path: 'epub/text/chapter-1.xhtml',
  cssResourceCountMin: 3,
  contentResourceCountMin: 3,
  manifestItemIds: [
    'core.css',
    'local.css',
    'se.css',
    'cover.svg',
    'toc.xhtml',
    'chapter-1.xhtml',
  ],
} as const;

describe('hypatia.epub contract', () => {
  it('matches frozen manifest plane counts', async () => {
    const bytes = await loadHypatiaEpub();
    const { packagePath, packageDocument } = await parseEpubBytes(bytes);

    expect(packagePath).toBe(HYPATIA_CONTRACT.packagePath);
    expect(packageDocument.version).toBe(HYPATIA_CONTRACT.version);
    expect(packageDocument.uniqueIdentifier).toBe(HYPATIA_CONTRACT.identifier);
    expect(packageDocument.manifest.publicationResources).toHaveLength(
      HYPATIA_CONTRACT.publicationResourceCount,
    );
    expect(
      packageDocument.manifest.linkedResources.length,
    ).toBeGreaterThanOrEqual(HYPATIA_CONTRACT.linkedResourceCountMin);
  });

  it('matches frozen spine plane shape', async () => {
    const bytes = await loadHypatiaEpub();
    const { packageDocument } = await parseEpubBytes(bytes);

    expect(packageDocument.spine.itemrefs).toHaveLength(
      HYPATIA_CONTRACT.spineItemrefCount,
    );
    expect(packageDocument.spine.itemrefs[0]?.idref).toBe(
      HYPATIA_CONTRACT.firstSpineIdref,
    );
    expect(packageDocument.spine.itemrefs[0]?.item.href).toBe(
      HYPATIA_CONTRACT.firstSpineHref,
    );
    expect(packageDocument.spine.itemrefs[0]?.linear).toBe(true);

    const chapter1 = packageDocument.spine.itemrefs.find(
      (itemref) => itemref.idref === HYPATIA_CONTRACT.chapter1Idref,
    );

    expect(chapter1?.item.path).toBe(HYPATIA_CONTRACT.chapter1Path);
  });

  it('matches frozen manifest item ids', async () => {
    const bytes = await loadHypatiaEpub();
    const { packageDocument } = await parseEpubBytes(bytes);

    for (const id of HYPATIA_CONTRACT.manifestItemIds) {
      expect(packageDocument.manifest.byId.has(id)).toBe(true);
    }
  });

  it('matches frozen content plane expectations', async () => {
    const bytes = await loadHypatiaEpub();
    const { content } = await parseEpubBytes(bytes);

    const cssResources = content.resources.filter(
      (resource) => resource.item.mediaType === 'text/css',
    );

    expect(cssResources.length).toBeGreaterThanOrEqual(
      HYPATIA_CONTRACT.cssResourceCountMin,
    );
    expect(content.resources.length).toBeGreaterThanOrEqual(
      HYPATIA_CONTRACT.contentResourceCountMin,
    );
    expect(
      content.resources.every((resource) => resource.usedBy.length > 0),
    ).toBe(true);
    expect(
      content.resources.every((resource) =>
        ['core-media-type', 'foreign', 'exempt', 'unknown'].includes(
          resource.classification,
        ),
      ),
    ).toBe(true);
  });

  it('prepares the first linear XHTML chapter for rendering', async () => {
    const bytes = await loadHypatiaEpub();
    const { packageDocument } = await parseEpubBytes(bytes);
    const publication = await openEpubFromBytes(bytes);
    const firstLinear = packageDocument.spine.itemrefs.find(
      (itemref) =>
        itemref.linear && itemref.item.mediaType === 'application/xhtml+xml',
    );

    expect(firstLinear).toBeDefined();

    const url = await prepareContentDocument(
      publication.blobStore,
      publication.manifest,
      firstLinear!.item.path,
      (path) => publication.getText(path),
    );

    expect(url.startsWith('blob:')).toBe(true);

    const html = await (await fetch(url)).text();

    expect(html.toLowerCase()).toContain('<html');
    expect(html).toMatch(/blob:/);
  });
});
