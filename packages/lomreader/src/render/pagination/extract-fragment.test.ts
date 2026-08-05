import { describe, expect, it } from 'vitest';
import {
  extractBlockRangeHtml,
  getPaginatedBlocks,
  measureDocumentPages,
  wrapFlowForMeasurement,
} from './extract-fragment';
import { buildPageShellStyles } from './page-shell';

function mountChapter(body: string, contentWidth = 352, contentHeight = 400): {
  document: Document;
  flow: Element;
} {
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.left = '-10000px';
  frame.style.top = '0';
  frame.style.width = `${contentWidth + 48}px`;
  frame.style.height = `${contentHeight + 48}px`;
  frame.src = 'about:blank';
  document.body.appendChild(frame);

  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head>
<style>
p { margin: 0 0 1em; line-height: 1.5; text-indent: 1em; }
h2 { margin: 0 0 0.5em; }
</style>
</head><body>${body}</body></html>`);
  doc.close();

  const flow = wrapFlowForMeasurement(doc);
  const style = doc.createElement('style');
  style.textContent = buildPageShellStyles(
    { contentWidth, contentHeight, padding: 24 },
    'measure',
  );
  doc.head.appendChild(style);

  return { document: doc, flow };
}

describe('getPaginatedBlocks', () => {
  it('keeps leaf blocks and drops ancestor wrappers', () => {
    const { flow } = mountChapter(`
      <section>
        <hgroup><h2>I</h2><p>Title</p></hgroup>
        <p>One</p>
        <p>Two</p>
      </section>
    `);

    const blocks = getPaginatedBlocks(flow);

    expect(blocks.map((block) => block.tagName.toLowerCase())).toEqual(['h2', 'p', 'p', 'p']);
  });
});

describe('measureDocumentPages', () => {
  it('packs multiple short paragraphs onto one page', () => {
    const paragraphs = Array.from({ length: 8 }, (_, index) => `<p>Short ${index}.</p>`).join('');
    const { document, flow } = mountChapter(paragraphs);

    const pages = measureDocumentPages(document, flow, 400);

    expect(pages.length).toBeLessThan(8);
    expect(pages[0]?.endBlock).toBeGreaterThan(pages[0]?.startBlock ?? 0);
  });

  it('supports partial ranges for oversized paragraphs', () => {
    const { flow } = mountChapter('<p>Alpha beta gamma delta epsilon zeta.</p>');

    const firstSlice = extractBlockRangeHtml(flow, {
      startBlock: 0,
      endBlock: 0,
      startChar: 0,
      endChar: 4,
    });
    const secondSlice = extractBlockRangeHtml(flow, {
      startBlock: 0,
      endBlock: 0,
      startChar: 5,
      endChar: 20,
    });

    expect(firstSlice).toContain('Alpha');
    expect(firstSlice).not.toContain('beta');
    expect(secondSlice).toContain('beta');
    expect(secondSlice).toContain('lomreader-continued');
  });
});

describe('extractBlockRangeHtml', () => {
  it('extracts a partial paragraph slice', () => {
    const { flow } = mountChapter('<p>Alpha beta gamma delta.</p>');
    const blocks = getPaginatedBlocks(flow);
    const block = blocks[0]!;

    expect(block.textContent).toContain('Alpha');

    const html = extractBlockRangeHtml(flow, {
      startBlock: 0,
      endBlock: 0,
      startChar: 6,
      endChar: 15,
    });

    expect(html).toContain('beta');
    expect(html).not.toContain('Alpha');
    expect(html).toContain('lomreader-continued');
  });
});
