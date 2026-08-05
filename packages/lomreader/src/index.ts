export { VERSION, createReader, LomReader } from './reader';

export type {
  ContentPlane,
  ContentResource,
  ContentResourceClassification,
  LinkedResource,
  ManifestItem,
  ManifestPlane,
  PackageDocument,
  Publication,
  Reader,
  ReaderOptions,
  SpineItemRef,
  SpinePlane,
} from './types';

export {
  buildContentPlane,
  buildManifestPlaneSummary,
  buildSpinePlaneSummary,
} from './epub/planes';

export { CORE_MEDIA_TYPES, EPUB_CONTENT_DOCUMENT_MEDIA_TYPES } from './epub/constants';

export {
  escapeCfiValue,
  formatCfi,
  generateCfi,
  normalizeCfiInput,
  parseCfi,
  resolveCfi,
  unescapeCfiValue,
} from './cfi';

export type {
  CfiPoint,
  CfiRange,
  CfiRedirect,
  CfiResolvedPoint,
  CfiResolvedRange,
  CfiResolvedTarget,
  ParsedCfi,
} from './cfi';

export { BlobUrlStore, guessMediaType, resolveMediaType } from './render/blob-store';
export { prepareContentDocument, rewriteContentDocumentHtml } from './render/prepare-document';
export {
  ContentFrame,
  findInitialSpineIndex,
  getLinearSpineIndices,
  isRenderableSpineMediaType,
} from './render/content-frame';
export {
  ContentSpread,
  getSpreadLinearIndices,
  getSpreadStartLinearIndex,
  getSpreadStep,
} from './render/spread-layout';
export {
  ReaderHost,
  createReaderHost,
  getSpineItemRef,
} from './render/reader-host';
export {
  BookPageIndex,
  getPageSpreadStep,
  getPublicationBookKey,
  getSpreadStartPageIndex,
} from './render/pagination/book-page-index';
export {
  createLocalStoragePageMapCache,
  createMemoryPageMapCache,
  buildPageMapCacheKey,
  type PageMapCacheStore,
} from './render/pagination/page-cache';
export {
  DEFAULT_PAGE_PADDING,
  derivePageViewport,
  viewportCacheKey,
} from './render/pagination/page-shell';

export type {
  BeforeNavigateHook,
  ChapterChangeDetail,
  NavigateContext,
  PageViewport,
  PaginateProgressDetail,
  PaginateReadyDetail,
  ReaderHostEventMap,
  ReaderHostOptions,
  SpreadChangeDetail,
  SpreadLayout,
} from './render/types';
export type {
  BookPageMap,
  CachedBookPageMap,
  PageRange,
  VirtualPage,
} from './render/pagination/types';
