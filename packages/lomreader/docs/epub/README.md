# `src/epub/` module

The `epub/` directory contains all EPUB 3.3 parsing logic. Each file maps to one or more sections of the [EPUB 3.3 specification](https://www.w3.org/TR/epub-33/).

## Module index

| File | Documentation | Spec |
|------|---------------|------|
| [`archive.ts`](./archive.md) | OCF ZIP inflation and resource I/O | [§4 OCF](https://www.w3.org/TR/epub-33/#sec-ocf) |
| [`constants.ts`](./constants.md) | Media types, namespaces, well-known paths | [§3.2](https://www.w3.org/TR/epub-33/#sec-core-media-types), [§3.1.2](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| [`paths.ts`](./paths.md) | Path normalization and href resolution | [§3.6](https://www.w3.org/TR/epub-33/#sec-resource-locations), [§4.2.3](https://www.w3.org/TR/epub-33/#sec-ocf-file-names) |
| [`xml.ts`](./xml.md) | XML parsing helpers | [§3.9](https://www.w3.org/TR/epub-33/#sec-xml-conformance) |
| [`parse-container.ts`](./parse-container.md) | `META-INF/container.xml` | [§4.2.6.3.1](https://www.w3.org/TR/epub-33/#sec-container-metainf-container.xml) |
| [`parse-package.ts`](./parse-package.md) | Package document (OPF) | [§5](https://www.w3.org/TR/epub-33/#sec-package-doc) |
| [`content-discovery.ts`](./content-discovery.md) | Reference extraction from XHTML/CSS | [§3.1.3](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |
| [`planes.ts`](./planes.md) | Manifest / spine / content plane assembly | [§3.1](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) |

## Dependency graph

```
paths.ts ─────────────────────────────────┐
constants.ts ──────────┐                  │
xml.ts ────────────────┼── parse-container.ts
                       │         │
archive.ts ────────────┼─────────┴── parse-package.ts ── planes.ts
                       │                      │
                       └── content-discovery.ts ┘
```

Lower-level modules (`paths`, `xml`, `constants`, `archive`) have no imports from higher-level parsers.

## Adding a new module

1. Identify the EPUB 3.3 section your feature implements.
2. Create `src/epub/your-module.ts` and `docs/epub/your-module.md`.
3. Add a row to the table above.
4. Add unit tests before or alongside implementation.
5. If behaviour affects real EPUB fixtures, update contract tests.
