import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolvePackageRoot(): string {
  try {
    return path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
  } catch {
    return process.cwd();
  }
}

const packageRoot = resolvePackageRoot();

export const HYPATIA_EPUB_PATH = path.resolve(
  packageRoot,
  '../../apps/epub-server/public/epubs/hypatia.epub',
);

export async function loadHypatiaEpub(): Promise<Uint8Array> {
  const buffer = await readFile(HYPATIA_EPUB_PATH);
  return new Uint8Array(buffer);
}

export function mockFetchWithBytes(bytes: Uint8Array): typeof fetch {
  return async () =>
    new Response(new Blob([Buffer.from(bytes)]), {
      status: 200,
      headers: { 'Content-Type': 'application/epub+zip' },
    });
}

export function mockFetchWithStatus(status: number, statusText = 'Error'): typeof fetch {
  return async () => new Response(null, { status, statusText });
}

export async function openEpubFromBytes(
  bytes: Uint8Array,
  url = 'http://test.local/book.epub',
) {
  const { createReader } = await import('../src/reader');
  const reader = createReader({ fetch: mockFetchWithBytes(bytes) });
  return reader.open(url);
}

export async function parseEpubBytes(bytes: Uint8Array) {
  const { loadArchive } = await import('../src/epub/archive');
  const { findPackageDocumentPath } = await import('../src/epub/parse-container');
  const { parsePackageDocument } = await import('../src/epub/parse-package');
  const { buildContentPlane } = await import('../src/epub/planes');

  const archive = await loadArchive(bytes);
  const packagePath = findPackageDocumentPath(archive);
  const packageDocument = parsePackageDocument(archive, packagePath);
  const content = buildContentPlane(archive, packageDocument);

  return { archive, packagePath, packageDocument, content };
}
