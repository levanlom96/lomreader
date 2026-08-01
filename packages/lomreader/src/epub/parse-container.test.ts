import { describe, expect, it } from 'vitest';
import { loadArchive } from './archive';
import { findPackageDocumentPath } from './parse-container';
import {
  buildInvalidContainerEpub,
  buildMinimalEpub,
  buildMissingPackageEpub,
} from '../../test/fixtures/build-epub';

describe('parse-container', () => {
  it('finds the package document path from container.xml', async () => {
    const archive = await loadArchive(buildMinimalEpub());

    expect(findPackageDocumentPath(archive)).toBe('EPUB/content.opf');
  });

  it('supports custom package paths', async () => {
    const archive = await loadArchive(
      buildMinimalEpub({ packagePath: 'books/package.opf' }),
    );

    expect(findPackageDocumentPath(archive)).toBe('books/package.opf');
  });

  it('throws when container.xml is missing', async () => {
    const archive = await loadArchive(buildMinimalEpub());
    const emptyArchive = new Map(archive);
    emptyArchive.delete('META-INF/container.xml');

    expect(() => findPackageDocumentPath(emptyArchive)).toThrow(/Missing required/);
  });

  it('throws when container.xml is malformed', async () => {
    const archive = await loadArchive(buildInvalidContainerEpub());

    expect(() => findPackageDocumentPath(archive)).toThrow(/missing rootfiles/);
  });

  it('throws when the package document is missing', async () => {
    const archive = await loadArchive(buildMissingPackageEpub());

    expect(() => findPackageDocumentPath(archive)).toThrow(/Package document not found/);
  });
});
