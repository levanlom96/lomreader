# Reader API

**Source:** [`src/reader.ts`](../src/reader.ts)

## Purpose

Public entry point for loading EPUB publications from URLs.

## Usage

```ts
import { createReader } from 'lomreader';

const reader = createReader();
const publication = await reader.open('https://example.com/book.epub');

console.log(publication.spine.itemrefs.length);
console.log(publication.content.resources.length);

const html = await publication.getText('epub/text/chapter-1.xhtml');
```

## `createReader(options?)`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fetch` | `typeof fetch` | `globalThis.fetch` | Custom fetch for Node polyfills or testing |

## `LomReader.open(url)`

Orchestrates the [architecture pipeline](./architecture.md):

1. Fetch bytes
2. `loadArchive`
3. `findPackageDocumentPath`
4. `parsePackageDocument`
5. `buildContentPlane`

Returns a `Publication` object.

## Custom fetch (testing)

```ts
const reader = createReader({
  fetch: async () => new Response(epubBytes, { status: 200 }),
});
```

Used extensively in unit tests to avoid network I/O.

## Related tests

- [`src/reader.test.ts`](../src/reader.test.ts) — open, getText, getBytes, resolveHref, fetch errors
