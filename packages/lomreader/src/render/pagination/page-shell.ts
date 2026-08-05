import type { PageViewport } from './types';

export const DEFAULT_PAGE_PADDING = 24;

export function sanitizePreparedHtml(html: string): string {
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
}

export function buildPageShellStyles(viewport: PageViewport, mode: 'display' | 'measure'): string {
  const heightRule =
    mode === 'measure'
      ? 'height: auto; overflow: visible;'
      : `height: ${viewport.contentHeight}px; overflow: hidden;`;

  return `
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

body.lomreader-measure-body {
  overflow: visible;
  height: auto;
}

.lomreader-page-shell {
  box-sizing: content-box;
  width: ${viewport.contentWidth}px;
  ${heightRule}
  padding: ${viewport.padding}px;
  margin: 0 auto;
}

.lomreader-flow {
  width: 100%;
}

.lomreader-flow .lomreader-continued {
  text-indent: 0;
}
`.trim();
}

export function viewportCacheKey(viewport: PageViewport): string {
  return `${viewport.contentWidth}x${viewport.contentHeight}p${viewport.padding}`;
}

export function derivePageViewport(
  container: HTMLElement,
  layout: '1-up' | '2-up',
  padding = DEFAULT_PAGE_PADDING,
  gap = 1,
): PageViewport {
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (width <= 0 || height <= 0) {
    return {
      contentWidth: 320,
      contentHeight: 480,
      padding,
    };
  }

  const slotWidth = layout === '2-up' ? (width - gap) / 2 : width;

  return {
    contentWidth: Math.max(1, Math.floor(slotWidth - padding * 2)),
    contentHeight: Math.max(1, Math.floor(height - padding * 2)),
    padding,
  };
}
