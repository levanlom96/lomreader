import type {
  ContentPlane,
  ContentResource,
  ManifestItem,
  ManifestPlane,
  PackageDocument,
  SpinePlane,
} from '../types';
import { readArchiveText, type EpubArchive } from './archive';
import {
  classifyContentResource,
  discoverReferences,
  isEpubContentDocument,
  resolveManifestReference,
} from './content-discovery';

function collectSpineFallbackItems(spine: SpinePlane): ManifestItem[] {
  const items: ManifestItem[] = [];

  for (const itemref of spine.itemrefs) {
    items.push(...itemref.fallbackChain);
  }

  return items;
}

function collectContentDocuments(
  packageDocument: PackageDocument,
): ManifestItem[] {
  const documents = new Map<string, ManifestItem>();

  for (const itemref of packageDocument.spine.itemrefs) {
    documents.set(itemref.item.path, itemref.item);
  }

  for (const item of collectSpineFallbackItems(packageDocument.spine)) {
    documents.set(item.path, item);
  }

  for (const item of packageDocument.manifest.publicationResources) {
    if (
      item.properties.includes('nav') &&
      isEpubContentDocument(item) &&
      !documents.has(item.path)
    ) {
      documents.set(item.path, item);
    }
  }

  return [...documents.values()];
}

function addContentResource(
  resources: Map<string, ContentResource>,
  item: ManifestItem,
  usedBy: string,
): void {
  const existing = resources.get(item.path);

  if (existing) {
    if (!existing.usedBy.includes(usedBy)) {
      existing.usedBy.push(usedBy);
    }

    return;
  }

  resources.set(item.path, {
    item,
    usedBy: [usedBy],
    classification: classifyContentResource(item.mediaType),
  });
}

function walkContentReferences(
  archive: EpubArchive,
  manifest: ManifestPlane,
  sourceItem: ManifestItem,
  resources: Map<string, ContentResource>,
  visited: Set<string>,
): void {
  if (visited.has(sourceItem.path)) {
    return;
  }

  visited.add(sourceItem.path);

  const sourceText = readArchiveText(archive, sourceItem.path);

  if (!sourceText) {
    return;
  }

  const references = discoverReferences(sourceText, sourceItem.mediaType);

  for (const href of references) {
    const resolvedPath = resolveManifestReference(href, sourceItem.path);

    if (!resolvedPath) {
      continue;
    }

    const referencedItem = manifest.byPath.get(resolvedPath);

    if (!referencedItem) {
      continue;
    }

    addContentResource(resources, referencedItem, sourceItem.path);

    if (
      referencedItem.mediaType === 'text/css' ||
      isEpubContentDocument(referencedItem)
    ) {
      walkContentReferences(
        archive,
        manifest,
        referencedItem,
        resources,
        visited,
      );
    }
  }
}

export function buildContentPlane(
  archive: EpubArchive,
  packageDocument: PackageDocument,
): ContentPlane {
  const resources = new Map<string, ContentResource>();
  const contentDocuments = collectContentDocuments(packageDocument);

  for (const document of contentDocuments) {
    if (!isEpubContentDocument(document)) {
      continue;
    }

    walkContentReferences(
      archive,
      packageDocument.manifest,
      document,
      resources,
      new Set<string>(),
    );
  }

  return {
    resources: [...resources.values()].sort((left, right) =>
      left.item.path.localeCompare(right.item.path),
    ),
  };
}

export function buildManifestPlaneSummary(manifest: ManifestPlane): {
  publicationResourceCount: number;
  linkedResourceCount: number;
} {
  return {
    publicationResourceCount: manifest.publicationResources.length,
    linkedResourceCount: manifest.linkedResources.length,
  };
}

export function buildSpinePlaneSummary(spine: SpinePlane): {
  itemrefCount: number;
  linearCount: number;
} {
  return {
    itemrefCount: spine.itemrefs.length,
    linearCount: spine.itemrefs.filter((itemref) => itemref.linear).length,
  };
}
