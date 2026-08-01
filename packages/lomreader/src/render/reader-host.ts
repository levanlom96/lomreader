import type { Publication, SpineItemRef } from '../types';
import {
  cfiRangeToDomRange,
  domRangeToCfiPoints,
  generateCfi,
  resolveCfi as resolvePublicationCfi,
  type CfiResolvedTarget,
} from '../cfi';
import {
  ContentFrame,
  findInitialSpineIndex,
  getLinearSpineIndices,
} from './content-frame';
import {
  ContentSpread,
  getSpreadLinearIndices,
  getSpreadStartLinearIndex,
  getSpreadStep,
} from './spread-layout';
import type {
  BeforeNavigateHook,
  ChapterChangeDetail,
  NavigateContext,
  ReaderHostEventMap,
  ReaderHostOptions,
  SpreadChangeDetail,
  SpreadLayout,
} from './types';

export class ReaderHost extends EventTarget {
  private readonly publication: Publication;
  private readonly contentSpread: ContentSpread;
  private readonly overlayElement: HTMLDivElement;
  private readonly hostElement: HTMLDivElement;
  private readonly beforeNavigateHooks: BeforeNavigateHook[] = [];
  private readonly linearSpineIndices: number[];
  private layout: SpreadLayout;
  private spreadStartLinearIndex = 0;
  private currentSpineIndex = -1;
  private destroyed = false;

  private constructor(
    publication: Publication,
    options: ReaderHostOptions,
  ) {
    super();

    this.publication = publication;
    this.linearSpineIndices = getLinearSpineIndices(publication);
    this.layout = options.layout ?? '1-up';
    this.contentSpread = new ContentSpread(options.sandbox);
    this.contentSpread.setLayout(this.layout);
    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'lomreader-overlay-layer';
    this.overlayElement.setAttribute('aria-hidden', 'true');

    this.hostElement = document.createElement('div');
    this.hostElement.className = 'lomreader-host';
    this.hostElement.append(this.contentSpread.element, this.overlayElement);

    options.container.replaceChildren(this.hostElement);
  }

  static async create(
    publication: Publication,
    options: ReaderHostOptions,
  ): Promise<ReaderHost> {
    const host = new ReaderHost(publication, options);
    const initialSpineIndex = findInitialSpineIndex(publication);
    const initialLinearIndex = host.linearSpineIndices.indexOf(initialSpineIndex);

    host.spreadStartLinearIndex = getSpreadStartLinearIndex(
      initialLinearIndex === -1 ? 0 : initialLinearIndex,
      host.layout,
    );

    await host.showSpreadAtLinearIndex(host.spreadStartLinearIndex);

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

  getLayout(): SpreadLayout {
    return this.layout;
  }

  async setLayout(layout: SpreadLayout): Promise<void> {
    this.assertActive();

    if (this.layout === layout) {
      return;
    }

    this.layout = layout;
    this.contentSpread.setLayout(layout);

    const alignedLinearIndex = getSpreadStartLinearIndex(
      this.getCurrentLinearIndex(),
      layout,
    );

    await this.showSpreadAtLinearIndex(alignedLinearIndex);
  }

  getOverlayElement(): HTMLDivElement {
    return this.overlayElement;
  }

  /** Primary (left / single) content iframe. */
  getContentFrameElement(): HTMLIFrameElement {
    return this.contentSpread.getPrimaryFrameElement();
  }

  getContentFrameElements(): HTMLIFrameElement[] {
    return this.contentSpread.getFrameElements();
  }

  getCurrentSpineIndex(): number {
    return this.currentSpineIndex;
  }

  getCurrentLinearIndex(): number {
    return this.spreadStartLinearIndex;
  }

  getVisibleSpineIndices(): number[] {
    return getSpreadLinearIndices(
      this.spreadStartLinearIndex,
      this.layout,
      this.linearSpineIndices.length,
    ).map((linearIndex) => this.linearSpineIndices[linearIndex]!);
  }

  getLinearSpineCount(): number {
    return this.linearSpineIndices.length;
  }

  async showSpineIndex(spineIndex: number): Promise<void> {
    this.assertActive();

    const linearIndex = this.linearSpineIndices.indexOf(spineIndex);

    if (linearIndex === -1) {
      throw new Error(`Spine index is not a linear renderable item: ${spineIndex}`);
    }

    await this.showSpreadAtLinearIndex(
      getSpreadStartLinearIndex(linearIndex, this.layout),
    );
  }

  async showSpreadAtLinearIndex(spreadStartLinearIndex: number): Promise<void> {
    this.assertActive();

    const visibleLinearIndices = getSpreadLinearIndices(
      spreadStartLinearIndex,
      this.layout,
      this.linearSpineIndices.length,
    );

    if (visibleLinearIndices.length === 0) {
      throw new Error(`Spread start out of range: ${spreadStartLinearIndex}`);
    }

    const targetSpineIndex = this.linearSpineIndices[visibleLinearIndices[0]!]!;

    if (
      this.currentSpineIndex >= 0 &&
      spreadStartLinearIndex === this.spreadStartLinearIndex &&
      this.layout === this.contentSpread.getLayout()
    ) {
      const alreadyVisible = visibleLinearIndices.every((linearIndex) =>
        this.getVisibleSpineIndices().includes(this.linearSpineIndices[linearIndex]!),
      );

      if (alreadyVisible) {
        return;
      }
    }

    const fromSpineIndex = this.currentSpineIndex;
    const fromPath =
      fromSpineIndex >= 0
        ? this.publication.spine.itemrefs[fromSpineIndex]!.item.path
        : '';
    const toPath = this.publication.spine.itemrefs[targetSpineIndex]!.item.path;

    const context: NavigateContext = {
      fromSpineIndex,
      toSpineIndex: targetSpineIndex,
      fromPath,
      toPath,
      layout: this.layout,
    };

    await this.runBeforeNavigateHooks(context);

    this.dispatchEvent(new CustomEvent('navigate', { detail: context }));

    const leftLinearIndex = visibleLinearIndices[0]!;
    const rightLinearIndex = visibleLinearIndices[1];
    const leftSpineIndex = this.linearSpineIndices[leftLinearIndex]!;
    const rightSpineIndex =
      rightLinearIndex === undefined
        ? undefined
        : this.linearSpineIndices[rightLinearIndex]!;

    const leftPath = this.publication.spine.itemrefs[leftSpineIndex]!.item.path;
    const rightPath =
      rightSpineIndex === undefined
        ? undefined
        : this.publication.spine.itemrefs[rightSpineIndex]!.item.path;

    await this.contentSpread.loadSpread(this.publication, leftPath, rightPath);

    this.spreadStartLinearIndex = spreadStartLinearIndex;
    this.currentSpineIndex = leftSpineIndex;

    const slots = this.buildSpreadSlots(leftSpineIndex, rightSpineIndex);
    const spreadDetail: SpreadChangeDetail = {
      layout: this.layout,
      spreadStartLinearIndex,
      slots,
    };

    this.dispatchEvent(new CustomEvent('spreadchange', { detail: spreadDetail }));

    const primarySlot = slots[0]!;

    this.dispatchEvent(
      new CustomEvent('chapterchange', {
        detail: primarySlot,
      }),
    );
  }

  async next(): Promise<void> {
    this.assertActive();

    const nextSpreadStart = this.spreadStartLinearIndex + getSpreadStep(this.layout);

    if (nextSpreadStart >= this.linearSpineIndices.length) {
      return;
    }

    await this.showSpreadAtLinearIndex(nextSpreadStart);
  }

  async prev(): Promise<void> {
    this.assertActive();

    const previousSpreadStart = this.spreadStartLinearIndex - getSpreadStep(this.layout);

    if (previousSpreadStart < 0) {
      return;
    }

    await this.showSpreadAtLinearIndex(previousSpreadStart);
  }

  async resolveCfi(cfi: string): Promise<CfiResolvedTarget> {
    this.assertActive();

    return resolvePublicationCfi(this.publication, cfi, {
      getDocument: async (documentPath) => this.getLiveDocument(documentPath),
    });
  }

  async generateCfiFromRange(range: Range, spineIndex = this.currentSpineIndex): Promise<string> {
    this.assertActive();

    if (spineIndex < 0) {
      throw new Error('Cannot generate CFI without a loaded spine item');
    }

    const { start, end } = domRangeToCfiPoints(range);

    return generateCfi(this.publication, spineIndex, { start, end });
  }

  async getSelectionCfi(): Promise<string | null> {
    this.assertActive();

    const frame = this.contentSpread.getPrimaryFrameElement();
    const selection = frame.contentDocument?.getSelection();

    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
      return null;
    }

    return this.generateCfiFromRange(selection.getRangeAt(0)!);
  }

  async goToCfi(cfi: string): Promise<CfiResolvedTarget> {
    this.assertActive();

    const target = await this.resolveCfi(cfi);

    await this.showSpineIndex(target.spineIndex);
    this.applyResolvedTarget(target);

    return target;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.contentSpread.destroy();
    this.publication.revokeBlobUrls();
    this.hostElement.remove();
  }

  private buildSpreadSlots(
    leftSpineIndex: number,
    rightSpineIndex: number | undefined,
  ): ChapterChangeDetail[] {
    const slots: ChapterChangeDetail[] = [
      this.toChapterDetail(leftSpineIndex, this.layout === '2-up' ? 'left' : 'single'),
    ];

    if (rightSpineIndex !== undefined) {
      slots.push(this.toChapterDetail(rightSpineIndex, 'right'));
    }

    return slots;
  }

  private toChapterDetail(
    spineIndex: number,
    slot: ChapterChangeDetail['slot'],
  ): ChapterChangeDetail {
    const itemref = this.publication.spine.itemrefs[spineIndex]!;

    return {
      spineIndex,
      path: itemref.item.path,
      href: itemref.item.href,
      idref: itemref.idref,
      slot,
    };
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

  private async getLiveDocument(documentPath: string): Promise<Document | null> {
    for (const frame of this.contentSpread.getFrameElements()) {
      const document = frame.contentDocument;

      if (!document?.documentElement) {
        continue;
      }

      const visiblePaths = this.getVisibleSpineIndices().map(
        (spineIndex) => this.publication.spine.itemrefs[spineIndex]!.item.path,
      );

      if (visiblePaths.includes(documentPath)) {
        return document;
      }
    }

    return null;
  }

  private applyResolvedTarget(target: CfiResolvedTarget): void {
    const frame = this.contentSpread.getPrimaryFrameElement();
    const document = frame.contentDocument;

    if (!document) {
      return;
    }

    if ('end' in target) {
      const range = cfiRangeToDomRange(document, target.start, target.end);
      const selection = document.getSelection();

      selection?.removeAllRanges();
      selection?.addRange(range);
      frame.contentWindow?.scrollTo(0, range.getBoundingClientRect().top);

      return;
    }

    const range = document.createRange();
    const node = target.node as unknown as Node;

    if (node.nodeType === Node.TEXT_NODE) {
      range.setStart(node, Math.min(target.offset, node.textContent?.length ?? 0));
    } else {
      range.setStart(node, Math.min(target.offset, node.childNodes.length));
    }

    range.collapse(true);

    const selection = document.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    frame.contentWindow?.scrollTo(0, range.getBoundingClientRect().top);
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

// Re-export ContentFrame for backward compatibility with direct imports.
export { ContentFrame };
