# `constants.ts` — EPUB well-known values

**Source:** [`src/epub/constants.ts`](../../src/epub/constants.ts)

## Purpose

Centralizes values defined by EPUB 3.3 that are referenced across multiple modules — media type sets, XML namespaces, and required container paths.

## Spec references

- [§3.2 Core media types](https://www.w3.org/TR/epub-33/#sec-core-media-types) — resources reading systems must support in content documents
- [§3.1.2 Spine plane / EPUB content documents](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) — XHTML and SVG as unrestricted spine resources
- [§4.2.6.3.1 Container file](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) — `META-INF/container.xml` location
- [§5 Package document](https://www.w3.org/TR/epub-33/#sec-package-doc) — OPF namespace

## Exports

| Constant | Spec basis | Used by |
|----------|------------|---------|
| `CORE_MEDIA_TYPES` | [§3.2](https://www.w3.org/TR/epub-33/#sec-core-media-types) | `content-discovery.ts`, `planes.ts` |
| `EPUB_CONTENT_DOCUMENT_MEDIA_TYPES` | [§3.1.2](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) | `content-discovery.ts`, `planes.ts` |
| `CONTAINER_PATH` | [§4.2.6.3.1](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) | `parse-container.ts` |
| `OCF_CONTAINER_NS` | OCF container XML namespace | Reserved for future namespace-aware parsing |
| `OPF_NS` | Package document namespace | Reserved for future namespace-aware parsing |
| `DC_NS` | Dublin Core namespace | Reserved for metadata expansion |

## Why not inline these?

Media type lists appear in both classification (`content-discovery.ts`) and document detection (`planes.ts`). A single source prevents drift from the spec as EPUB 3.3 errata update core types.

## Maintenance

When EPUB 3.3 errata add core media types, update `CORE_MEDIA_TYPES` and the corresponding unit tests in [`content-discovery.test.ts`](../../src/epub/content-discovery.test.ts).

## Related tests

- [`src/epub/content-discovery.test.ts`](../../src/epub/content-discovery.test.ts) — classification against core types
