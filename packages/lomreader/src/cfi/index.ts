export { escapeCfiValue, normalizeCfiInput, stripCfiFragment, unescapeCfiValue } from './escape';
export { formatCfi, parseCfi } from './parse';
export { generateCfi, generateContentCfi } from './generate';
export {
  cfiPointToRange,
  cfiRangeToDomRange,
  domRangeToCfiPoints,
  getPackageSpinePrefixAsync,
  resolveCfi,
  resolveContentPath,
  resolveContentRange,
} from './resolve';
export {
  compareResolvedPoints,
  getCfiChildren,
  getCombinedTextLength,
  getNodeDocumentElement,
  getTextNodeAtOffset,
  isCfiElement,
  isIgnorableCfiNode,
  isTextLikeNode,
  resolveLocalPath,
} from './dom';

export type {
  CfiAssertion,
  CfiDomNode,
  CfiDomRange,
  CfiLocalPath,
  CfiOffset,
  CfiPath,
  CfiPoint,
  CfiRange,
  CfiRedirect,
  CfiResolvedPoint,
  CfiResolvedRange,
  CfiResolvedTarget,
  CfiSideBias,
  CfiStep,
  ParsedCfi,
} from './types';

export type { GenerateCfiInput } from './generate';
export type { ResolveCfiOptions } from './resolve';
