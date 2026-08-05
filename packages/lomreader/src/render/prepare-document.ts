import {
  discoverReferences,
  resolveManifestReference,
} from '../epub/content-discovery';
import { isRemoteHref } from '../epub/paths';
import type { ManifestPlane } from '../types';
import { resolveMediaType, type BlobUrlStore } from './blob-store';

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

const CSS_URL_PATTERN = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
const CSS_IMPORT_PATTERN =
  /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)/gi;

async function ensureBlobUrl(
  store: BlobUrlStore,
  manifest: ManifestPlane,
  href: string,
  sourcePath: string,
  getText: (path: string) => Promise<string>,
  visited: Set<string>,
): Promise<string | undefined> {
  if (!href || href.startsWith('#') || href.startsWith('data:') || isRemoteHref(href)) {
    return undefined;
  }

  const resolvedPath = resolveManifestReference(href, sourcePath);

  if (!resolvedPath || !manifest.byPath.has(resolvedPath)) {
    return undefined;
  }

  if (visited.has(resolvedPath)) {
    return store.getBlobUrl(resolvedPath);
  }

  visited.add(resolvedPath);

  const item = manifest.byPath.get(resolvedPath)!;

  if (item.mediaType === 'text/css') {
    const cssText = await getText(resolvedPath);
    const rewritten = await rewriteCssReferences(
      store,
      manifest,
      resolvedPath,
      cssText,
      getText,
      visited,
    );

    return store.registerBlob(resolvedPath, rewritten, 'text/css');
  }

  return store.getBlobUrl(resolvedPath);
}

async function rewriteCssReferences(
  store: BlobUrlStore,
  manifest: ManifestPlane,
  cssPath: string,
  css: string,
  getText: (path: string) => Promise<string>,
  visited: Set<string>,
): Promise<string> {
  let output = css;

  for (const match of css.matchAll(CSS_URL_PATTERN)) {
    const href = match[2];
    const blobUrl = await ensureBlobUrl(
      store,
      manifest,
      href,
      cssPath,
      getText,
      visited,
    );

    if (blobUrl) {
      output = output.replace(match[0], `url("${blobUrl}")`);
    }
  }

  for (const match of css.matchAll(CSS_IMPORT_PATTERN)) {
    const href = match[2] ?? match[4];
    const blobUrl = await ensureBlobUrl(
      store,
      manifest,
      href,
      cssPath,
      getText,
      visited,
    );

    if (blobUrl) {
      output = output.replace(match[0], `@import url("${blobUrl}")`);
    }
  }

  return output;
}

function replaceAttributeReference(
  html: string,
  tag: string,
  attr: string,
  oldHref: string,
  newHref: string,
): string {
  const escaped = oldHref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(
    `(<${tag}\\b[^>]*\\s${attr}\\s*=\\s*(['"]))${escaped}\\2`,
    'gi',
  );

  return html.replace(pattern, `$1${newHref}$2`);
}

export async function rewriteContentDocumentHtml(
  store: BlobUrlStore,
  manifest: ManifestPlane,
  documentPath: string,
  getText: (path: string) => Promise<string>,
): Promise<string> {
  const visited = new Set<string>();
  let html = await getText(documentPath);
  const references = discoverReferences(html, 'application/xhtml+xml');

  for (const href of references) {
    const blobUrl = await ensureBlobUrl(
      store,
      manifest,
      href,
      documentPath,
      getText,
      visited,
    );

    if (!blobUrl) {
      continue;
    }

    for (const { tag, attr } of REFERENCE_ATTRIBUTES) {
      html = replaceAttributeReference(html, tag, attr, href, blobUrl);
    }

    html = replaceAttributeReference(html, 'a', 'href', href, blobUrl);
  }

  return html;
}

export async function prepareContentDocument(
  store: BlobUrlStore,
  manifest: ManifestPlane,
  documentPath: string,
  getText: (path: string) => Promise<string>,
): Promise<string> {
  const html = await rewriteContentDocumentHtml(store, manifest, documentPath, getText);

  return store.registerBlob(
    `${documentPath}#prepared`,
    html,
    resolveMediaType(documentPath, manifest),
  );
}
