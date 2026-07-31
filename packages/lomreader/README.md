# lomreader

Core EPUB 3.0 reader library. Built with TypeScript and Vite, published to npm for use in accessible, standards-compliant reading applications.

## Usage

```ts
import { createReader } from 'lomreader';

const reader = createReader();
```

## Development

```bash
yarn workspace lomreader dev     # watch mode
yarn workspace lomreader build   # build to dist/
yarn workspace lomreader typecheck
```
