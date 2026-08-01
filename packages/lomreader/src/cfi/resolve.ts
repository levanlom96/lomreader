import { childElements, parseXml, type XmlElementLike } from '../epub/xml';
import type { Publication } from '../types';
import {
  getNodeDocumentElement,
  isTextLikeNode,
  resolveLocalPath,
} from './dom';
import { assertPackageSpineStep, resolveSpineIndexFromPackageSteps } from './package';
import { normalizeCfiInput } from './escape';
import { parseCfi } from './parse';
import type {
  CfiDomNode,
  CfiLocalPath,
  CfiPoint,
  CfiRange,
  CfiResolvedRange,
  CfiResolvedTarget,
  ParsedCfi,
} from './types';

export interface ResolveCfiOptions {
  getDocument?: (documentPath: string) => Promise<CfiDomNode | null>;
}

export async function resolveCfi(
  publication: Publication,
  input: string | ParsedCfi,
  options: ResolveCfiOptions = {},
): Promise<CfiResolvedTarget> {
  const parsed = typeof input === 'string' ? parseCfi(normalizeCfiInput(input)) : input;
  const packageRoot = await loadPackageRoot(publication);

  if (parsed.range) {
    return resolveCfiRange(publication, packageRoot, parsed.range, options);
  }

  if (!parsed.path) {
    throw new Error('CFI must contain a path or range');
  }

  const resolved = await resolveLocalPathFromRoot(
    publication,
    packageRoot,
    {
      steps: parsed.path.steps,
      tail: parsed.path.tail,
    },
    options,
  );

  return {
    spineIndex: resolved.spineIndex,
    documentPath: resolved.documentPath,
    node: resolved.point.node,
    offset: resolved.point.offset,
    sideBias: extractSideBias(parsed.path.steps),
  };
}

async function resolveCfiRange(
  publication: Publication,
  packageRoot: XmlElementLike,
  range: CfiRange,
  options: ResolveCfiOptions,
): Promise<CfiResolvedRange> {
  const parentResolved = await resolveLocalPathFromRoot(
    publication,
    packageRoot,
    range.parent,
    options,
  );
  const parentNode = terminusElement(parentResolved.point);
  const start = resolveLocalPath(parentNode, range.start);
  const end = resolveLocalPath(parentNode, range.end);

  return {
    spineIndex: parentResolved.spineIndex,
    documentPath: parentResolved.documentPath,
    start,
    end,
  };
}

interface ResolvedLocalPath {
  spineIndex: number;
  documentPath: string;
  point: CfiPoint;
}

async function resolveLocalPathFromRoot(
  publication: Publication,
  packageRoot: XmlElementLike,
  localPath: CfiLocalPath,
  options: ResolveCfiOptions,
): Promise<ResolvedLocalPath> {
  if (localPath.steps.length < 2) {
    throw new Error('CFI package path must include spine and itemref steps');
  }

  assertPackageSpineStep(packageRoot, localPath.steps[0]!);
  const spineIndex = resolveSpineIndexFromPackageSteps(packageRoot, localPath.steps);

  if (!localPath.tail || !('kind' in localPath.tail) || localPath.tail.kind !== 'path') {
    throw new Error('CFI must include a content document indirection (!)');
  }

  const documentPath = publication.spine.itemrefs[spineIndex]!.item.path;
  const contentRoot = await loadContentRoot(publication, documentPath, options);
  const point = resolveLocalPath(contentRoot, localPath.tail.path);

  return { spineIndex, documentPath, point };
}

function terminusElement(point: CfiPoint): CfiDomNode {
  if (isTextLikeNode(point.node)) {
    const parent = point.node.parentNode;

    if (!parent) {
      throw new Error('Text node is missing a parent element');
    }

    return parent;
  }

  return point.node;
}

async function loadPackageRoot(publication: Publication): Promise<XmlElementLike> {
  const text = await publication.getText(publication.packageDocument.path);

  return parseXml(text).documentElement!;
}

async function loadContentRoot(
  publication: Publication,
  documentPath: string,
  options: ResolveCfiOptions,
): Promise<CfiDomNode> {
  if (options.getDocument) {
    const document = await options.getDocument(documentPath);

    if (!document) {
      throw new Error(`Unable to load content document "${documentPath}"`);
    }

    return getNodeDocumentElement(document);
  }

  const text = await publication.getText(documentPath);
  const doc = parseXml(text);

  return doc.documentElement as unknown as CfiDomNode;
}

function extractSideBias(steps: Array<{ assertion?: { sideBias?: 'before' | 'after' } }>) {
  return steps.at(-1)?.assertion?.sideBias;
}

export function resolveContentPath(contentRoot: CfiDomNode, localPath: CfiLocalPath): CfiPoint {
  return resolveLocalPath(contentRoot, localPath);
}

export function resolveContentRange(
  contentRoot: CfiDomNode,
  parent: CfiLocalPath,
  start: CfiLocalPath,
  end: CfiLocalPath,
): { start: CfiPoint; end: CfiPoint } {
  const parentPoint = resolveLocalPath(contentRoot, parent);
  const parentNode = terminusElement(parentPoint);

  return {
    start: resolveLocalPath(parentNode, start),
    end: resolveLocalPath(parentNode, end),
  };
}

export function domRangeToCfiPoints(range: Range): { start: CfiPoint; end: CfiPoint } {
  return {
    start: {
      node: range.startContainer as unknown as CfiDomNode,
      offset: range.startOffset,
    },
    end: {
      node: range.endContainer as unknown as CfiDomNode,
      offset: range.endOffset,
    },
  };
}

export function cfiPointToRange(
  ownerDocument: { createRange: () => Range },
  point: CfiPoint,
): Range {
  const range = ownerDocument.createRange();
  const node = point.node as unknown as Node;

  if (node.nodeType === 3) {
    const length = node.textContent?.length ?? 0;
    const offset = Math.min(point.offset, length);
    range.setStart(node, offset);
    range.setEnd(node, offset);
    return range;
  }

  const length = node.childNodes.length;
  const offset = Math.min(point.offset, length);
  range.setStart(node, offset);
  range.setEnd(node, offset);

  return range;
}

export function cfiRangeToDomRange(
  ownerDocument: { createRange: () => Range },
  start: CfiPoint,
  end: CfiPoint,
): Range {
  const range = ownerDocument.createRange();
  setBoundary(range, 'setStart', start);
  setBoundary(range, 'setEnd', end);

  return range;
}

function setBoundary(
  range: Range,
  method: 'setStart' | 'setEnd',
  point: CfiPoint,
): void {
  const node = point.node as unknown as Node;

  if (node.nodeType === 3) {
    const length = node.textContent?.length ?? 0;
    range[method](node, Math.min(point.offset, length));
    return;
  }

  range[method](node, Math.min(point.offset, node.childNodes.length));
}

export function getPackageSpinePrefix(
  publication: Publication,
  spineIndex: number,
): { packageSteps: CfiLocalPath; documentPath: string } {
  const packageText = publication.packageDocument.path;
  const packageXml = parseXml(publicationSyncText(publication, packageText));
  const packageElement = packageXml.documentElement!;
  const spineElement = childElements(packageElement, 'spine')[0];

  if (!spineElement) {
    throw new Error('Package document is missing spine element');
  }

  const spineStepIndex = evenElementChildIndex(packageElement, spineElement);
  const itemref = publication.spine.itemrefs[spineIndex];

  if (!itemref) {
    throw new Error(`Spine index out of range: ${spineIndex}`);
  }

  const itemrefElement = childElements(spineElement, 'itemref')[spineIndex];

  if (!itemrefElement) {
    throw new Error(`Unable to locate itemref element for spine index ${spineIndex}`);
  }

  const itemrefStepIndex = evenElementChildIndex(spineElement, itemrefElement);
  const itemrefId = itemrefElement.getAttribute('id') ?? undefined;

  return {
    packageSteps: {
      steps: [
        { index: spineStepIndex },
        {
          index: itemrefStepIndex,
          assertion: itemrefId ? { id: itemrefId } : undefined,
        },
      ],
    },
    documentPath: itemref.item.path,
  };
}

function publicationSyncText(publication: Publication, path: string): string {
  void publication;
  void path;
  throw new Error('getPackageSpinePrefix requires async package loading — use generateCfi instead');
}

function evenElementChildIndex(parent: XmlElementLike, target: XmlElementLike): number {
  const elements = Array.from(parent.childNodes).filter(
    (node): node is XmlElementLike => node.nodeType === 1,
  );
  const index = elements.indexOf(target);

  if (index === -1) {
    throw new Error('Target element is not a direct child');
  }

  return (index + 1) * 2;
}

export async function getPackageSpinePrefixAsync(
  publication: Publication,
  spineIndex: number,
): Promise<{ packageSteps: CfiLocalPath; documentPath: string }> {
  const text = await publication.getText(publication.packageDocument.path);
  const packageElement = parseXml(text).documentElement!;
  const spineElement = childElements(packageElement, 'spine')[0];

  if (!spineElement) {
    throw new Error('Package document is missing spine element');
  }

  const spineStepIndex = evenElementChildIndex(packageElement, spineElement);
  const itemref = publication.spine.itemrefs[spineIndex];

  if (!itemref) {
    throw new Error(`Spine index out of range: ${spineIndex}`);
  }

  const itemrefElement = childElements(spineElement, 'itemref')[spineIndex];

  if (!itemrefElement) {
    throw new Error(`Unable to locate itemref element for spine index ${spineIndex}`);
  }

  const itemrefStepIndex = evenElementChildIndex(spineElement, itemrefElement);
  const itemrefId = itemrefElement.getAttribute('id') ?? undefined;

  return {
    packageSteps: {
      steps: [
        { index: spineStepIndex },
        {
          index: itemrefStepIndex,
          assertion: itemrefId ? { id: itemrefId } : undefined,
        },
      ],
    },
    documentPath: itemref.item.path,
  };
}
