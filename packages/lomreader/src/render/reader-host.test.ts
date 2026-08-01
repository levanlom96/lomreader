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
    expect(host.getLayout()).toBe('1-up');

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

  it('renders two iframes in 2-up spread mode', async () => {
    const publication = await openEpubFromBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter2'] }),
    );
    const container = document.createElement('div');
    const host = await createReaderHost(publication, {
      container,
      layout: '2-up',
    });

    expect(host.getLayout()).toBe('2-up');
    expect(host.getVisibleSpineIndices()).toEqual([0, 1]);
    expect(container.querySelectorAll('iframe.lomreader-content-frame')).toHaveLength(2);

    host.destroy();
  });

  it('advances by two spine items in 2-up mode', async () => {
    const publication = await openEpubFromBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter2', 'chapter', 'chapter2'] }),
    );
    const container = document.createElement('div');
    const host = await createReaderHost(publication, {
      container,
      layout: '2-up',
    });
    const spreadHandler = vi.fn();

    host.on('spreadchange', spreadHandler);

    expect(host.getCurrentLinearIndex()).toBe(0);
    expect(host.getVisibleSpineIndices()).toEqual([0, 1]);

    await host.next();

    expect(host.getCurrentLinearIndex()).toBe(2);
    expect(host.getVisibleSpineIndices()).toEqual([2, 3]);
    expect(spreadHandler).toHaveBeenCalledTimes(1);
    expect(spreadHandler.mock.calls[0]?.[0].detail.slots).toHaveLength(2);

    host.destroy();
  });

  it('can switch from 1-up to 2-up at runtime', async () => {
    const publication = await openEpubFromBytes(
      buildMinimalEpub({ spineIdrefs: ['chapter', 'chapter2'] }),
    );
    const container = document.createElement('div');
    const host = await createReaderHost(publication, { container });

    expect(host.getContentFrameElements()).toHaveLength(1);

    await host.setLayout('2-up');

    expect(host.getLayout()).toBe('2-up');
    expect(host.getVisibleSpineIndices()).toEqual([0, 1]);
    expect(host.getContentFrameElements()).toHaveLength(2);

    host.destroy();
  });
});
