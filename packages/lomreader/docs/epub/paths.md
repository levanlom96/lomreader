# `paths.ts` — Container path resolution

**Source:** [`src/epub/paths.ts`](../../src/epub/paths.ts)

## Purpose

Implements path operations for resources inside the [OCF abstract container](https://www.w3.org/TR/epub-33/#sec-ocf), including relative href resolution as required by EPUB package documents and content documents.

## Spec references

- [§3.6 Resource locations](https://www.w3.org/TR/epub-33/#sec-resource-locations) — how hrefs resolve between manifest, spine, and content
- [§4.2.3 File paths and file names](https://www.w3.org/TR/epub-33/#sec-ocf-file-names) — forward slashes, case sensitivity
- [§4.2.4 Deriving file paths](https://www.w3.org/TR/epub-33/#sec-ocf-paths) — path combination rules
- [§5.3.2 The href attribute](https://www.w3.org/TR/epub-33/#attrdef-href) — manifest item hrefs relative to OPF

## Functions

| Function | Description |
|----------|-------------|
| `normalizeContainerPath(path)` | Strip leading slashes, convert `\` → `/` |
| `resolveRelativePath(basePath, href)` | RFC-style `.` / `..` resolution relative to a base file |
| `directoryOf(path)` | Parent directory of a container path |
| `isRemoteHref(href)` | Detect `http:`, `https:`, etc. (not container-local) |
| `decodePath(path)` | Safe `decodeURIComponent` for percent-encoded paths |

## Usage in the pipeline

1. **`parse-package.ts`** — resolves each manifest `item@href` relative to the OPF file path to produce `ManifestItem.path`.
2. **`content-discovery.ts`** — resolves references found in XHTML/CSS relative to the source document.
3. **`reader.ts`** — exposes `publication.resolveHref()` using the same logic.

## Example

Package document at `epub/content.opf`, manifest item `href="text/chapter-1.xhtml"`:

```
resolveRelativePath('epub/content.opf', 'text/chapter-1.xhtml')
→ 'epub/text/chapter-1.xhtml'
```

## Related tests

- [`src/epub/paths.test.ts`](../../src/epub/paths.test.ts) — normalization, `..` segments, remote hrefs
