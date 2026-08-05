import type { Publication } from '../types';
import { ContentFrame } from './content-frame';
import type { SpreadLayout } from './types';

export function getSpreadStartLinearIndex(
  linearIndex: number,
  layout: SpreadLayout,
): number {
  if (layout === '1-up') {
    return linearIndex;
  }

  return linearIndex - (linearIndex % 2);
}

export function getSpreadStep(layout: SpreadLayout): number {
  return layout === '2-up' ? 2 : 1;
}

export function getSpreadLinearIndices(
  spreadStartLinearIndex: number,
  layout: SpreadLayout,
  linearSpineCount: number,
): number[] {
  if (spreadStartLinearIndex < 0 || spreadStartLinearIndex >= linearSpineCount) {
    return [];
  }

  if (layout === '1-up') {
    return [spreadStartLinearIndex];
  }

  const indices = [spreadStartLinearIndex];

  if (spreadStartLinearIndex + 1 < linearSpineCount) {
    indices.push(spreadStartLinearIndex + 1);
  }

  return indices;
}

export class ContentSpread {
  readonly element: HTMLDivElement;
  private readonly leftFrame: ContentFrame;
  private readonly rightFrame: ContentFrame;
  private layout: SpreadLayout = '1-up';

  constructor(sandbox = 'allow-same-origin') {
    this.leftFrame = new ContentFrame(sandbox);
    this.rightFrame = new ContentFrame(sandbox);

    this.element = document.createElement('div');
    this.element.className = 'lomreader-spread lomreader-spread--1-up';
    this.element.append(this.leftFrame.element, this.rightFrame.element);
  }

  getLayout(): SpreadLayout {
    return this.layout;
  }

  setLayout(layout: SpreadLayout): void {
    this.layout = layout;
    this.element.classList.toggle('lomreader-spread--2-up', layout === '2-up');
    this.element.classList.toggle('lomreader-spread--1-up', layout === '1-up');
    this.leftFrame.element.dataset.slot = layout === '2-up' ? 'left' : 'single';
    this.rightFrame.element.hidden = layout === '1-up';
  }

  getFrameElements(): HTMLIFrameElement[] {
    if (this.layout === '1-up') {
      return [this.leftFrame.element];
    }

    return [this.leftFrame.element, this.rightFrame.element];
  }

  getPrimaryFrameElement(): HTMLIFrameElement {
    return this.leftFrame.element;
  }

  async loadSpread(
    publication: Publication,
    leftPath: string | undefined,
    rightPath: string | undefined,
  ): Promise<void> {
    if (this.layout === '1-up') {
      if (!leftPath) {
        throw new Error('Missing document path for 1-up spread');
      }

      await this.leftFrame.loadChapter(publication, leftPath);
      this.leftFrame.element.hidden = false;
      this.rightFrame.element.hidden = true;
      this.rightFrame.element.removeAttribute('src');

      return;
    }

    const loads: Promise<void>[] = [];

    if (leftPath) {
      this.leftFrame.element.hidden = false;
      loads.push(this.leftFrame.loadChapter(publication, leftPath));
    } else {
      this.leftFrame.element.hidden = true;
      this.leftFrame.element.removeAttribute('src');
    }

    if (rightPath) {
      this.rightFrame.element.hidden = false;
      loads.push(this.rightFrame.loadChapter(publication, rightPath));
    } else {
      this.rightFrame.element.hidden = true;
      this.rightFrame.element.removeAttribute('src');
    }

    await Promise.all(loads);
  }

  loadPageSpread(leftHtml: string | undefined, rightHtml: string | undefined): void {
    if (this.layout === '1-up') {
      if (!leftHtml) {
        throw new Error('Missing page content for 1-up spread');
      }

      this.leftFrame.loadDocumentHtml(leftHtml);
      this.leftFrame.element.hidden = false;
      this.rightFrame.element.hidden = true;
      this.rightFrame.element.removeAttribute('src');
      this.rightFrame.element.removeAttribute('srcdoc');

      return;
    }

    if (leftHtml) {
      this.leftFrame.element.hidden = false;
      this.leftFrame.loadDocumentHtml(leftHtml);
    } else {
      this.leftFrame.element.hidden = true;
      this.leftFrame.element.removeAttribute('src');
      this.leftFrame.element.removeAttribute('srcdoc');
    }

    if (rightHtml) {
      this.rightFrame.element.hidden = false;
      this.rightFrame.loadDocumentHtml(rightHtml);
    } else {
      this.rightFrame.element.hidden = true;
      this.rightFrame.element.removeAttribute('src');
      this.rightFrame.element.removeAttribute('srcdoc');
    }
  }

  destroy(): void {
    this.leftFrame.destroy();
    this.rightFrame.destroy();
    this.element.remove();
  }
}
