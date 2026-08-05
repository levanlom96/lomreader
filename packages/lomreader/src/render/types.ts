import type { PageViewport as PaginationViewport, PaginateProgressDetail, PaginateReadyDetail } from './pagination/types';
import type { PageMapCacheStore } from './pagination/page-cache';

export type { PaginationViewport as PageViewport };

export type {
  PaginateProgressDetail,
  PaginateReadyDetail,
} from './pagination/types';

export type SpreadLayout = '1-up' | '2-up';

export type BeforeNavigateHook = (context: NavigateContext) => void | Promise<void>;

export interface NavigateContext {
  fromSpineIndex: number;
  toSpineIndex: number;
  fromPath: string;
  toPath: string;
  layout: SpreadLayout;
  fromPageIndex?: number;
  toPageIndex?: number;
}

export interface ChapterChangeDetail {
  spineIndex: number;
  path: string;
  href: string;
  idref: string;
  slot: 'single' | 'left' | 'right';
  pageIndex?: number;
  globalPageIndex?: number;
}

export interface SpreadChangeDetail {
  layout: SpreadLayout;
  spreadStartLinearIndex: number;
  slots: ChapterChangeDetail[];
  spreadStartPageIndex?: number;
  totalPages?: number;
}

export interface ReaderHostOptions {
  container: HTMLElement;
  sandbox?: string;
  layout?: SpreadLayout;
  /** Virtual-page pagination. Default `true`. */
  pagination?: boolean;
  pageViewport?: PaginationViewport;
  pagePadding?: number;
  /** Book version string used for page-map cache invalidation. */
  bookVersion?: string;
  /** Page-map cache backend. Defaults to localStorage in browsers. */
  pageMapCache?: PageMapCacheStore;
  onPaginateProgress?: (detail: PaginateProgressDetail) => void;
  onPaginateReady?: (detail: PaginateReadyDetail) => void;
}

export interface ReaderHostEventMap {
  chapterchange: CustomEvent<ChapterChangeDetail>;
  spreadchange: CustomEvent<SpreadChangeDetail>;
  navigate: CustomEvent<NavigateContext>;
  paginateprogress: CustomEvent<PaginateProgressDetail>;
  paginateready: CustomEvent<PaginateReadyDetail>;
  error: CustomEvent<{ message: string; cause?: unknown }>;
}

export type ReaderHostEventName = keyof ReaderHostEventMap;
