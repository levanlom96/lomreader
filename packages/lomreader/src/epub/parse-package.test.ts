import { describe, expect, it } from 'vitest';
import { parseEpubBytes } from '../../test/helpers';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';

describe('parse-package', () => {
  it('parses manifest publication resources', async () => {
    const { packageDocument } = await parseEpubBytes(buildMinimalEpub());

    expect(packageDocument.manifest.publicationResources).toHaveLength(4);
    expect(packageDocument.manifest.byId.get('chapter')).toMatchObject({
      href: 'text/chapter.xhtml',
      mediaType: 'application/xhtml+xml',
      path: 'EPUB/text/chapter.xhtml',
    });
  });

  it('parses linked resources from metadata links', async () => {
    const { packageDocument } = await parseEpubBytes(
      buildMinimalEpub({ includeLinkedResource: true }),
    );

    expect(packageDocument.manifest.linkedResources).toHaveLength(1);
    expect(packageDocument.manifest.linkedResources[0]).toMatchObject({
      href: 'https://example.com/metadata.xml',
      rel: 'record',
    });
  });

  it('parses spine itemrefs in order', async () => {
    const { packageDocument } = await parseEpubBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter'] }),
    );

    expect(packageDocument.spine.itemrefs).toHaveLength(2);
    expect(packageDocument.spine.itemrefs[0]?.idref).toBe('chapter');
    expect(packageDocument.spine.itemrefs[0]?.item.path).toBe('EPUB/text/chapter.xhtml');
  });

  it('resolves manifest fallback chains on spine entries', async () => {
    const { packageDocument } = await parseEpubBytes(
      buildMinimalEpub({ includeFallback: true }),
    );

    const foreign = packageDocument.spine.itemrefs.find(
      (itemref) => itemref.idref === 'foreign',
    );

    expect(foreign?.fallbackChain).toHaveLength(1);
    expect(foreign?.fallbackChain[0]?.id).toBe('chapter');
  });

  it('extracts package metadata', async () => {
    const { packageDocument } = await parseEpubBytes(
      buildMinimalEpub({
        identifier: 'urn:uuid:custom-id',
        title: 'Custom Title',
      }),
    );

    expect(packageDocument.version).toBe('3.0');
    expect(packageDocument.uniqueIdentifier).toBe('urn:uuid:custom-id');
  });

  it('includes nav documents from manifest properties', async () => {
    const { packageDocument } = await parseEpubBytes(
      buildMinimalEpub({ includeNav: true }),
    );

    const nav = packageDocument.manifest.byId.get('nav');

    expect(nav?.properties).toContain('nav');
    expect(nav?.path).toBe('EPUB/nav.xhtml');
  });
});
