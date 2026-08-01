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
