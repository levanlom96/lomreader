export interface ManifestItem {
  id: string;
  href: string;
  mediaType: string;
  properties: string[];
  fallback?: string;
  /** Path relative to the EPUB container root. */
  path: string;
}

export interface LinkedResource {
  href: string;
  rel: string;
  mediaType?: string;
  properties: string[];
}

/** All publication resources and linked resources (EPUB 3.3 sec. 3.1.1). */
export interface ManifestPlane {
  publicationResources: ManifestItem[];
  linkedResources: LinkedResource[];
  byId: ReadonlyMap<string, ManifestItem>;
  byPath: ReadonlyMap<string, ManifestItem>;
}

export interface SpineItemRef {
  idref: string;
  linear: boolean;
  item: ManifestItem;
  /** Resources reachable via manifest fallbacks for this spine entry. */
  fallbackChain: ManifestItem[];
}

/** Resources in default reading order (EPUB 3.3 sec. 3.1.2). */
export interface SpinePlane {
  itemrefs: SpineItemRef[];
}

export type ContentResourceClassification =
  | 'core-media-type'
  | 'foreign'
  | 'exempt'
  | 'unknown';

/** Resources used when rendering content documents (EPUB 3.3 sec. 3.1.3). */
export interface ContentResource {
  item: ManifestItem;
  usedBy: string[];
  classification: ContentResourceClassification;
}

export interface ContentPlane {
  resources: ContentResource[];
}

export interface PackageDocument {
  path: string;
  version?: string;
  uniqueIdentifier?: string;
  manifest: ManifestPlane;
  spine: SpinePlane;
}

export interface Publication {
  url: string;
  packageDocument: PackageDocument;
  manifest: ManifestPlane;
  spine: SpinePlane;
  content: ContentPlane;
  getText(path: string): Promise<string>;
  getBytes(path: string): Promise<Uint8Array>;
  resolveHref(href: string, relativeTo: string): string;
}

export interface ReaderOptions {
  fetch?: typeof fetch;
}

export interface Reader {
  version: string;
  open(url: string): Promise<Publication>;
}
