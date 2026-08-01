import { describe, expect, it } from 'vitest';
import {
  childElements,
  firstChildElement,
  getAttribute,
  parseXml,
  splitProperties,
  textContent,
} from './xml';

describe('xml', () => {
  it('parses well-formed XML documents', () => {
    const doc = parseXml(`<?xml version="1.0"?><root><child id="a">text</child></root>`);

    expect(doc.documentElement?.localName).toBe('root');
    expect(childElements(doc.documentElement!, 'child')).toHaveLength(1);
  });

  it('throws on invalid XML', () => {
    expect(() => parseXml('<root><unclosed>')).toThrow(/Invalid XML/);
  });

  it('reads attributes and text content', () => {
    const doc = parseXml(`<item id="css" media-type="text/css" properties="scripted nav"/>`);
    const item = doc.documentElement!;

    expect(getAttribute(item, 'id')).toBe('css');
    expect(getAttribute(item, 'missing')).toBeUndefined();
    expect(splitProperties(getAttribute(item, 'properties'))).toEqual(['scripted', 'nav']);
    expect(textContent(item)).toBe('');
  });

  it('selects namespaced elements by local name', () => {
    const doc = parseXml(`
      <package xmlns:dc="http://purl.org/dc/elements/1.1/">
        <metadata>
          <dc:identifier id="pub-id">urn:uuid:test</dc:identifier>
        </metadata>
      </package>
    `);

    const metadata = firstChildElement(doc.documentElement!, 'metadata')!;
    const identifier = firstChildElement(metadata, 'identifier');

    expect(identifier).toBeDefined();
    expect(textContent(identifier!)).toBe('urn:uuid:test');
  });
});
