import type { SpreadLayout } from '../types';
import type { PageViewport } from './types';
import {
  PAGE_MAP_CACHE_SCHEMA_VERSION,
  type CachedBookPageMap,
  type VirtualPage,
} from './types';
import { viewportCacheKey } from './page-shell';

export interface PageMapCacheStore {
  get(key: string): Promise<CachedBookPageMap | null>;
  set(key: string, value: CachedBookPageMap): Promise<void>;
}

export function buildPageMapCacheKey(
  bookKey: string,
  bookVersion: string,
  viewport: PageViewport,
  layout: SpreadLayout,
): string {
  return `lomreader:page-map:${bookKey}:${bookVersion}:${viewportCacheKey(viewport)}:${layout}`;
}

export function createMemoryPageMapCache(): PageMapCacheStore {
  const entries = new Map<string, CachedBookPageMap>();

  return {
    get: async (key) => entries.get(key) ?? null,
    set: async (key, value) => {
      entries.set(key, value);
    },
  };
}

export function createLocalStoragePageMapCache(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = globalThis.localStorage,
): PageMapCacheStore {
  return {
    get: async (key) => {
      const raw = storage.getItem(key);

      if (!raw) {
        return null;
      }

      try {
        const parsed = JSON.parse(raw) as CachedBookPageMap;

        if (parsed.schemaVersion !== PAGE_MAP_CACHE_SCHEMA_VERSION) {
          storage.removeItem(key);
          return null;
        }

        return parsed;
      } catch {
        storage.removeItem(key);
        return null;
      }
    },
    set: async (key, value) => {
      storage.setItem(key, JSON.stringify(value));
    },
  };
}

export function serializeBookPageMap(input: {
  bookKey: string;
  bookVersion: string;
  viewportKey: string;
  layout: SpreadLayout;
  pages: VirtualPage[];
  chapterStartPage: number[];
}): CachedBookPageMap {
  return {
    schemaVersion: PAGE_MAP_CACHE_SCHEMA_VERSION,
    bookKey: input.bookKey,
    bookVersion: input.bookVersion,
    viewportKey: input.viewportKey,
    layout: input.layout,
    pages: input.pages,
    chapterStartPage: input.chapterStartPage,
  };
}

export function isCachedPageMapCompatible(
  cached: CachedBookPageMap,
  bookKey: string,
  bookVersion: string,
  viewportKey: string,
  layout: SpreadLayout,
): boolean {
  return (
    cached.bookKey === bookKey &&
    cached.bookVersion === bookVersion &&
    cached.viewportKey === viewportKey &&
    cached.layout === layout
  );
}
