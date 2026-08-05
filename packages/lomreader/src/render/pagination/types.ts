import type { SpreadLayout } from '../types';

export interface PageViewport {
  contentWidth: number;
  contentHeight: number;
  padding: number;
}

/** Inclusive block-index range within `.lomreader-flow` paginated blocks. */
export interface PageRange {
  startBlock: number;
  endBlock: number;
  /** Inclusive character offset within the start block text stream. */
  startChar?: number;
  /** Inclusive character offset within the end block text stream. */
  endChar?: number;
}

export interface VirtualPage {
  globalIndex: number;
  spineIndex: number;
  path: string;
  pageIndex: number;
  range: PageRange;
}

export interface BookPageMap {
  bookKey: string;
  bookVersion: string;
  viewportKey: string;
  layout: SpreadLayout;
  pages: VirtualPage[];
  chapterStartPage: number[];
}

export interface PaginateProgressDetail {
  measuredChapters: number;
  totalChapters: number;
  fromCache: boolean;
}

export interface PaginateReadyDetail {
  totalPages: number;
  fromCache: boolean;
}

export const PAGE_MAP_CACHE_SCHEMA_VERSION = 3;

export interface CachedBookPageMap {
  schemaVersion: typeof PAGE_MAP_CACHE_SCHEMA_VERSION;
  bookKey: string;
  bookVersion: string;
  viewportKey: string;
  layout: SpreadLayout;
  pages: VirtualPage[];
  chapterStartPage: number[];
}
