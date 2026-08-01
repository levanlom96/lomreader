import { describe, expect, it, vi } from 'vitest';
import { createReaderHost } from './reader-host';
import { openEpubFromBytes } from '../../test/helpers';
import { buildMinimalEpub } from '../../test/fixtures/build-epub';

describe('ReaderHost', () => {
  it('loads the first linear XHTML chapter into an iframe', async () => {
    const publication = await openEpubFromBytes(buildMinimalEpub());
    const container = document.createElement('div');
    const host = await createReaderHost(publication, { container });

    expect(host.getCurrentSpineIndex()).toBe(0);
    expect(host.getLinearSpineCount()).toBe(1);
    expect(container.querySelector('iframe.lomreader-content-frame')).toBeTruthy();
    expect(host.getOverlayElement()).toBeTruthy();

    host.destroy();
  });

  it('emits chapterchange when navigating', async () => {
    const publication = await openEpubFromBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter'] }),
    );
    const container = document.createElement('div');
    const host = await createReaderHost(publication, { container });
    const handler = vi.fn();

    host.on('chapterchange', handler);

    await host.next();

    expect(handler).toHaveBeenCalledTimes(1);

    host.destroy();
  });

  it('awaits beforeNavigate hooks before changing chapters', async () => {
    const publication = await openEpubFromBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter'] }),
    );
    const container = document.createElement('div');
    const host = await createReaderHost(publication, { container });
    const order: string[] = [];

    host.beforeNavigate(async () => {
      order.push('hook-start');
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('hook-end');
    });

    await host.next();

    expect(order).toEqual(['hook-start', 'hook-end']);

    host.destroy();
  });
});
