import { describe, expect, it, vi } from 'vitest';
import { loadArchive, readArchiveBytes } from '../epub/archive';
import { parsePackageDocument } from '../epub/parse-package';
import { BlobUrlStore, guessMediaType, resolveMediaType } from './blob-store';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';
import { parseEpubBytes } from '../../test/helpers';

describe('blob-store', () => {
  it('guesses common media types from extensions', () => {
    expect(guessMediaType('styles/main.css')).toBe('text/css');
    expect(guessMediaType('text/chapter.xhtml')).toBe('application/xhtml+xml');
    expect(guessMediaType('images/cover.png')).toBe('image/png');
  });

  it('creates and caches blob URLs for container paths', async () => {
    const { archive, packageDocument } = await parseEpubBytes(buildMinimalEpub());
    const store = new BlobUrlStore(
      async (path) => {
        const bytes = readArchiveBytes(archive, path);

        if (!bytes) {
          throw new Error(`missing ${path}`);
        }

        return bytes;
      },
      packageDocument.manifest,
    );

    const first = await store.getBlobUrl('EPUB/styles/main.css');
    const second = await store.getBlobUrl('EPUB/styles/main.css');

    expect(first).toBe(second);
    expect(first.startsWith('blob:')).toBe(true);
    expect(resolveMediaType('EPUB/styles/main.css', packageDocument.manifest)).toBe(
      'text/css',
    );
  });

  it('revokes all registered blob URLs', async () => {
    const { archive, packageDocument } = await parseEpubBytes(buildMinimalEpub());
    const store = new BlobUrlStore(
      async (path) => readArchiveBytes(archive, path)!,
      packageDocument.manifest,
    );

    const url = await store.getBlobUrl('EPUB/text/chapter.xhtml');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    store.revokeAll();

    expect(revokeSpy).toHaveBeenCalledWith(url);
  });
});
