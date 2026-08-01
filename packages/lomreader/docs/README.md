# lomreader documentation

Contributor documentation for the `lomreader` npm package. This library implements parts of [EPUB 3.3](https://www.w3.org/TR/epub-33/) — the W3C Recommendation for digital publications.

## Start here

| Document | Description |
|----------|-------------|
| [Architecture](./architecture.md) | End-to-end loading pipeline from URL → publication |
| [EPUB module](./epub/README.md) | All files under `src/epub/` and how they map to the spec |
| [Reader API](./reader.md) | Public `createReader()` / `open()` surface |
| [Types](./types.md) | TypeScript models for planes and resources |
| [Testing guide](./testing.md) | Unit, contract, and e2e testing strategy |

## EPUB 3.3 specification map

lomreader is organized around the EPUB 3.3 processing model:

| Spec topic | W3C section | lomreader code |
|------------|-------------|----------------|
| Publication resources (overview) | [§3.1 Introduction](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) | [planes.ts](../src/epub/planes.ts) |
| Manifest plane | [§3.1.1](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) | [parse-package.ts](../src/epub/parse-package.ts) |
| Spine plane | [§3.1.2](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) | [parse-package.ts](../src/epub/parse-package.ts) |
| Content plane | [§3.1.3](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) | [planes.ts](../src/epub/planes.ts), [content-discovery.ts](../src/epub/content-discovery.ts) |
| Core media types | [§3.2](https://www.w3.org/TR/epub-33/#sec-core-media-types) | [constants.ts](../src/epub/constants.ts) |
| Resource locations | [§3.6](https://www.w3.org/TR/epub-33/#sec-resource-locations) | [paths.ts](../src/epub/paths.ts) |
| Open Container Format (OCF) | [§4](https://www.w3.org/TR/epub-33/#sec-ocf) | [archive.ts](../src/epub/archive.ts) |
| `container.xml` | [§4.2.6.3.1](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) | [parse-container.ts](../src/epub/parse-container.ts) |
| Package document | [§5](https://www.w3.org/TR/epub-33/#sec-package-doc) | [parse-package.ts](../src/epub/parse-package.ts) |
| Manifest element | [§5.6](https://www.w3.org/TR/epub-33/#sec-manifest-elem) | [parse-package.ts](../src/epub/parse-package.ts) |
| Spine element | [§5.7](https://www.w3.org/TR/epub-33/#sec-spine-elem) | [parse-package.ts](../src/epub/parse-package.ts) |
| Metadata `link` (linked resources) | [§5.5.6](https://www.w3.org/TR/epub-33/#sec-link-elem) | [parse-package.ts](../src/epub/parse-package.ts) |

## Source layout

```
src/
├── index.ts           # Public exports
├── reader.ts          # LomReader class
├── types.ts           # Shared TypeScript interfaces
└── epub/              # EPUB 3.3 parsing (see epub/README.md)
    ├── archive.ts
    ├── constants.ts
    ├── content-discovery.ts
    ├── parse-container.ts
    ├── parse-package.ts
    ├── paths.ts
    ├── planes.ts
    └── xml.ts
```

## Contributing

When you add or change parsing behaviour:

1. Read the relevant spec section linked above.
2. Add or update unit tests in `src/**/*.test.ts` or `test/**/*.test.ts`.
3. Update [hypatia contract tests](../test/hypatia.contract.test.ts) only when the change is intentional.
4. Extend the integration harness and Playwright specs in `apps/integration/`.
5. Document the change in the matching file under `docs/epub/`.

See [testing.md](./testing.md) for the full test pyramid.
