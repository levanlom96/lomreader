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
  BookPageIndex,
  getPageSpreadStep,
  getPublicationBookKey,
  getSpreadStartPageIndex,
} from './pagination/book-page-index';
import {
  createLocalStoragePageMapCache,
  createMemoryPageMapCache,
  type PageMapCacheStore,
} from './pagination/page-cache';
import {
  DEFAULT_PAGE_PADDING,
  derivePageViewport,
  viewportCacheKey,
} from './pagination/page-shell';
import type { PageViewport } from './pagination/types';
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
  PaginateProgressDetail,
  PaginateReadyDetail,
  ReaderHostEventMap,
  ReaderHostOptions,
  SpreadChangeDetail,
  SpreadLayout,
} from './types';

function defaultPageMapCache(): PageMapCacheStore {
  try {
    if (typeof localStorage !== 'undefined') {
      return createLocalStoragePageMapCache();
    }
  } catch {
    // localStorage may be unavailable in sandboxed contexts.
  }

  return createMemoryPageMapCache();
}

function defaultBookVersion(publication: Publication): string {
  return (
    publication.packageDocument.version ??
    publication.packageDocument.uniqueIdentifier ??
    '1'
  );
}

export class ReaderHost extends EventTarget {
  private readonly publication: Publication;
  private readonly contentSpread: ContentSpread;
  private readonly overlayElement: HTMLDivElement;
  private readonly hostElement: HTMLDivElement;
  private readonly beforeNavigateHooks: BeforeNavigateHook[] = [];
  private readonly linearSpineIndices: number[];
  private readonly paginationEnabled: boolean;
  private readonly pagePadding: number;
  private readonly bookVersion: string;
  private readonly pageMapCache: PageMapCacheStore;
  private readonly onPaginateProgress?: (detail: PaginateProgressDetail) => void;
  private readonly onPaginateReady?: (detail: PaginateReadyDetail) => void;
  private readonly viewportContainer: HTMLElement;
  private layout: SpreadLayout;
  private spreadStartLinearIndex = 0;
  private spreadStartPageIndex = 0;
  private currentSpineIndex = -1;
  private pageIndex: BookPageIndex | undefined;
  private pageViewport: PageViewport | undefined;
  private resizeObserver: ResizeObserver | undefined;
  private resizeScheduled = false;
  private destroyed = false;

  private constructor(
    publication: Publication,
    options: ReaderHostOptions,
  ) {
    super();

    this.publication = publication;
    this.linearSpineIndices = getLinearSpineIndices(publication);
    this.layout = options.layout ?? '1-up';
    this.paginationEnabled = options.pagination ?? true;
    this.pagePadding = options.pagePadding ?? DEFAULT_PAGE_PADDING;
    this.bookVersion = options.bookVersion ?? defaultBookVersion(publication);
    this.pageMapCache = options.pageMapCache ?? defaultPageMapCache();
    this.onPaginateProgress = options.onPaginateProgress;
    this.onPaginateReady = options.onPaginateReady;
    this.viewportContainer = options.container;
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

    if (host.paginationEnabled) {
      await host.initializePagination(options.pageViewport);
      return host;
    }

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

  isPaginationEnabled(): boolean {
    return this.paginationEnabled;
  }

  async setLayout(layout: SpreadLayout): Promise<void> {
    this.assertActive();

    if (this.layout === layout) {
      return;
    }

    if (this.paginationEnabled) {
      const currentPage = this.spreadStartPageIndex;
      this.layout = layout;
      this.contentSpread.setLayout(layout);
      this.pageViewport = derivePageViewport(this.viewportContainer, this.layout, this.pagePadding);
      await this.rebuildPageIndex();
      await this.showPageSpread(getSpreadStartPageIndex(currentPage, layout));
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
    if (this.paginationEnabled) {
      const page = this.pageIndex?.getPage(this.spreadStartPageIndex);

      if (!page) {
        return 0;
      }

      const linearIndex = this.linearSpineIndices.indexOf(page.spineIndex);

      return linearIndex === -1 ? 0 : linearIndex;
    }

    return this.spreadStartLinearIndex;
  }

  getCurrentPageIndex(): number {
    return this.spreadStartPageIndex;
  }

  getTotalPages(): number {
    return this.pageIndex?.getTotalPages() ?? 0;
  }

  getVisibleSpineIndices(): number[] {
    if (this.paginationEnabled) {
      const indices = new Set<number>();
      const leftPage = this.pageIndex?.getPage(this.spreadStartPageIndex);

      if (leftPage) {
        indices.add(leftPage.spineIndex);
      }

      if (this.layout === '2-up') {
        const rightPage = this.pageIndex?.getPage(this.spreadStartPageIndex + 1);

        if (rightPage) {
          indices.add(rightPage.spineIndex);
        }
      }

      return [...indices];
    }

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

    if (this.paginationEnabled) {
      const startPage = this.pageIndex?.getChapterStartPage(spineIndex);

      if (startPage === undefined) {
        throw new Error(`Spine index is not a linear renderable item: ${spineIndex}`);
      }

      await this.showPageSpread(startPage);
      return;
    }

    const linearIndex = this.linearSpineIndices.indexOf(spineIndex);

    if (linearIndex === -1) {
      throw new Error(`Spine index is not a linear renderable item: ${spineIndex}`);
    }

    await this.showSpreadAtLinearIndex(
      getSpreadStartLinearIndex(linearIndex, this.layout),
    );
  }

  async showPageSpread(spreadStartPageIndex: number): Promise<void> {
    this.assertActive();

    if (!this.paginationEnabled || !this.pageIndex || !this.pageViewport) {
      throw new Error('Pagination is not enabled');
    }

    const totalPages = this.pageIndex.getTotalPages();

    if (totalPages === 0) {
      throw new Error('Publication has no paginated pages');
    }

    const alignedStart = getSpreadStartPageIndex(spreadStartPageIndex, this.layout);

    if (alignedStart >= totalPages) {
      return;
    }

    const leftPage = this.pageIndex.getPage(alignedStart);
    const rightPage =
      this.layout === '2-up' ? this.pageIndex.getPage(alignedStart + 1) : undefined;

    if (!leftPage) {
      throw new Error(`Page index out of range: ${alignedStart}`);
    }

    if (
      this.currentSpineIndex >= 0 &&
      alignedStart === this.spreadStartPageIndex &&
      this.layout === this.contentSpread.getLayout()
    ) {
      const sameLeft = leftPage.globalIndex === this.spreadStartPageIndex;
      const sameRight =
        this.layout === '1-up' ||
        rightPage?.globalIndex === this.spreadStartPageIndex + 1;

      if (sameLeft && sameRight) {
        return;
      }
    }

    const fromSpineIndex = this.currentSpineIndex;
    const fromPath =
      fromSpineIndex >= 0
        ? this.publication.spine.itemrefs[fromSpineIndex]!.item.path
        : '';
    const toPath = leftPage.path;

    const context: NavigateContext = {
      fromSpineIndex,
      toSpineIndex: leftPage.spineIndex,
      fromPath,
      toPath,
      layout: this.layout,
      fromPageIndex: this.spreadStartPageIndex,
      toPageIndex: alignedStart,
    };

    await this.runBeforeNavigateHooks(context);

    this.dispatchEvent(new CustomEvent('navigate', { detail: context }));

    const [leftHtml, rightHtml] = await Promise.all([
      this.pageIndex.preparePageHtml(leftPage, this.pageViewport),
      rightPage ? this.pageIndex.preparePageHtml(rightPage, this.pageViewport) : undefined,
    ]);

    this.contentSpread.loadPageSpread(leftHtml, rightHtml);

    this.spreadStartPageIndex = alignedStart;
    this.currentSpineIndex = leftPage.spineIndex;

    const slots: ChapterChangeDetail[] = [
      this.toChapterDetail(leftPage.spineIndex, this.layout === '2-up' ? 'left' : 'single', {
        pageIndex: leftPage.pageIndex,
        globalPageIndex: leftPage.globalIndex,
      }),
    ];

    if (rightPage) {
      slots.push(
        this.toChapterDetail(rightPage.spineIndex, 'right', {
          pageIndex: rightPage.pageIndex,
          globalPageIndex: rightPage.globalIndex,
        }),
      );
    }

    const spreadDetail: SpreadChangeDetail = {
      layout: this.layout,
      spreadStartLinearIndex: this.getCurrentLinearIndex(),
      slots,
      spreadStartPageIndex: alignedStart,
      totalPages,
    };

    this.dispatchEvent(new CustomEvent('spreadchange', { detail: spreadDetail }));
    this.dispatchEvent(
      new CustomEvent('chapterchange', {
        detail: slots[0]!,
      }),
    );
  }

  async showSpreadAtLinearIndex(spreadStartLinearIndex: number): Promise<void> {
    this.assertActive();

    if (this.paginationEnabled) {
      throw new Error('Use showPageSpread() when pagination is enabled');
    }

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

    if (this.paginationEnabled) {
      const nextSpreadStart = this.spreadStartPageIndex + getPageSpreadStep(this.layout);

      if (nextSpreadStart >= this.getTotalPages()) {
        return;
      }

      await this.showPageSpread(nextSpreadStart);
      return;
    }

    const nextSpreadStart = this.spreadStartLinearIndex + getSpreadStep(this.layout);

    if (nextSpreadStart >= this.linearSpineIndices.length) {
      return;
    }

    await this.showSpreadAtLinearIndex(nextSpreadStart);
  }

  async prev(): Promise<void> {
    this.assertActive();

    if (this.paginationEnabled) {
      const previousSpreadStart = this.spreadStartPageIndex - getPageSpreadStep(this.layout);

      if (previousSpreadStart < 0) {
        return;
      }

      await this.showPageSpread(previousSpreadStart);
      return;
    }

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

    if (this.paginationEnabled) {
      await this.showSpineIndex(target.spineIndex);
      this.applyResolvedTarget(target);
      return target;
    }

    await this.showSpineIndex(target.spineIndex);
    this.applyResolvedTarget(target);

    return target;
  }

  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.resizeObserver?.disconnect();
    this.contentSpread.destroy();
    this.publication.revokeBlobUrls();
    this.hostElement.remove();
  }

  private async initializePagination(initialViewport?: PageViewport): Promise<void> {
    this.pageViewport =
      initialViewport ?? derivePageViewport(this.viewportContainer, this.layout, this.pagePadding);

    this.setupResizeObserver();

    let fromCache = false;

    await this.rebuildPageIndex((detail) => {
      fromCache = detail.fromCache;
    });

    await this.showPageSpread(0);

    const readyDetail: PaginateReadyDetail = {
      totalPages: this.pageIndex?.getTotalPages() ?? 0,
      fromCache,
    };

    this.onPaginateReady?.(readyDetail);
    this.dispatchEvent(new CustomEvent('paginateready', { detail: readyDetail }));
  }

  private async rebuildPageIndex(
    onFinalProgress?: (detail: PaginateProgressDetail) => void,
  ): Promise<void> {
    if (!this.pageViewport) {
      throw new Error('Page viewport is not initialized');
    }

    this.pageIndex = await BookPageIndex.build({
      publication: this.publication,
      linearSpineIndices: this.linearSpineIndices,
      viewport: this.pageViewport,
      layout: this.layout,
      bookKey: getPublicationBookKey(this.publication),
      bookVersion: this.bookVersion,
      cacheStore: this.pageMapCache,
      onProgress: (detail) => {
        this.onPaginateProgress?.(detail);
        this.dispatchEvent(new CustomEvent('paginateprogress', { detail }));

        if (
          detail.measuredChapters === detail.totalChapters ||
          detail.fromCache
        ) {
          onFinalProgress?.(detail);
        }
      },
    });
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      if (this.resizeScheduled) {
        return;
      }

      this.resizeScheduled = true;

      requestAnimationFrame(() => {
        this.resizeScheduled = false;
        void this.handleViewportResize();
      });
    });

    this.resizeObserver.observe(this.viewportContainer);
  }

  private async handleViewportResize(): Promise<void> {
    if (!this.paginationEnabled || !this.pageViewport) {
      return;
    }

    const nextViewport = derivePageViewport(this.viewportContainer, this.layout, this.pagePadding);

    if (viewportCacheKey(nextViewport) === viewportCacheKey(this.pageViewport)) {
      return;
    }

    const currentPage = this.spreadStartPageIndex;
    this.pageViewport = nextViewport;

    await this.rebuildPageIndex();

    const totalPages = this.getTotalPages();
    const maxStart = Math.max(0, totalPages - 1);
    const targetPage = Math.min(getSpreadStartPageIndex(currentPage, this.layout), maxStart);

    await this.showPageSpread(targetPage);
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
    pageMeta?: Pick<ChapterChangeDetail, 'pageIndex' | 'globalPageIndex'>,
  ): ChapterChangeDetail {
    const itemref = this.publication.spine.itemrefs[spineIndex]!;

    return {
      spineIndex,
      path: itemref.item.path,
      href: itemref.item.href,
      idref: itemref.idref,
      slot,
      ...pageMeta,
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
