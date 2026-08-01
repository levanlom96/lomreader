import { DOMParser } from '@xmldom/xmldom';

export interface XmlNodeLike {
  nodeType: number;
  childNodes: ArrayLike<XmlNodeLike>;
  localName?: string;
}

export interface XmlElementLike extends XmlNodeLike {
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  textContent: string | null;
  getElementsByTagName(name: string): ArrayLike<XmlElementLike>;
}

export interface XmlDocumentLike {
  documentElement: XmlElementLike | null;
  getElementsByTagName(name: string): ArrayLike<XmlElementLike>;
}

export function parseXml(text: string): XmlDocumentLike {
  let doc;

  try {
    doc = new DOMParser().parseFromString(text, 'application/xml');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'parse error';
    throw new Error(`Invalid XML: ${message}`);
  }

  const parseError = doc.getElementsByTagName('parsererror')[0];

  if (parseError) {
    throw new Error(`Invalid XML: ${parseError.textContent ?? 'parse error'}`);
  }

  if (!doc.documentElement) {
    throw new Error('Invalid XML: missing document element');
  }

  return doc as unknown as XmlDocumentLike;
}

export function childElements(node: XmlNodeLike, localName: string): XmlElementLike[] {
  return Array.from(node.childNodes).filter(
    (child): child is XmlElementLike =>
      child.nodeType === 1 && child.localName === localName,
  );
}

export function firstChildElement(
  node: XmlNodeLike,
  localName: string,
): XmlElementLike | undefined {
  return childElements(node, localName)[0];
}

export function getAttribute(
  element: XmlElementLike,
  name: string,
): string | undefined {
  return element.getAttribute(name) ?? undefined;
}

export function splitProperties(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value.split(/\s+/).filter(Boolean);
}

export function textContent(element: XmlElementLike): string {
  return element.textContent?.trim() ?? '';
}
