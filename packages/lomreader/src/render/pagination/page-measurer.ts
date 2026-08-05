import {
  injectReaderStyles,
  measureDocumentPages,
  waitForDocumentLayout,
  wrapFlowForMeasurement,
} from './extract-fragment';
import { buildPageShellStyles, sanitizePreparedHtml } from './page-shell';
import type { PageRange, PageViewport } from './types';

export class PageMeasurer {
  private readonly iframe: HTMLIFrameElement;
  private attached = false;
  private ready: Promise<void> | undefined;

  constructor(sandbox = 'allow-same-origin') {
    this.iframe = document.createElement('iframe');
    this.iframe.setAttribute('sandbox', sandbox);
    this.iframe.setAttribute('title', 'EPUB page measurement');
    this.iframe.className = 'lomreader-measure-frame';
    this.iframe.setAttribute('aria-hidden', 'true');
    this.iframe.tabIndex = -1;
    this.iframe.style.position = 'fixed';
    this.iframe.style.left = '-10000px';
    this.iframe.style.top = '0';
    this.iframe.style.border = '0';
    this.iframe.style.margin = '0';
    this.iframe.style.padding = '0';
    this.iframe.style.visibility = 'hidden';
    this.iframe.style.pointerEvents = 'none';
  }

  destroy(): void {
    this.iframe.remove();
    this.attached = false;
    this.ready = undefined;
  }

  async measurePreparedDocument(
    preparedHtml: string,
    viewport: PageViewport,
  ): Promise<PageRange[]> {
    this.ensureAttached();
    this.configureIframe(viewport);
    await this.ensureBlankDocument();

    const document = this.iframe.contentDocument;

    if (!document?.documentElement) {
      throw new Error('Measurer iframe did not produce a document');
    }

    document.open();
    document.write(sanitizePreparedHtml(preparedHtml));
    document.close();

    const flow = wrapFlowForMeasurement(document);
    injectReaderStyles(document, buildPageShellStyles(viewport, 'measure'));

    await waitForDocumentLayout(document);

    return measureDocumentPages(document, flow, viewport.contentHeight);
  }

  private configureIframe(viewport: PageViewport): void {
    const shellWidth = viewport.contentWidth + viewport.padding * 2;

    this.iframe.style.width = `${shellWidth}px`;
    this.iframe.style.height = `${viewport.contentHeight + viewport.padding * 2}px`;
  }

  private ensureAttached(): void {
    if (this.attached) {
      return;
    }

    document.body.appendChild(this.iframe);
    this.attached = true;
  }

  private ensureBlankDocument(): Promise<void> {
    if (!this.ready) {
      this.ready = new Promise((resolve, reject) => {
        const onLoad = () => {
          this.iframe.removeEventListener('error', onError);
          resolve();
        };

        const onError = () => {
          this.iframe.removeEventListener('load', onLoad);
          reject(new Error('Failed to initialize measurer iframe'));
        };

        this.iframe.addEventListener('load', onLoad, { once: true });
        this.iframe.addEventListener('error', onError, { once: true });
        this.iframe.src = 'about:blank';
      });
    }

    return this.ready;
  }
}
