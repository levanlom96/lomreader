# `parse-package.ts` — Package document (OPF) parsing

**Source:** [`src/epub/parse-package.ts`](../../src/epub/parse-package.ts)

## Purpose

Parses the [package document](https://www.w3.org/TR/epub-33/#sec-package-doc) (`.opf` file) to build the **manifest plane** and **spine plane**.

## Spec references

- [§5 Package document](https://www.w3.org/TR/epub-33/#sec-package-doc)
- [§5.5 Metadata section](https://www.w3.org/TR/epub-33/#sec-metadata-elem)
- [§5.5.6 The `link` element](https://www.w3.org/TR/epub-33/#sec-link-elem) — linked resources on the manifest plane
- [§5.6 Manifest section](https://www.w3.org/TR/epub-33/#sec-manifest-elem)
- [§5.6.2 The `item` element](https://www.w3.org/TR/epub-33/#sec-item-elem)
- [§5.7 Spine section](https://www.w3.org/TR/epub-33/#sec-spine-elem)
- [§5.7.2 The `itemref` element](https://www.w3.org/TR/epub-33/#sec-itemref-elem)
- [§3.5.1 Manifest fallbacks](https://www.w3.org/TR/epub-33/#sec-manifest-fallbacks)

## Manifest plane ([§3.1.1](https://www.w3.org/TR/epub-33/#sec-pub-res-intro))

Built from two sources:

| Source | OPF element | Result |
|--------|-------------|--------|
| Publication resources | `<manifest><item …/></manifest>` | `ManifestPlane.publicationResources` |
| Linked resources | `<metadata><link …/></metadata>` (no `refines`) | `ManifestPlane.linkedResources` |

Each manifest `item` becomes a `ManifestItem` with:

- `id`, `href`, `mediaType`, `properties`, optional `fallback`
- `path` — absolute container path via [`paths.resolveRelativePath`](./paths.md)

Lookup maps `byId` and `byPath` are pre-built for spine and content resolution.

## Spine plane ([§3.1.2](https://www.w3.org/TR/epub-33/#sec-pub-res-intro))

Each `<spine><itemref idref="…"/></spine>` resolves to a manifest item. Also captured:

- `linear` — `false` when `linear="no"` ([§5.7.2](https://www.w3.org/TR/epub-33/#sec-itemref-elem))
- `fallbackChain` — manifest fallback chain via `item@fallback` ([§3.5.1](https://www.w3.org/TR/epub-33/#sec-manifest-fallbacks))

## Metadata

Extracts `package@version` and the [unique identifier](https://www.w3.org/TR/epub-33/#sec-opf-package-attr) from `dc:identifier`.

## Related tests

- [`src/epub/parse-package.test.ts`](../../src/epub/parse-package.test.ts) — manifest, spine, linked resources, fallbacks
- [`test/hypatia.contract.test.ts`](../../test/hypatia.contract.test.ts) — frozen counts for real-world EPUB
