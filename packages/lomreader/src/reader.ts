import type { Publication, ReaderOptions } from './types';
import { loadArchive, readArchiveBytes, readArchiveText } from './epub/archive';
import { findPackageDocumentPath } from './epub/parse-container';
import { parsePackageDocument } from './epub/parse-package';
import { buildContentPlane } from './epub/planes';
import { normalizeContainerPath, resolveRelativePath } from './epub/paths';

const VERSION = '0.0.1' as const;

async function fetchEpub(url: string, fetchImpl: typeof fetch): Promise<Uint8Array> {
  const response = await fetchImpl(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch EPUB (${response.status} ${response.statusText})`);
  }

  const buffer = await response.arrayBuffer();

  return new Uint8Array(buffer);
}

export class LomReader {
  readonly version = VERSION;

  private readonly fetchImpl: typeof fetch;

  constructor(options: ReaderOptions = {}) {
    this.fetchImpl = options.fetch ?? globalThis.fetch.bind(globalThis);

    if (typeof this.fetchImpl !== 'function') {
      throw new Error('A fetch implementation is required to open EPUB URLs');
    }
  }

  async open(url: string): Promise<Publication> {
    const data = await fetchEpub(url, this.fetchImpl);
    const archive = await loadArchive(data);
    const packagePath = findPackageDocumentPath(archive);
    const packageDocument = parsePackageDocument(archive, packagePath);
    const content = buildContentPlane(archive, packageDocument);

    return {
      url,
      packageDocument,
      manifest: packageDocument.manifest,
      spine: packageDocument.spine,
      content,
      resolveHref: (href: string, relativeTo: string) =>
        normalizeContainerPath(resolveRelativePath(relativeTo, href)),
      getText: async (path: string) => {
        const text = readArchiveText(archive, path);

        if (text === undefined) {
          throw new Error(`Resource not found: ${path}`);
        }

        return text;
      },
      getBytes: async (path: string) => {
        const bytes = readArchiveBytes(archive, path);

        if (!bytes) {
          throw new Error(`Resource not found: ${path}`);
        }

        return bytes;
      },
    };
  }
}

export function createReader(options?: ReaderOptions): LomReader {
  return new LomReader(options);
}

export { VERSION };
