# lomreader

An open-source EPUB reader built on the EPUB 3.0 architecture. It is designed to be easy to install, customize, and integrate into any JavaScript environment. The reader supports modern accessibility features and provides developers with a flexible foundation for building accessible and standards-compliant digital reading applications.

This repository is a Yarn workspaces monorepo with three parts:

| Package | Workspace name | Path | Purpose |
|---------|----------------|------|---------|
| **lomreader** | `lomreader` | `packages/lomreader` | Core library published to npm |
| **Playground** | `@lomreader/playground` | `apps/playground` | Local dev UI that imports lomreader directly (no separate package build) |
| **EPUB server** | `@lomreader/epub-server` | `apps/epub-server` | Simple Node.js server that hosts EPUB files with open CORS |

## Getting started

```bash
corepack enable
yarn install
```

Run the EPUB server and playground together:

```bash
yarn dev
```

Or run them separately:

```bash
yarn dev:server      # http://localhost:3001/epubs/
yarn dev:playground  # http://localhost:5173
```

Run a command in a specific workspace:

```bash
yarn workspace lomreader build
yarn workspace @lomreader/playground dev
yarn workspace @lomreader/epub-server start
```

Drop `.epub` files into `apps/epub-server/public/epubs/` to serve them during development.

## Project structure

```
lomreader/
├── .yarnrc.yml
├── package.json            # Yarn workspaces root
├── packages/
│   └── lomreader/          # npm package source
└── apps/
    ├── playground/         # Lomreader Playground (Vite dev app)
    └── epub-server/        # Static EPUB host with CORS
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
