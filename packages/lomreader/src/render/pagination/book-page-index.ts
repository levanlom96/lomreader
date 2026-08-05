import type { Publication } from '../../types';
import type { SpreadLayout } from '../types';
import { rewriteContentDocumentHtml } from '../prepare-document';
import {
  buildVirtualPageHtml,
  extractBlockRangeHtml,
  extractHeadInnerHtml,
  wrapFlowContent,
} from './extract-fragment';
import {
  buildPageMapCacheKey,
  createMemoryPageMapCache,
  isCachedPageMapCompatible,
  serializeBookPageMap,
  type PageMapCacheStore,
} from './page-cache';
import { PageMeasurer } from './page-measurer';
import { buildPageShellStyles, sanitizePreparedHtml, viewportCacheKey } from './page-shell';
import type {
  BookPageMap,
  PageViewport,
  PaginateProgressDetail,
  VirtualPage,
} from './types';

export interface BuildBookPageMapOptions {
  publication: Publication;
  linearSpineIndices: number[];
  viewport: PageViewport;
  layout: SpreadLayout;
  bookKey: string;
  bookVersion: string;
  cacheStore?: PageMapCacheStore;
  measurer?: PageMeasurer;
  onProgress?: (detail: PaginateProgressDetail) => void;
}

async function loadPreparedChapterHtml(
  publication: Publication,
  preparedHtml: Map<string, string>,
  documentPath: string,
): Promise<string> {
  const cached = preparedHtml.get(documentPath);

  if (cached) {
    return cached;
  }

  const html = sanitizePreparedHtml(
    await rewriteContentDocumentHtml(
      publication.blobStore,
      publication.manifest,
      documentPath,
      (path) => publication.getText(path),
    ),
  );

  preparedHtml.set(documentPath, html);

  return html;
}

export class BookPageIndex {
  private readonly preparedHtml = new Map<string, string>();
  private readonly pageHtmlCache = new Map<string, string>();

  private constructor(
    private readonly publication: Publication,
    readonly map: BookPageMap,
  ) {}

  static async build(options: BuildBookPageMapOptions): Promise<BookPageIndex> {
    const cacheStore = options.cacheStore ?? createMemoryPageMapCache();
    const viewportKey = viewportCacheKey(options.viewport);
    const cacheKey = buildPageMapCacheKey(
      options.bookKey,
      options.bookVersion,
      options.viewport,
      options.layout,
    );
    const cached = await cacheStore.get(cacheKey);

    if (
      cached &&
      isCachedPageMapCompatible(
        cached,
        options.bookKey,
        options.bookVersion,
        viewportKey,
        options.layout,
      )
    ) {
      options.onProgress?.({
        measuredChapters: options.linearSpineIndices.length,
        totalChapters: options.linearSpineIndices.length,
        fromCache: true,
      });

      return new BookPageIndex(options.publication, {
        bookKey: options.bookKey,
        bookVersion: options.bookVersion,
        viewportKey,
        layout: options.layout,
        pages: cached.pages,
        chapterStartPage: cached.chapterStartPage,
      });
    }

    const measurer = options.measurer ?? new PageMeasurer();
    const ownsMeasurer = !options.measurer;
    const preparedHtml = new Map<string, string>();

    try {
      const pages: VirtualPage[] = [];
      const chapterStartPage: number[] = [];
      const totalChapters = options.linearSpineIndices.length;

      for (let chapterIndex = 0; chapterIndex < totalChapters; chapterIndex += 1) {
        const spineIndex = options.linearSpineIndices[chapterIndex]!;
        chapterStartPage[spineIndex] = pages.length;

        const path = options.publication.spine.itemrefs[spineIndex]!.item.path;
        const html = await loadPreparedChapterHtml(
          options.publication,
          preparedHtml,
          path,
        );
        const ranges = await measurer.measurePreparedDocument(html, options.viewport);

        for (let pageIndex = 0; pageIndex < ranges.length; pageIndex += 1) {
          pages.push({
            globalIndex: pages.length,
            spineIndex,
            path,
            pageIndex,
            range: ranges[pageIndex]!,
          });
        }

        options.onProgress?.({
          measuredChapters: chapterIndex + 1,
          totalChapters,
          fromCache: false,
        });
      }

      const map: BookPageMap = {
        bookKey: options.bookKey,
        bookVersion: options.bookVersion,
        viewportKey,
        layout: options.layout,
        pages,
        chapterStartPage,
      };

      await cacheStore.set(cacheKey, serializeBookPageMap(map));

      const index = new BookPageIndex(options.publication, map);
      index.preparedHtml.clear();
      preparedHtml.forEach((value, key) => index.preparedHtml.set(key, value));

      return index;
    } finally {
      if (ownsMeasurer) {
        measurer.destroy();
      }
    }
  }

  getTotalPages(): number {
    return this.map.pages.length;
  }

  getPages(): readonly VirtualPage[] {
    return this.map.pages;
  }

  getPage(globalIndex: number): VirtualPage | undefined {
    return this.map.pages[globalIndex];
  }

  getChapterStartPage(spineIndex: number): number | undefined {
    return this.map.chapterStartPage[spineIndex];
  }

  async preparePageHtml(page: VirtualPage, viewport: PageViewport): Promise<string> {
    const cacheKey = `${page.path}:${viewportCacheKey(viewport)}:${page.pageIndex}`;
    const cached = this.pageHtmlCache.get(cacheKey);

    if (cached) {
      return cached;
    }

    const preparedHtml = await loadPreparedChapterHtml(
      this.publication,
      this.preparedHtml,
      page.path,
    );
    const parser = new DOMParser();
    const document = parser.parseFromString(preparedHtml, 'application/xhtml+xml');
    const flow = wrapFlowContent(document, false);
    const fragmentHtml = extractBlockRangeHtml(flow, page.range);
    const shellCss = buildPageShellStyles(viewport, 'display');
    const pageHtml = buildVirtualPageHtml(extractHeadInnerHtml(preparedHtml), fragmentHtml, shellCss);

    this.pageHtmlCache.set(cacheKey, pageHtml);

    return pageHtml;
  }
}

export function getSpreadStartPageIndex(pageIndex: number, layout: SpreadLayout): number {
  if (layout === '1-up') {
    return pageIndex;
  }

  return pageIndex - (pageIndex % 2);
}

export function getPageSpreadStep(layout: SpreadLayout): number {
  return layout === '2-up' ? 2 : 1;
}

export function getPublicationBookKey(publication: Publication): string {
  return publication.url;
}
