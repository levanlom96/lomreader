# lomreader

Core EPUB 3.3 reader library. Built with TypeScript and Vite, published to npm.

## Usage

```ts
import { createReader } from 'lomreader';

const reader = createReader();
const publication = await reader.open('https://example.com/book.epub');

console.log(publication.manifest.publicationResources.length);
console.log(publication.spine.itemrefs.length);
console.log(publication.content.resources.length);
```

## Documentation

Full contributor documentation lives in [`docs/`](./docs/README.md):

- [Architecture & loading pipeline](./docs/architecture.md)
- [EPUB module reference](./docs/epub/README.md) — every file under `src/epub/`
- [Testing guide](./docs/testing.md)

All docs link to the relevant [EPUB 3.3 W3C specification](https://www.w3.org/TR/epub-33/) sections.

## Development

```bash
yarn workspace lomreader dev          # watch build
yarn workspace lomreader build          # build to dist/
yarn workspace lomreader test           # unit + contract tests
yarn workspace lomreader test:coverage  # coverage report
yarn workspace lomreader typecheck
```

## Testing

| Layer | Location | Purpose |
|-------|----------|---------|
| Unit | `src/**/*.test.ts` | Per-module tests with synthetic EPUB fixtures |
| Contract | `test/hypatia.contract.test.ts` | Frozen output for real Standard Ebooks fixture |
| E2E | `apps/integration/e2e/` | Browser tests against live epub-server |

See [docs/testing.md](./docs/testing.md) for the full strategy.
