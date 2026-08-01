import type { Publication, SpineItemRef } from '../types';
import {
  ContentFrame,
  findInitialSpineIndex,
  getLinearSpineIndices,
} from './content-frame';
import type {
  BeforeNavigateHook,
  NavigateContext,
  ReaderHostEventMap,
  ReaderHostOptions,
} from './types';

export class ReaderHost extends EventTarget {
  private readonly publication: Publication;
  private readonly contentFrame: ContentFrame;
  private readonly overlayElement: HTMLDivElement;
  private readonly hostElement: HTMLDivElement;
  private readonly beforeNavigateHooks: BeforeNavigateHook[] = [];
  private readonly linearSpineIndices: number[];
  private currentLinearIndex = 0;
  private currentSpineIndex = -1;
  private destroyed = false;

  private constructor(
    publication: Publication,
    options: ReaderHostOptions,
  ) {
    super();

    this.publication = publication;
    this.linearSpineIndices = getLinearSpineIndices(publication);
    this.contentFrame = new ContentFrame(options.sandbox);
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'lomreader-overlay-layer';
    this.overlayElement.setAttribute('aria-hidden', 'true');

    this.hostElement = document.createElement('div');
    this.hostElement.className = 'lomreader-host';
    this.hostElement.append(this.contentFrame.element, this.overlayElement);

    options.container.replaceChildren(this.hostElement);
  }

  static async create(
    publication: Publication,
    options: ReaderHostOptions,
  ): Promise<ReaderHost> {
    const host = new ReaderHost(publication, options);
    const initialSpineIndex = findInitialSpineIndex(publication);

    host.currentLinearIndex = host.linearSpineIndices.indexOf(initialSpineIndex);

    if (host.currentLinearIndex === -1) {
      host.currentLinearIndex = 0;
    }

    await host.showSpineIndex(initialSpineIndex);

    return host;
  }

  beforeNavigate(hook: BeforeNavigateHook): this {
    this.beforeNavigateHooks.push(hook);

    return this;
  }

  on<K extends keyof ReaderHostEventMap>(
    type: K,
    listener: (event: ReaderHostEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions,
  ): this {
    super.addEventListener(type, listener as EventListener, options);

    return this;
  }

  off<K extends keyof ReaderHostEventMap>(
    type: K,
    listener: (event: ReaderHostEventMap[K]) => void,
    options?: boolean | EventListenerOptions,
  ): this {
    super.removeEventListener(type, listener as EventListener, options);

    return this;
  }

  getOverlayElement(): HTMLDivElement {
    return this.overlayElement;
  }

  getContentFrameElement(): HTMLIFrameElement {
    return this.contentFrame.element;
  }

  getCurrentSpineIndex(): number {
    return this.currentSpineIndex;
  }

  getCurrentLinearIndex(): number {
    return this.currentLinearIndex;
  }

  getLinearSpineCount(): number {
    return this.linearSpineIndices.length;
  }

  async showSpineIndex(spineIndex: number): Promise<void> {
    this.assertActive();

    const itemref = this.publication.spine.itemrefs[spineIndex];

    if (!itemref) {
      throw new Error(`Spine index out of range: ${spineIndex}`);
    }

    if (this.currentSpineIndex === spineIndex) {
      return;
    }

    const fromSpineIndex = this.currentSpineIndex;
    const fromPath =
      fromSpineIndex >= 0
        ? this.publication.spine.itemrefs[fromSpineIndex]!.item.path
        : '';

    const context: NavigateContext = {
      fromSpineIndex,
      toSpineIndex: spineIndex,
      fromPath,
      toPath: itemref.item.path,
    };

    await this.runBeforeNavigateHooks(context);

    this.dispatchEvent(new CustomEvent('navigate', { detail: context }));

    await this.contentFrame.loadChapter(this.publication, itemref.item.path);

    this.currentSpineIndex = spineIndex;
    this.currentLinearIndex = this.linearSpineIndices.indexOf(spineIndex);

    this.dispatchEvent(
      new CustomEvent('chapterchange', {
        detail: {
          spineIndex,
          path: itemref.item.path,
          href: itemref.item.href,
          idref: itemref.idref,
        },
      }),
    );
  }

  async next(): Promise<void> {
    this.assertActive();

    const nextLinearIndex = this.currentLinearIndex + 1;

    if (nextLinearIndex >= this.linearSpineIndices.length) {
      return;
    }

    await this.showSpineIndex(this.linearSpineIndices[nextLinearIndex]!);
  }

  async prev(): Promise<void> {
    this.assertActive();

    const previousLinearIndex = this.currentLinearIndex - 1;

    if (previousLinearIndex < 0) {
      return;
    }

    await this.showSpineIndex(this.linearSpineIndices[previousLinearIndex]!);
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.contentFrame.destroy();
    this.publication.revokeBlobUrls();
    this.hostElement.remove();
  }

  private async runBeforeNavigateHooks(context: NavigateContext): Promise<void> {
    for (const hook of this.beforeNavigateHooks) {
      await hook(context);
    }
  }

  private assertActive(): void {
    if (this.destroyed) {
      throw new Error('ReaderHost has been destroyed');
    }
  }
}

export async function createReaderHost(
  publication: Publication,
  options: ReaderHostOptions,
): Promise<ReaderHost> {
  return ReaderHost.create(publication, options);
}

export function getSpineItemRef(
  publication: Publication,
  spineIndex: number,
): SpineItemRef | undefined {
  return publication.spine.itemrefs[spineIndex];
}
