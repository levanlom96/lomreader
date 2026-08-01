import { getElementId } from './package';
import { parseXml } from '../epub/xml';
import type { Publication } from '../types';
import {
  compareResolvedPoints,
  getCfiChildren,
  getCombinedTextLength,
  getNodeDocumentElement,
  getTextNodeAtOffset,
  isCfiElement,
  isTextLikeNode,
} from './dom';
import { formatCfi } from './parse';
import { getPackageSpinePrefixAsync } from './resolve';
import type {
  CfiAssertion,
  CfiDomNode,
  CfiLocalPath,
  CfiPoint,
  ParsedCfi,
} from './types';

export interface GenerateCfiInput {
  start: CfiPoint;
  end?: CfiPoint;
}

export async function generateCfi(
  publication: Publication,
  spineIndex: number,
  input: GenerateCfiInput,
): Promise<string> {
  const { packageSteps, documentPath } = await getPackageSpinePrefixAsync(publication, spineIndex);
  const text = await publication.getText(documentPath);
  const doc = parseXml(text);
  const contentRoot = (doc.documentElement ?? getNodeDocumentElement(doc as unknown as CfiDomNode)) as CfiDomNode;

  if (input.end && !pointsEqual(input.start, input.end)) {
    const contentRange = generateContentRange(contentRoot, input.start, input.end);

    return formatCfi({
      range: {
        parent: {
          steps: [...packageSteps.steps],
          tail: {
            kind: 'path',
            path: contentRange.parent,
          },
        },
        start: contentRange.start,
        end: contentRange.end,
      },
    });
  }

  const contentPath = generateLocalPath(contentRoot, input.start);

  return formatCfi({
    path: {
      steps: packageSteps.steps,
      tail: {
        kind: 'path',
        path: contentPath,
      },
    },
  });
}

function pointsEqual(a: CfiPoint, b: CfiPoint): boolean {
  return a.node === b.node && a.offset === b.offset;
}

function generateContentRange(
  contentRoot: CfiDomNode,
  start: CfiPoint,
  end: CfiPoint,
): { parent: CfiLocalPath; start: CfiLocalPath; end: CfiLocalPath } {
  const ordered =
    compareResolvedPoints(start, end) <= 0
      ? { start, end }
      : { start: end, end: start };

  const startPath = buildPathSegments(contentRoot, ordered.start);
  const endPath = buildPathSegments(contentRoot, ordered.end);
  const commonLength = commonPathLength(startPath, endPath);

  const parentSteps = startPath.slice(0, commonLength).map((segment) => segment.step);
  const parentNode = startPath[commonLength - 1]?.node ?? contentRoot;

  return {
    parent: { steps: parentSteps },
    start: pointPathFromNode(parentNode, ordered.start),
    end: pointPathFromNode(parentNode, ordered.end),
  };
}

interface PathSegment {
  node: CfiDomNode;
  step: { index: number; assertion?: CfiAssertion };
}

function buildPathSegments(_root: CfiDomNode, point: CfiPoint): PathSegment[] {
  const segments: PathSegment[] = [];
  let current: CfiDomNode | null = point.node;

  while (current?.parentNode) {
    if (isCfiElement(current) && current.nodeName.toLowerCase() === 'html') {
      break;
    }

    const parent: CfiDomNode = current.parentNode;
    const child = getCfiChildren(parent).find((candidate) => {
      if (candidate.kind === 'element') {
        return candidate.node === current;
      }

      return candidate.textNodes?.includes(current!) ?? candidate.node === current;
    });

    if (!child) {
      break;
    }

    segments.unshift({
      node: parent,
      step: {
        index: child.index,
        assertion: child.kind === 'element' ? idAssertion(child.node) : undefined,
      },
    });

    current = parent;
  }

  return segments;
}

function commonPathLength(a: PathSegment[], b: PathSegment[]): number {
  const length = Math.min(a.length, b.length);
  let index = 0;

  while (index < length && a[index]!.step.index === b[index]!.step.index) {
    index += 1;
  }

  return index;
}

function pointPathFromNode(parentNode: CfiDomNode, point: CfiPoint): CfiLocalPath {
  if (isTextLikeNode(point.node)) {
    const child = getCfiChildren(parentNode).find((candidate) =>
      candidate.textNodes?.includes(point.node),
    );

    if (!child?.textNodes) {
      throw new Error('Unable to locate text node within parent for CFI generation');
    }

    let offset = 0;

    for (const textNode of child.textNodes) {
      if (textNode === point.node) {
        offset += point.offset;
        break;
      }

      offset += textNode.nodeValue?.length ?? 0;
    }

    return {
      steps: [{ index: child.index }],
      tail: { type: 'character', offset },
    };
  }

  if (isCfiElement(point.node) && point.node.parentNode === parentNode) {
    const child = getCfiChildren(parentNode).find(
      (candidate) => candidate.kind === 'element' && candidate.node === point.node,
    );

    if (!child) {
      throw new Error('Unable to locate element within parent for CFI generation');
    }

    return {
      steps: [{ index: child.index, assertion: idAssertion(point.node) }],
      tail: point.offset > 0 ? { type: 'character', offset: point.offset } : undefined,
    };
  }

  const segments = buildPathSegments(parentNode, point);

  return generateLocalPath(parentNode, point, segments);
}

function generateLocalPath(
  contentRoot: CfiDomNode,
  point: CfiPoint,
  existingSegments?: PathSegment[],
): CfiLocalPath {
  const segments = existingSegments ?? buildPathSegments(contentRoot, point);
  const steps = segments.map((segment) => segment.step);

  if (isTextLikeNode(point.node)) {
    const parent = point.node.parentNode;

    if (!parent) {
      throw new Error('Text node is missing parent');
    }

    const child = getCfiChildren(parent).find((candidate) =>
      candidate.textNodes?.includes(point.node),
    );

    if (!child?.textNodes) {
      throw new Error('Unable to locate text node for CFI generation');
    }

    let offset = 0;

    for (const textNode of child.textNodes) {
      if (textNode === point.node) {
        offset += point.offset;
        break;
      }

      offset += textNode.nodeValue?.length ?? 0;
    }

    if (!steps.length || steps.at(-1)?.index !== child.index) {
      steps.push({ index: child.index });
    }

    return {
      steps,
      tail: { type: 'character', offset },
    };
  }

  if (point.offset > 0) {
    return {
      steps,
      tail: { type: 'character', offset: point.offset },
    };
  }

  return { steps };
}

function idAssertion(node: CfiDomNode): CfiAssertion | undefined {
  if (!isCfiElement(node)) {
    return undefined;
  }

  const elementId = getElementId(node);

  return elementId ? { id: elementId } : undefined;
}

export function generateContentCfi(contentRoot: CfiDomNode, point: CfiPoint): ParsedCfi {
  return {
    path: {
      steps: [],
      tail: {
        kind: 'path',
        path: generateLocalPath(getNodeDocumentElement(contentRoot), point),
      },
    },
  };
}

export function getTextOffsetWithinChunk(textNodes: CfiDomNode[], target: CfiDomNode, offset: number): number {
  let total = 0;

  for (const node of textNodes) {
    if (node === target) {
      return total + offset;
    }

    total += node.nodeValue?.length ?? 0;
  }

  return total;
}

export { getCombinedTextLength, getTextNodeAtOffset };
