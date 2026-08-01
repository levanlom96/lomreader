import { describe, expect, it } from 'vitest';
import { readArchiveText } from '../epub/archive';
import { BlobUrlStore } from './blob-store';
import { prepareContentDocument } from './prepare-document';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';
import { parseEpubBytes } from '../../test/helpers';

describe('prepareContentDocument', () => {
  it('rewrites stylesheet and image references to blob URLs', async () => {
    const { archive, packageDocument } = await parseEpubBytes(buildMinimalEpub());
    const getText = async (path: string) => {
      const text = readArchiveText(archive, path);

      if (!text) {
        throw new Error(`missing ${path}`);
      }

      return text;
    };

    const store = new BlobUrlStore(
      async (path) => {
        const text = await getText(path);

        return new TextEncoder().encode(text);
      },
      packageDocument.manifest,
    );

    const chapterUrl = await prepareContentDocument(
      store,
      packageDocument.manifest,
      'EPUB/text/chapter.xhtml',
      getText,
    );

    expect(chapterUrl.startsWith('blob:')).toBe(true);

    const html = await (await fetch(chapterUrl)).text();

    expect(html).toMatch(/href="blob:[^"]+"/);
    expect(html).toMatch(/src="blob:[^"]+"/);
  });
});
