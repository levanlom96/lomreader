/**
 * Normalize a path within the EPUB container (always forward slashes, no leading slash).
 */
export function normalizeContainerPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '');
}

/**
 * Resolve an href relative to a base path within the EPUB container.
 * @see EPUB 3.3 sec. 3.6 Resource locations
 */
export function resolveRelativePath(basePath: string, href: string): string {
  const baseDir = basePath.includes('/')
    ? basePath.slice(0, basePath.lastIndexOf('/') + 1)
    : '';

  const segments = `${baseDir}${href}`.split('/');

  const resolved: string[] = [];

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue;
    }

    if (segment === '..') {
      resolved.pop();
      continue;
    }

    resolved.push(segment);
  }

  return resolved.join('/');
}

export function directoryOf(path: string): string {
  const index = path.lastIndexOf('/');

  if (index === -1) {
    return '';
  }

  return path.slice(0, index);
}

export function isRemoteHref(href: string): boolean {
  return /^[a-z][a-z0-9+.-]*:/i.test(href);
}

export function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}
