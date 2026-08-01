import { describe, expect, it } from 'vitest';
import {
  listArchivePaths,
  loadArchive,
  readArchiveBytes,
  readArchiveText,
} from './archive';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';

describe('archive', () => {
  it('loads a minimal EPUB ZIP into a path map', async () => {
    const archive = await loadArchive(buildMinimalEpub());

    expect(archive.has('mimetype')).toBe(true);
    expect(archive.has('META-INF/container.xml')).toBe(true);
    expect(archive.has('EPUB/content.opf')).toBe(true);
    expect(listArchivePaths(archive).length).toBeGreaterThan(3);
  });

  it('reads UTF-8 text from container paths', async () => {
    const archive = await loadArchive(buildMinimalEpub());
    const text = readArchiveText(archive, 'META-INF/container.xml');

    expect(text).toContain('<rootfile');
    expect(text).toContain('EPUB/content.opf');
  });

  it('reads raw bytes from container paths', async () => {
    const archive = await loadArchive(buildMinimalEpub());
    const bytes = readArchiveBytes(archive, 'mimetype');

    expect(bytes).toBeDefined();
    expect(new TextDecoder().decode(bytes!)).toBe('application/epub+zip');
  });

  it('returns undefined for missing paths', async () => {
    const archive = await loadArchive(buildMinimalEpub());

    expect(readArchiveText(archive, 'missing/file.txt')).toBeUndefined();
    expect(readArchiveBytes(archive, 'missing/file.txt')).toBeUndefined();
  });

  it('normalizes leading slashes in zip entry names', async () => {
    const archive = await loadArchive(buildMinimalEpub());

    expect(readArchiveText(archive, '/META-INF/container.xml')).toContain('rootfile');
  });
});
