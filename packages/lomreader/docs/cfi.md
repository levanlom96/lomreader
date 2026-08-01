# EPUB CFI (Canonical Fragment Identifiers)

Implementation of [EPUB CFI 1.1](https://w3c.github.io/epub-specs/epub33/epubcfi/) for addressing positions and ranges inside EPUB publications.

## API

```ts
import {
  createReader,
  createReaderHost,
  parseCfi,
  resolveCfi,
  generateCfi,
} from 'lomreader';

const publication = await createReader().open(url);

// Parse a fragment identifier
const parsed = parseCfi('epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)');

// Resolve to spine index + DOM point (uses archive bytes in Node; live iframe DOM in browser)
const location = await resolveCfi(publication, parsed);

// Generate CFI from a DOM range (same document tree as the content document)
const cfi = await generateCfi(publication, spineIndex, {
  start: { node: textNode, offset: 10 },
});

// ReaderHost helpers (browser)
const host = await createReaderHost(publication, { container });
await host.goToCfi(cfi);                 // navigate + select
const selectionCfi = await host.getSelectionCfi();
```

## Supported CFI features (v1)

| Feature | Status |
|---------|--------|
| Standard EPUB CFIs (`epubcfi(...)`) | Yes |
| Package spine indirection (`!`) | Yes |
| Element steps (`/even`) and text steps (`/odd`) | Yes |
| Character offsets (`:N`, UTF-16) | Yes |
| ID assertions (`[id]`) | Yes |
| Text location assertions after offsets | Parse + verify |
| Simple ranges (`parent,start,end`) | Yes |
| Temporal / spatial offsets (`~`, `@`) | Parse only |
| Intended target correction heuristics | Future |

## Modules

| File | Role |
|------|------|
| [`src/cfi/parse.ts`](../src/cfi/parse.ts) | Parse / format CFI strings |
| [`src/cfi/dom.ts`](../src/cfi/dom.ts) | DOM step indexing and resolution |
| [`src/cfi/resolve.ts`](../src/cfi/resolve.ts) | Resolve CFIs against `Publication` |
| [`src/cfi/generate.ts`](../src/cfi/generate.ts) | Build CFIs from DOM points / ranges |
| [`src/cfi/package.ts`](../src/cfi/package.ts) | Package-document spine prefix helpers |

## Spec example

Using the [spec example documents](https://w3c.github.io/epub-specs/epub33/epubcfi/#example-10):

```
epubcfi(/6/4[chap01ref]!/4[body01]/10[para05]/3:10)
```

Points to the position immediately after the digit `9` in paragraph `para05`.

Range example (second `y` through digit `3`):

```
epubcfi(/6/4[chap01ref]!/4[body01]/10[para05],/2/1:1,/3:4)
```

See [`test/fixtures/cfi-example.ts`](../test/fixtures/cfi-example.ts) and [`src/cfi/cfi.integration.test.ts`](../src/cfi/cfi.integration.test.ts).

## Related

- [Rendering](./rendering.md) — iframe display pipeline
- [futureplans.md](../futureplans.md) — annotation storage keyed by CFI
