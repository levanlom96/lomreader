import { unzip } from 'fflate';
import { normalizeContainerPath } from './paths';

export type EpubArchive = ReadonlyMap<string, Uint8Array>;

export async function loadArchive(data: Uint8Array): Promise<EpubArchive> {
  const entries = await new Promise<Record<string, Uint8Array>>((resolve, reject) => {
    unzip(data, (error, files) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(files);
    });
  });

  const archive = new Map<string, Uint8Array>();

  for (const [path, content] of Object.entries(entries)) {
    archive.set(normalizeContainerPath(path), content);
  }

  return archive;
}

export function readArchiveText(
  archive: EpubArchive,
  path: string,
): string | undefined {
  const bytes = archive.get(normalizeContainerPath(path));

  if (!bytes) {
    return undefined;
  }

  return new TextDecoder().decode(bytes);
}

export function readArchiveBytes(
  archive: EpubArchive,
  path: string,
): Uint8Array | undefined {
  return archive.get(normalizeContainerPath(path));
}

export function listArchivePaths(archive: EpubArchive): string[] {
  return [...archive.keys()].sort();
}
