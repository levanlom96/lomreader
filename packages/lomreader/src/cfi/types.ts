export type CfiSideBias = 'before' | 'after';

export interface CfiParameters {
  [name: string]: string[];
}

export interface CfiAssertion {
  id?: string;
  textBefore?: string;
  textAfter?: string;
  sideBias?: CfiSideBias;
  parameters?: CfiParameters;
}

export interface CfiStep {
  index: number;
  assertion?: CfiAssertion;
}

export type CfiOffset =
  | { type: 'character'; offset: number; assertion?: CfiAssertion }
  | { type: 'temporal'; seconds: number; spatial?: { x: number; y: number }; assertion?: CfiAssertion }
  | { type: 'spatial'; x: number; y: number; assertion?: CfiAssertion };

export interface CfiLocalPath {
  steps: CfiStep[];
  /** Content after `!` indirection, or inline offset when redirect is absent. */
  tail?: CfiRedirect | CfiOffset;
}

export type CfiRedirect =
  | { kind: 'path'; path: CfiLocalPath }
  | { kind: 'offset'; offset: CfiOffset };

export interface CfiPath {
  steps: CfiStep[];
  tail?: CfiRedirect | CfiOffset;
}

export interface CfiRange {
  parent: CfiLocalPath;
  start: CfiLocalPath;
  end: CfiLocalPath;
}

export interface ParsedCfi {
  path?: CfiPath;
  range?: CfiRange;
}

export interface CfiPoint {
  node: CfiDomNode;
  offset: number;
}

export interface CfiDomRange {
  start: CfiPoint;
  end: CfiPoint;
}

/** Minimal DOM node surface shared by browser DOM and @xmldom/xmldom. */
export interface CfiDomNode {
  nodeType: number;
  nodeName: string;
  nodeValue: string | null;
  childNodes: ArrayLike<CfiDomNode>;
  parentNode: CfiDomNode | null;
  ownerDocument?: CfiDomNode | null;
}

export interface CfiDomElement extends CfiDomNode {
  getAttribute(name: string): string | null;
  hasAttribute?(name: string): boolean;
  id?: string;
}

export interface CfiResolvedPoint {
  spineIndex: number;
  documentPath: string;
  node: CfiDomNode;
  offset: number;
  sideBias?: CfiSideBias;
}

export interface CfiResolvedRange {
  spineIndex: number;
  documentPath: string;
  start: CfiPoint;
  end: CfiPoint;
}

export type CfiResolvedTarget = CfiResolvedPoint | CfiResolvedRange;

export const CFI_PREFIX = 'epubcfi(';
export const CFI_SUFFIX = ')';

export const NODE_ELEMENT = 1;
export const NODE_TEXT = 3;
export const NODE_CDATA = 4;
export const NODE_DOCUMENT = 9;
