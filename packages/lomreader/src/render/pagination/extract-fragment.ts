import type { PageRange } from './types';

const PAGINATED_BLOCK_SELECTOR =
  'p, h1, h2, h3, h4, h5, h6, hgroup, blockquote, li, pre, figure, table, section, div';

const ATOMIC_BLOCKS = new Set(['figure', 'table', 'pre', 'img', 'svg', 'video']);

export function getPaginatedBlocks(flow: Element): Element[] {
  const candidates = Array.from(flow.querySelectorAll(PAGINATED_BLOCK_SELECTOR)).filter(
    (block) => block.closest('.lomreader-flow') === flow,
  );

  return candidates.filter(
    (block) => !candidates.some((other) => other !== block && block.contains(other)),
  );
}

export function getBlockTextLength(block: Element): number {
  const document = block.ownerDocument;

  if (!document) {
    return 0;
  }

  let length = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    length += walker.currentNode.textContent?.length ?? 0;
  }

  return length;
}

function resolveBlockCharOffset(
  block: Element,
  charIndex: number,
): { node: Text; offset: number } {
  const document = block.ownerDocument!;

  if (charIndex <= 0) {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);

    if (walker.nextNode()) {
      return { node: walker.currentNode as Text, offset: 0 };
    }

    throw new Error('Block has no text content');
  }

  let remaining = charIndex;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const length = node.textContent?.length ?? 0;

    if (remaining <= length) {
      return { node, offset: remaining };
    }

    remaining -= length;
  }

  const backward = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let last: Text | null = null;

  while (backward.nextNode()) {
    last = backward.currentNode as Text;
  }

  if (!last) {
    throw new Error('Block has no text content');
  }

  return { node: last, offset: last.textContent?.length ?? 0 };
}

function setRangeToBlockChars(
  range: Range,
  block: Element,
  startChar: number,
  endChar: number,
): void {
  const textLength = getBlockTextLength(block);
  const clampedStart = Math.max(0, Math.min(startChar, textLength));
  const clampedEnd = Math.max(clampedStart, Math.min(endChar, Math.max(0, textLength - 1)));

  const start = resolveBlockCharOffset(block, clampedStart);
  const endExclusive = resolveBlockCharOffset(block, clampedEnd + 1);

  range.setStart(start.node, start.offset);
  range.setEnd(endExclusive.node, endExclusive.offset);
}

export function measureBlocksHeight(blocks: Element[]): number {
  if (blocks.length === 0) {
    return 0;
  }

  const firstRect = blocks[0]!.getBoundingClientRect();
  const lastRect = blocks[blocks.length - 1]!.getBoundingClientRect();

  return Math.max(0, lastRect.bottom - firstRect.top);
}

export function measureBlockTextSliceHeight(
  block: Element,
  startChar: number,
  endChar: number,
): number {
  const textLength = getBlockTextLength(block);

  if (textLength === 0) {
    return block.getBoundingClientRect().height;
  }

  if (startChar <= 0 && endChar >= textLength - 1) {
    return block.getBoundingClientRect().height;
  }

  const range = block.ownerDocument!.createRange();
  setRangeToBlockChars(range, block, startChar, endChar);

  const rect = range.getBoundingClientRect();

  return Math.max(0, rect.height);
}

function isAtomicBlock(block: Element): boolean {
  if (ATOMIC_BLOCKS.has(block.tagName.toLowerCase())) {
    return true;
  }

  return getBlockTextLength(block) === 0;
}

function normalizeRange(
  startBlock: number,
  endBlock: number,
  startChar?: number,
  endChar?: number,
): PageRange {
  const range: PageRange = { startBlock, endBlock };

  if (startChar !== undefined) {
    range.startChar = startChar;
  }

  if (endChar !== undefined) {
    range.endChar = endChar;
  }

  return range;
}

function splitBlockToPages(block: Element, blockIndex: number, contentHeight: number): PageRange[] {
  const textLength = getBlockTextLength(block);

  if (textLength === 0 || isAtomicBlock(block)) {
    return [normalizeRange(blockIndex, blockIndex)];
  }

  const pages: PageRange[] = [];
  let startChar = 0;

  while (startChar < textLength) {
    const remainingHeight = measureBlockTextSliceHeight(block, startChar, textLength - 1);

    if (remainingHeight <= contentHeight) {
      pages.push(normalizeRange(blockIndex, blockIndex, startChar, textLength - 1));
      break;
    }

    let low = startChar;
    let high = textLength - 1;
    let best = startChar;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const height = measureBlockTextSliceHeight(block, startChar, mid);

      if (height <= contentHeight) {
        best = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (best < startChar) {
      best = startChar;
    }

    pages.push(normalizeRange(blockIndex, blockIndex, startChar, best));
    startChar = best + 1;
  }

  return pages.length > 0 ? pages : [normalizeRange(blockIndex, blockIndex)];
}

export function measureDocumentPages(
  _document: Document,
  flow: Element,
  contentHeight: number,
): PageRange[] {
  const blocks = getPaginatedBlocks(flow);

  if (blocks.length === 0) {
    return [{ startBlock: 0, endBlock: 0 }];
  }

  const pages: PageRange[] = [];
  let groupStart = 0;
  let group: Element[] = [];

  const flushGroup = (endBlockIndex: number) => {
    if (group.length === 0) {
      return;
    }

    pages.push(normalizeRange(groupStart, endBlockIndex));
    group = [];
  };

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex]!;
    const blockHeight = measureBlocksHeight([block]);
    const textLength = getBlockTextLength(block);
    const textHeight =
      textLength > 0
        ? measureBlockTextSliceHeight(block, 0, textLength - 1)
        : blockHeight;
    const needsSplit =
      (blockHeight > contentHeight || textHeight > contentHeight) && !isAtomicBlock(block);

    if (needsSplit) {
      if (group.length > 0) {
        flushGroup(blockIndex - 1);
      }

      pages.push(...splitBlockToPages(block, blockIndex, contentHeight));
      groupStart = blockIndex + 1;
      continue;
    }

    const trial = [...group, block];
    const height = measureBlocksHeight(trial);

    if (height <= contentHeight || group.length === 0) {
      group.push(block);
      continue;
    }

    flushGroup(blockIndex - 1);
    groupStart = blockIndex;
    group = [block];
  }

  if (group.length > 0) {
    flushGroup(groupStart + group.length - 1);
  }

  if (pages.length === 0) {
    pages.push({ startBlock: 0, endBlock: blocks.length - 1 });
  }

  return pages;
}

function extractPartialBlockHtml(block: Element, startChar: number, endChar: number): string {
  const document = block.ownerDocument!;
  const textLength = getBlockTextLength(block);

  if (textLength === 0 || (startChar <= 0 && endChar >= textLength - 1)) {
    return block.outerHTML;
  }

  const range = document.createRange();
  setRangeToBlockChars(range, block, startChar, endChar);
  const fragment = range.cloneContents();
  const wrapper = document.createElement(block.tagName.toLowerCase());

  for (const attribute of block.attributes) {
    wrapper.setAttribute(attribute.name, attribute.value);
  }

  if (startChar > 0) {
    wrapper.classList.add('lomreader-continued');
  }

  wrapper.appendChild(fragment);

  return wrapper.outerHTML;
}

export function extractBlockRangeHtml(flow: Element, range: PageRange): string {
  const blocks = getPaginatedBlocks(flow);
  const parts: string[] = [];

  for (let blockIndex = range.startBlock; blockIndex <= range.endBlock; blockIndex += 1) {
    const block = blocks[blockIndex];

    if (!block) {
      continue;
    }

    const textLength = getBlockTextLength(block);
    const startChar = blockIndex === range.startBlock ? (range.startChar ?? 0) : 0;
    const endChar =
      blockIndex === range.endBlock ? (range.endChar ?? Math.max(0, textLength - 1)) : Math.max(0, textLength - 1);

    if (startChar <= 0 && endChar >= textLength - 1) {
      parts.push(block.outerHTML);
    } else {
      parts.push(extractPartialBlockHtml(block, startChar, endChar));
    }
  }

  return parts.join('');
}

export function wrapFlowContent(document: Document, measureMode = false): Element {
  const body = document.body;
  const flow = document.createElement('div');
  flow.className = 'lomreader-flow';

  while (body.firstChild) {
    flow.appendChild(body.firstChild);
  }

  const shell = document.createElement('div');
  shell.className = 'lomreader-page-shell';
  shell.appendChild(flow);
  body.appendChild(shell);

  if (measureMode) {
    body.classList.add('lomreader-measure-body');
  }

  return flow;
}

export function wrapFlowForMeasurement(document: Document): Element {
  return wrapFlowContent(document, true);
}

export function injectReaderStyles(document: Document, css: string): void {
  const head = document.head ?? document.getElementsByTagName('head')[0];

  if (!head) {
    return;
  }

  const style = document.createElement('style');
  style.setAttribute('data-lomreader', 'page-shell');
  style.textContent = css;
  head.appendChild(style);
}

export async function waitForDocumentLayout(document: Document): Promise<void> {
  const stylesheetLinks = Array.from(
    document.querySelectorAll('link[rel="stylesheet"]'),
  ) as HTMLLinkElement[];

  await Promise.all(stylesheetLinks.map((link) => waitForStylesheet(link)));

  if (document.fonts?.ready) {
    await document.fonts.ready.catch(() => undefined);
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

function waitForStylesheet(link: HTMLLinkElement, timeoutMs = 2_000): Promise<void> {
  if (link.sheet) {
    return Promise.resolve();
  }

  return Promise.race([
    new Promise<void>((resolve) => {
      link.addEventListener('load', () => resolve(), { once: true });
      link.addEventListener('error', () => resolve(), { once: true });
    }),
    new Promise<void>((resolve) => {
      window.setTimeout(resolve, timeoutMs);
    }),
  ]);
}

export function extractHeadInnerHtml(html: string): string {
  const match = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);

  return match?.[1]?.trim() ?? '';
}

export function buildVirtualPageHtml(
  headInnerHtml: string,
  fragmentHtml: string,
  shellCss: string,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
${headInnerHtml}
<style data-lomreader="page-shell">
${shellCss}
</style>
</head>
<body>
<div class="lomreader-page-shell">
<div class="lomreader-flow">
${fragmentHtml}
</div>
</div>
</body>
</html>`;
}
