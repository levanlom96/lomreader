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
export { prepareContentDocument } from './render/prepare-document';
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

export type {
  BeforeNavigateHook,
  ChapterChangeDetail,
  NavigateContext,
  ReaderHostEventMap,
  ReaderHostOptions,
  SpreadChangeDetail,
  SpreadLayout,
} from './render/types';
