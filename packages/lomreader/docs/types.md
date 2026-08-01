# Types

**Source:** [`src/types.ts`](../src/types.ts)

## Purpose

TypeScript interfaces mirroring EPUB 3.3 concepts. These types are exported from the package and form the **public API contract** — changes here are breaking unless versioned carefully.

## Spec mapping

| Type | EPUB concept | Spec |
|------|--------------|------|
| `ManifestItem` | Manifest `item` | [§5.6.2](https://www.w3.org/TR/epub-33/#sec-item-elem) |
| `LinkedResource` | Metadata `link` | [§5.5.6](https://www.w3.org/TR/epub-33/#sec-link-elem) |
| `ManifestPlane` | Manifest plane | [§3.1.1](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| `SpineItemRef` | Spine `itemref` + resolved item | [§5.7.2](https://www.w3.org/TR/epub-33/#sec-itemref-elem) |
| `SpinePlane` | Spine plane | [§3.1.2](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| `ContentResource` | Content plane entry | [§3.1.3](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| `ContentPlane` | Content plane | [§3.1.3](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| `PackageDocument` | Parsed OPF | [§5](https://www.w3.org/TR/epub-33/#sec-package-doc) |
| `Publication` | Loaded EPUB | Composite of all planes + I/O |
| `Reader` / `ReaderOptions` | Library entry | — |

## Stability

Contract tests in [`test/hypatia.contract.test.ts`](../test/hypatia.contract.test.ts) freeze expected plane shapes for the `hypatia.epub` fixture. If you change these interfaces, update all tests and document the migration.

## `ManifestItem.path`

The resolved absolute path within the EPUB container (e.g. `epub/text/chapter-1.xhtml`). This is **not** the raw `href` from the OPF — it accounts for OPF location via [`paths.resolveRelativePath`](./epub/paths.md).
