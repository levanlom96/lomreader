import type { ContentResourceClassification, ManifestItem } from '../types';
import { CORE_MEDIA_TYPES, EPUB_CONTENT_DOCUMENT_MEDIA_TYPES } from './constants';
import { isRemoteHref, resolveRelativePath } from './paths';

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const IMPORT_PATTERN = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)/gi;

const REFERENCE_ATTRIBUTES = [
  { tag: 'link', attr: 'href' },
  { tag: 'script', attr: 'src' },
  { tag: 'img', attr: 'src' },
  { tag: 'video', attr: 'src' },
  { tag: 'audio', attr: 'src' },
  { tag: 'source', attr: 'src' },
  { tag: 'iframe', attr: 'src' },
  { tag: 'embed', attr: 'src' },
  { tag: 'object', attr: 'data' },
  { tag: 'image', attr: 'href' },
  { tag: 'use', attr: 'href' },
] as const;

export function isEpubContentDocument(item: ManifestItem): boolean {
  return EPUB_CONTENT_DOCUMENT_MEDIA_TYPES.has(item.mediaType);
}

export function classifyContentResource(
  mediaType: string,
): ContentResourceClassification {
  if (CORE_MEDIA_TYPES.has(mediaType)) {
    return 'core-media-type';
  }

  if (
    mediaType.startsWith('application/') &&
    (mediaType.includes('font') || mediaType.endsWith('+xml'))
  ) {
    return 'exempt';
  }

  if (mediaType.startsWith('application/') || mediaType.startsWith('image/')) {
    return 'foreign';
  }

  return 'unknown';
}

function extractCssReferences(css: string): string[] {
  const references = new Set<string>();

  for (const match of css.matchAll(CSS_URL_PATTERN)) {
    const href = match[2];

    if (href && !href.startsWith('data:')) {
      references.add(href);
    }
  }

  for (const match of css.matchAll(IMPORT_PATTERN)) {
    const href = match[2] ?? match[4];

    if (href && !href.startsWith('data:')) {
      references.add(href);
    }
  }

  return [...references];
}

function extractDocumentReferences(html: string): string[] {
  const references = new Set<string>();

  for (const { tag, attr } of REFERENCE_ATTRIBUTES) {
    const pattern = new RegExp(
      `<${tag}\\b[^>]*\\s${attr}\\s*=\\s*(['"])([^'"]+)\\1`,
      'gi',
    );

    for (const match of html.matchAll(pattern)) {
      references.add(match[2]);
    }
  }

  for (const match of html.matchAll(/\shref\s*=\s*(['"])([^'"]+)\1/gi)) {
    const href = match[2];

    if (!href.startsWith('#')) {
      references.add(href);
    }
  }

  return [...references];
}

export function discoverReferences(
  content: string,
  mediaType: string,
): string[] {
  if (mediaType === 'text/css') {
    return extractCssReferences(content);
  }

  if (
    mediaType === 'application/xhtml+xml' ||
    mediaType === 'image/svg+xml' ||
    mediaType === 'application/svg+xml'
  ) {
    return extractDocumentReferences(content);
  }

  return [];
}

export function resolveManifestReference(
  href: string,
  sourcePath: string,
): string | undefined {
  if (!href || href.startsWith('#') || isRemoteHref(href)) {
    return undefined;
  }

  return resolveRelativePath(sourcePath, href.split('#')[0] ?? href);
}
