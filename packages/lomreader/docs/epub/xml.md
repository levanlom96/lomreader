# `xml.ts` — XML parsing utilities

**Source:** [`src/epub/xml.ts`](../../src/epub/xml.ts)

## Purpose

Provides a thin, environment-portable XML parsing layer for EPUB's required XML documents (`container.xml`, OPF, XHTML).

## Spec references

- [§3.9 XML conformance](https://www.w3.org/TR/epub-33/#sec-xml-conformance) — EPUB XML documents must be well-formed
- [§4.2.6.3.1 container.xml](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml)
- [§5 Package document](https://www.w3.org/TR/epub-33/#sec-package-doc)

## Why `@xmldom/xmldom`?

EPUB parsing runs in both browser and Node.js (tests, SSR). Native `DOMParser` is browser-only; `@xmldom/xmldom` provides a consistent implementation everywhere.

The `XmlElementLike` / `XmlDocumentLike` interfaces abstract xmldom from consumers so parsers do not depend on DOM lib type conflicts between environments.

## Functions

| Function | Description |
|----------|-------------|
| `parseXml(text)` | Parse string → document; throws on parsererror |
| `childElements(node, localName)` | Direct child elements by local name (namespace-agnostic) |
| `firstChildElement(node, localName)` | First matching child |
| `getAttribute(element, name)` | Attribute or `undefined` |
| `splitProperties(value)` | Split EPUB `properties` attribute (space-separated tokens) |
| `textContent(element)` | Trimmed text content |

## Namespace handling

EPUB XML uses prefixed elements (`dc:identifier`, etc.). xmldom exposes `localName` without prefix, so parsers match on `identifier`, `item`, `itemref`, etc. This matches common EPUB authoring tool output.

## Related tests

- [`src/epub/xml.test.ts`](../../src/epub/xml.test.ts) — parse errors, child element selection, properties splitting
