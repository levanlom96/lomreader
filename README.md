# lomreader

An open-source EPUB reader built on the EPUB 3.0 architecture. It is designed to be easy to install, customize, and integrate into any JavaScript environment. The reader supports modern accessibility features and provides developers with a flexible foundation for building accessible and standards-compliant digital reading applications.

This repository is a Yarn workspaces monorepo written in **TypeScript**:

| Package | Workspace name | Path | Purpose |
|---------|----------------|------|---------|
| **lomreader** | `lomreader` | `packages/lomreader` | Core library (Vite library build → npm) |
| **Playground** | `@lomreader/playground` | `apps/playground` | Local dev UI (imports lomreader source directly) |
| **EPUB server** | `@lomreader/epub-server` | `apps/epub-server` | Node.js server that hosts EPUB files with open CORS |

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
yarn dev:library     # watch-build lomreader
```

Build and typecheck:

```bash
yarn build           # build lomreader → packages/lomreader/dist/
yarn build:playground
yarn typecheck       # typecheck all workspaces
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
├── tsconfig.base.json      # shared TypeScript config
├── .yarnrc.yml
├── package.json            # Yarn workspaces root
├── packages/
│   └── lomreader/          # Vite library build (TypeScript)
│       ├── src/
│       ├── vite.config.ts
│       └── tsconfig.json
└── apps/
    ├── playground/         # Vite dev app (TypeScript)
    └── epub-server/        # Express server (TypeScript + tsx)
```

## License

Apache-2.0 — see [LICENSE](LICENSE).
