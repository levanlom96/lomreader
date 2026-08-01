import type {
  CfiAssertion,
  CfiDomElement,
  CfiDomNode,
  CfiLocalPath,
  CfiOffset,
  CfiPath,
  CfiPoint,
  CfiRedirect,
  CfiStep,
} from './types';
import { NODE_CDATA, NODE_DOCUMENT, NODE_ELEMENT, NODE_TEXT } from './types';
import { getElementId } from './package';

export interface CfiChildRef {
  index: number;
  kind: 'element' | 'text';
  node: CfiDomNode;
  textNodes?: CfiDomNode[];
}

export function isCfiElement(node: CfiDomNode): node is CfiDomElement {
  return node.nodeType === NODE_ELEMENT;
}

export function isTextLikeNode(node: CfiDomNode): boolean {
  return node.nodeType === NODE_TEXT || node.nodeType === NODE_CDATA;
}

export function isIgnorableCfiNode(node: CfiDomNode): boolean {
  return !isCfiElement(node) && !isTextLikeNode(node);
}

export function getCfiChildren(parent: CfiDomNode): CfiChildRef[] {
  const children: CfiChildRef[] = [];
  let elementIndex = 2;
  let textIndex = 1;
  let pendingText: CfiDomNode[] = [];

  const flushText = () => {
    if (pendingText.length === 0) {
      return;
    }

    children.push({
      index: textIndex,
      kind: 'text',
      node: pendingText[0]!,
      textNodes: [...pendingText],
    });
    pendingText = [];
    textIndex += 2;
  };

  for (const child of Array.from(parent.childNodes)) {
    if (isIgnorableCfiNode(child)) {
      continue;
    }

    if (isCfiElement(child)) {
      flushText();
      children.push({
        index: elementIndex,
        kind: 'element',
        node: child,
      });
      elementIndex += 2;
      continue;
    }

    if (isTextLikeNode(child)) {
      pendingText.push(child);
    }
  }

  flushText();

  return children;
}

export function getCombinedTextLength(nodes: CfiDomNode[]): number {
  return nodes.reduce((total, node) => total + (node.nodeValue?.length ?? 0), 0);
}

export function getTextNodeAtOffset(
  nodes: CfiDomNode[],
  offset: number,
): { node: CfiDomNode; offset: number } {
  let remaining = offset;

  for (const node of nodes) {
    const length = node.nodeValue?.length ?? 0;

    if (remaining <= length) {
      return { node, offset: remaining };
    }

    remaining -= length;
  }

  const last = nodes[nodes.length - 1];

  if (!last) {
    throw new Error('Cannot resolve character offset in empty text node group');
  }

  return { node: last, offset: last.nodeValue?.length ?? 0 };
}

export function findChildByIndex(parent: CfiDomNode, index: number): CfiChildRef | undefined {
  const children = getCfiChildren(parent);

  return children.find((child) => child.index === index);
}

export function resolveLocalPath(root: CfiDomNode, path: CfiLocalPath): CfiPoint {
  let current: CfiDomNode = root;

  for (const step of path.steps) {
    current = resolveStep(current, step);
  }

  if (!path.tail) {
    return { node: current, offset: 0 };
  }

  if ('kind' in path.tail) {
    return resolveRedirect(current, path.tail);
  }

  return resolveTerminalOffset(current, path.tail);
}

export function resolvePath(root: CfiDomNode, path: CfiPath): CfiPoint {
  return resolveLocalPath(root, {
    steps: path.steps,
    tail: path.tail,
  });
}

function resolveRedirect(node: CfiDomNode, redirect: CfiRedirect): CfiPoint {
  const targetDocument = resolveIndirectionTarget(node);

  if (redirect.kind === 'offset') {
    return resolveTerminalOffset(targetDocument, redirect.offset);
  }

  return resolveLocalPath(targetDocument, redirect.path);
}

function resolveIndirectionTarget(node: CfiDomNode): CfiDomNode {
  if (!isCfiElement(node)) {
    throw new Error('CFI indirection requires an element node');
  }

  const localName = node.nodeName.toLowerCase();
  const href =
    node.getAttribute('href') ??
    node.getAttribute('src') ??
    node.getAttribute('data') ??
    node.getAttribute('xlink:href');

  if (!href) {
    throw new Error(`CFI indirection element "${localName}" has no resolvable reference`);
  }

  throw new Error(
    'CFI indirection into referenced documents must be resolved at the publication layer',
  );
}

function resolveStep(parent: CfiDomNode, step: CfiStep): CfiDomNode {
  const child = findChildByIndex(parent, step.index);

  if (!child) {
    throw new Error(`CFI step /${step.index} not found`);
  }

  verifyAssertion(child.node, step.assertion);

  if (child.kind === 'text') {
    return child.node;
  }

  return child.node;
}

function resolveTerminalOffset(node: CfiDomNode, offset: CfiOffset): CfiPoint {
  switch (offset.type) {
    case 'character': {
      if (isCfiElement(node)) {
        const alt = node.getAttribute('alt');

        if (node.nodeName.toLowerCase() === 'img' && alt !== null) {
          verifyTextAssertion(alt, offset.assertion);

          return {
            node,
            offset: Math.min(offset.offset, alt.length),
          };
        }

        throw new Error('Character offset on element requires img@alt or a text node step');
      }

      const textNodes = isTextLikeNode(node) ? [node] : [];
      const resolved = getTextNodeAtOffset(textNodes, offset.offset);
      const combined = textNodes.map((item) => item.nodeValue ?? '').join('');

      verifyTextAssertion(combined, offset.assertion);

      return resolved;
    }
    case 'temporal':
    case 'spatial':
      verifyAssertion(node, offset.assertion);

      return { node, offset: 0 };
  }
}

function verifyAssertion(node: CfiDomNode, assertion?: CfiAssertion): void {
  if (!assertion?.id) {
    return;
  }

  if (!isCfiElement(node)) {
    throw new Error(`CFI ID assertion "${assertion.id}" does not match a non-element node`);
  }

  const elementId = getElementId(node);

  if (elementId !== assertion.id) {
    throw new Error(`CFI ID assertion "${assertion.id}" does not match element id "${elementId ?? ''}"`);
  }
}

function verifyTextAssertion(text: string, assertion?: CfiAssertion): void {
  if (!assertion?.textBefore && !assertion?.textAfter) {
    return;
  }

  const collapsed = text.replace(/\s+/g, ' ');

  if (assertion.textBefore) {
    const index = collapsed.indexOf(assertion.textBefore);

    if (index === -1) {
      throw new Error(`CFI text assertion before "${assertion.textBefore}" not found`);
    }
  }

  if (assertion.textAfter) {
    const index = collapsed.indexOf(assertion.textAfter);

    if (index === -1) {
      throw new Error(`CFI text assertion after "${assertion.textAfter}" not found`);
    }
  }
}

export function getNodeDocumentElement(node: CfiDomNode): CfiDomElement {
  if (node.nodeType === NODE_DOCUMENT) {
    const documentLike = node as CfiDomNode & { documentElement?: CfiDomElement | null };

    if (documentLike.documentElement) {
      return documentLike.documentElement;
    }
  }

  let current: CfiDomNode | null = node;

  while (current) {
    if (current.nodeType === 9 && current.childNodes.length > 0) {
      const root = current.childNodes[0];

      if (root && isCfiElement(root)) {
        return root;
      }
    }

    if (isCfiElement(current) && current.nodeName.toLowerCase() === 'html') {
      return current;
    }

    current = current.parentNode;
  }

  throw new Error('Unable to locate document element for CFI generation');
}

export function compareResolvedPoints(a: CfiPoint, b: CfiPoint): number {
  if (a.node === b.node) {
    return a.offset - b.offset;
  }

  const position = compareNodePosition(a.node, b.node);

  return position ?? 0;
}

function compareNodePosition(a: CfiDomNode, b: CfiDomNode): number | undefined {
  if (a === b) {
    return 0;
  }

  const pathA = nodePath(a);
  const pathB = nodePath(b);
  const length = Math.min(pathA.length, pathB.length);

  for (let index = 0; index < length; index += 1) {
    if (pathA[index] !== pathB[index]) {
      return pathA[index]! - pathB[index]!;
    }
  }

  return pathA.length - pathB.length;
}

function nodePath(node: CfiDomNode): number[] {
  const path: number[] = [];
  let current: CfiDomNode | null = node;

  while (current?.parentNode) {
    const parent: CfiDomNode = current.parentNode;
    const siblings = Array.from(parent.childNodes);
    path.unshift(siblings.indexOf(current));
    current = parent;
  }

  return path;
}
