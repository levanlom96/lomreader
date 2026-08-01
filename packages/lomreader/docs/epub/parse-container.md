# `parse-container.ts` — Container file parsing

**Source:** [`src/epub/parse-container.ts`](../../src/epub/parse-container.ts)

## Purpose

Reads [`META-INF/container.xml`](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) and returns the path to the primary package document (OPF file).

## Spec references

- [§4.2.6 META-INF directory](https://www.w3.org/TR/epub-33/#sec-container-metainf)
- [§4.2.6.3.1 Container file (`container.xml`)](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml)
- [§4.2.6.3.1.3 The `rootfile` element](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) — `full-path` attribute

## Processing steps

1. Read `META-INF/container.xml` from the archive ([`CONTAINER_PATH`](./constants.md)).
2. Parse XML via [`xml.ts`](./xml.md).
3. Find `container` → `rootfiles` → first `rootfile`.
4. Read `full-path` attribute and normalize the path.
5. Verify the package document exists in the archive.

## Multi-rootfile publications

EPUB allows multiple `rootfile` elements for alternate renderings ([§4.2.6.3.1.3](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml)). lomreader currently selects the **first** rootfile. Future versions may expose all rootfiles for selection.

## Errors

Explicit errors are thrown for missing or malformed container files — this aids debugging invalid EPUBs during development.

## Related tests

- [`src/epub/parse-container.test.ts`](../../src/epub/parse-container.test.ts) — valid container, missing file, malformed XML
- [`test/fixtures/build-epub.ts`](../../test/fixtures/build-epub.ts) — synthetic container fixtures
