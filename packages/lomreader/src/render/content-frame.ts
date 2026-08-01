import { EPUB_CONTENT_DOCUMENT_MEDIA_TYPES } from '../epub/constants';
import type { Publication } from '../types';
import { prepareContentDocument } from './prepare-document';

export class ContentFrame {
  readonly element: HTMLIFrameElement;

  constructor(sandbox = 'allow-same-origin') {
    this.element = document.createElement('iframe');
    this.element.className = 'lomreader-content-frame';
    this.element.setAttribute('sandbox', sandbox);
    this.element.setAttribute('title', 'EPUB content');
  }

  async loadChapter(publication: Publication, documentPath: string): Promise<void> {
    const blobUrl = await prepareContentDocument(
      publication.blobStore,
      publication.manifest,
      documentPath,
      (path) => publication.getText(path),
    );

    this.element.src = blobUrl;
  }

  destroy(): void {
    this.element.remove();
  }
}

export function isRenderableSpineMediaType(mediaType: string): boolean {
  return EPUB_CONTENT_DOCUMENT_MEDIA_TYPES.has(mediaType);
}

export function getLinearSpineIndices(publication: Publication): number[] {
  return publication.spine.itemrefs
    .map((itemref, index) => ({ itemref, index }))
    .filter(({ itemref }) => itemref.linear)
    .filter(({ itemref }) => isRenderableSpineMediaType(itemref.item.mediaType))
    .map(({ index }) => index);
}

export function findInitialSpineIndex(publication: Publication): number {
  const linear = getLinearSpineIndices(publication);

  if (linear.length === 0) {
    throw new Error('Publication has no linear XHTML spine items to render');
  }

  return linear[0]!;
}
