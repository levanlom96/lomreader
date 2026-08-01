# `archive.ts` — OCF ZIP container access

**Source:** [`src/epub/archive.ts`](../../src/epub/archive.ts)

## Purpose

Implements read access to the [Open Container Format (OCF)](https://www.w3.org/TR/epub-33/#sec-ocf) abstract container. An EPUB file is a ZIP archive; this module inflates it into an in-memory map of paths → bytes.

## Spec references

- [§4.1 OCF introduction](https://www.w3.org/TR/epub-33/#sec-ocf) — EPUB as a single-file container
- [§4.3 OCF ZIP container](https://www.w3.org/TR/epub-33/#sec-ocf-zip) — ZIP format requirements
- [§4.2.3 File paths and file names](https://www.w3.org/TR/epub-33/#sec-ocf-file-names) — path normalization (forward slashes)

## Why a separate module?

OCF handling is the foundation of all EPUB processing. Keeping ZIP inflation isolated means:

- Parsers (`parse-container`, `parse-package`) only deal with logical paths, not binary formats.
- Tests can build synthetic ZIP fixtures without going through `fetch`.
- A future streaming or partial-unzip optimization would live here only.

## API

| Export | Description |
|--------|-------------|
| `EpubArchive` | `ReadonlyMap<string, Uint8Array>` of container paths → content |
| `loadArchive(data)` | Async unzip via [fflate](https://github.com/101arrowz/fflate) |
| `readArchiveText(archive, path)` | Decode UTF-8 text for a container path |
| `readArchiveBytes(archive, path)` | Return raw bytes |
| `listArchivePaths(archive)` | Sorted list of all paths (useful for debugging/tests) |

## Path normalization

All paths are normalized through `normalizeContainerPath()` from [`paths.ts`](./paths.md) so lookups are consistent regardless of ZIP entry formatting (`\` vs `/`, leading slashes).

## Related tests

- [`src/epub/archive.test.ts`](../../src/epub/archive.test.ts) — round-trip read, missing paths, normalization
