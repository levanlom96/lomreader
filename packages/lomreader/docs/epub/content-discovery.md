# `content-discovery.ts` — Reference extraction

**Source:** [`src/epub/content-discovery.ts`](../../src/epub/content-discovery.ts)

## Purpose

Discovers resources referenced from EPUB and foreign content documents to populate the [content plane](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) ([§3.1.3](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)).

## Spec references

- [§3.1.3 The content plane](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)
- [§3.2 Core media types](https://www.w3.org/TR/epub-33/#sec-core-media-types)
- [§3.3 Foreign resources](https://www.w3.org/TR/epub-33/#sec-foreign-resources)
- [§3.4 Exempt resources](https://www.w3.org/TR/epub-33/#sec-exempt-resources)

## What gets discovered

From **XHTML / SVG** documents:

- `<link href>`, `<script src>`, `<img src>`, `<video src>`, `<audio src>`
- `<source src>`, `<iframe src>`, `<embed src>`, `<object data>`
- SVG `<image href>`, `<use href>`
- General `href` attributes (excluding fragment-only `#` links)

From **CSS** stylesheets:

- `url(...)` references
- `@import` rules

Remote URLs and `data:` URIs are excluded from container path resolution.

## Classification

Each discovered resource is classified per EPUB 3.3:

| Classification | Meaning | Spec |
|----------------|---------|------|
| `core-media-type` | Reading systems must support | [§3.2](https://www.w3.org/TR/epub-33/#sec-core-media-types) |
| `foreign` | No guaranteed support; may need fallbacks | [§3.3](https://www.w3.org/TR/epub-33/#sec-foreign-resources) |
| `exempt` | No guarantee, but no fallback required | [§3.4](https://www.w3.org/TR/epub-33/#sec-exempt-resources) |
| `unknown` | Unclassified media type | — |

Uses [`CORE_MEDIA_TYPES`](./constants.md) from `constants.ts`.

## Limitations (current)

Reference extraction uses regex over serialized markup rather than a full HTML/CSS parser. This is sufficient for well-formed Standard Ebooks output but may miss edge cases (e.g. dynamically constructed URLs in scripts). Future work may add proper parsers.

## Related tests

- [`src/epub/content-discovery.test.ts`](../../src/epub/content-discovery.test.ts) — XHTML refs, CSS urls, classification, remote href filtering
