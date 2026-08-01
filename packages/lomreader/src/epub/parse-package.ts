import type {
  LinkedResource,
  ManifestItem,
  ManifestPlane,
  PackageDocument,
  SpineItemRef,
  SpinePlane,
} from '../types';
import { readArchiveText, type EpubArchive } from './archive';
import { resolveRelativePath } from './paths';
import {
  childElements,
  firstChildElement,
  getAttribute,
  parseXml,
  splitProperties,
  textContent,
  type XmlElementLike,
} from './xml';

function parseManifestItems(
  manifestElement: XmlElementLike,
  packagePath: string,
): ManifestItem[] {
  return childElements(manifestElement, 'item').map((item) => {
    const id = getAttribute(item, 'id');
    const href = getAttribute(item, 'href');
    const mediaType = getAttribute(item, 'media-type');

    if (!id || !href || !mediaType) {
      throw new Error('Manifest item is missing required id, href, or media-type');
    }

    return {
      id,
      href,
      mediaType,
      properties: splitProperties(getAttribute(item, 'properties')),
      fallback: getAttribute(item, 'fallback'),
      path: resolveRelativePath(packagePath, href),
    };
  });
}

function parseLinkedResources(metadataElement: XmlElementLike): LinkedResource[] {
  return childElements(metadataElement, 'link')
    .filter((link) => !link.hasAttribute('refines'))
    .map((link) => {
      const href = getAttribute(link, 'href');
      const rel = getAttribute(link, 'rel');

      if (!href || !rel) {
        throw new Error('Metadata link is missing required href or rel');
      }

      return {
        href,
        rel,
        mediaType: getAttribute(link, 'media-type'),
        properties: splitProperties(getAttribute(link, 'properties')),
      };
    });
}

function buildManifestPlane(
  items: ManifestItem[],
  linkedResources: LinkedResource[],
): ManifestPlane {
  const byId = new Map<string, ManifestItem>();
  const byPath = new Map<string, ManifestItem>();

  for (const item of items) {
    byId.set(item.id, item);
    byPath.set(item.path, item);
  }

  return {
    publicationResources: items,
    linkedResources,
    byId,
    byPath,
  };
}

function resolveFallbackChain(
  item: ManifestItem,
  manifest: ManifestPlane,
): ManifestItem[] {
  const chain: ManifestItem[] = [];
  const visited = new Set<string>();
  let current: ManifestItem | undefined = item;

  while (current?.fallback) {
    if (visited.has(current.id)) {
      break;
    }

    visited.add(current.id);

    const fallback = manifest.byId.get(current.fallback);

    if (!fallback) {
      break;
    }

    chain.push(fallback);
    current = fallback;
  }

  return chain;
}

function parseSpine(
  spineElement: XmlElementLike,
  manifest: ManifestPlane,
): SpinePlane {
  const itemrefs: SpineItemRef[] = [];

  for (const itemref of childElements(spineElement, 'itemref')) {
    const idref = getAttribute(itemref, 'idref');

    if (!idref) {
      throw new Error('Spine itemref is missing idref attribute');
    }

    const item = manifest.byId.get(idref);

    if (!item) {
      throw new Error(`Spine itemref references unknown manifest id: ${idref}`);
    }

    itemrefs.push({
      idref,
      linear: getAttribute(itemref, 'linear') !== 'no',
      item,
      fallbackChain: resolveFallbackChain(item, manifest),
    });
  }

  return { itemrefs };
}

export function parsePackageDocument(
  archive: EpubArchive,
  packagePath: string,
): PackageDocument {
  const packageXml = readArchiveText(archive, packagePath);

  if (!packageXml) {
    throw new Error(`Package document not found at ${packagePath}`);
  }

  const doc = parseXml(packageXml);
  const packageElement = doc.documentElement;

  if (!packageElement) {
    throw new Error('Package document is missing a root element');
  }
  const metadataElement = firstChildElement(packageElement, 'metadata');
  const manifestElement = firstChildElement(packageElement, 'manifest');
  const spineElement = firstChildElement(packageElement, 'spine');

  if (!metadataElement || !manifestElement || !spineElement) {
    throw new Error('Package document is missing metadata, manifest, or spine');
  }

  const publicationResources = parseManifestItems(manifestElement, packagePath);
  const linkedResources = parseLinkedResources(metadataElement);
  const manifest = buildManifestPlane(publicationResources, linkedResources);
  const spine = parseSpine(spineElement, manifest);

  const uniqueIdentifierId = getAttribute(packageElement, 'unique-identifier');
  const identifierElement = uniqueIdentifierId
    ? Array.from(metadataElement.getElementsByTagName('*')).find(
        (element) =>
          element.localName === 'identifier' &&
          getAttribute(element, 'id') === uniqueIdentifierId,
      )
    : Array.from(metadataElement.getElementsByTagName('*')).find(
        (element) => element.localName === 'identifier',
      );

  return {
    path: packagePath,
    version: getAttribute(packageElement, 'version'),
    uniqueIdentifier: identifierElement
      ? textContent(identifierElement)
      : undefined,
    manifest,
    spine,
  };
}
