import { normalizeContainerPath } from '../epub/paths';
import type { ManifestPlane } from '../types';

const EXTENSION_MEDIA_TYPES: Record<string, string> = {
  xhtml: 'application/xhtml+xml',
  html: 'application/xhtml+xml',
  css: 'text/css',
  js: 'text/javascript',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  svg: 'image/svg+xml',
  webp: 'image/webp',
  woff: 'font/woff',
  woff2: 'font/woff2',
  ttf: 'font/ttf',
  otf: 'font/otf',
};

export function guessMediaType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase() ?? '';

  return EXTENSION_MEDIA_TYPES[extension] ?? 'application/octet-stream';
}

export function resolveMediaType(path: string, manifest: ManifestPlane): string {
  const item = manifest.byPath.get(normalizeContainerPath(path));

  return item?.mediaType ?? guessMediaType(path);
}

export class BlobUrlStore {
  private readonly urls = new Map<string, string>();

  constructor(
    private readonly getBytes: (path: string) => Promise<Uint8Array>,
    private readonly manifest: ManifestPlane,
  ) {}

  async getBlobUrl(path: string): Promise<string> {
    const normalized = normalizeContainerPath(path);
    const existing = this.urls.get(normalized);

    if (existing) {
      return existing;
    }

    const bytes = await this.getBytes(normalized);
    const mediaType = resolveMediaType(normalized, this.manifest);

    return this.registerBlob(normalized, new Uint8Array(bytes), mediaType);
  }

  registerBlob(path: string, content: BlobPart, mediaType: string): string {
    const normalized = normalizeContainerPath(path);
    const existing = this.urls.get(normalized);

    if (existing) {
      URL.revokeObjectURL(existing);
    }

    const blob = new Blob([content], { type: mediaType });
    const url = URL.createObjectURL(blob);

    this.urls.set(normalized, url);

    return url;
  }

  revokeAll(): void {
    for (const url of this.urls.values()) {
      URL.revokeObjectURL(url);
    }

    this.urls.clear();
  }
}
