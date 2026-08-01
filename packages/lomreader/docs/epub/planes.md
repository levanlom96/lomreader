# `planes.ts` — Resource plane assembly

**Source:** [`src/epub/planes.ts`](../../src/epub/planes.ts)

## Purpose

Assembles the three [publication resource planes](https://www.w3.org/TR/epub-33/#sec-pub-res-intro) defined by EPUB 3.3. Manifest and spine planes are produced in [`parse-package.ts`](./parse-package.md); this module builds the **content plane**.

## Spec references

- [§3.1 Publication resources introduction](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)
- [§3.1.1 Manifest plane](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)
- [§3.1.2 Spine plane](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)
- [§3.1.3 Content plane](https://www.w3.org/TR/epub-33/#sec-pub-res-intro)
- [Appendix H.1 Resources example](https://www.w3.org/TR/epub-33/#app-resources) — illustrative plane membership

## Content plane algorithm

```
1. Collect EPUB content documents:
   - All spine itemrefs (and their manifest fallback chains)
   - Nav documents (manifest items with properties="nav")

2. For each content document:
   - discoverReferences() → list of hrefs
   - Resolve each href to a manifest item path
   - Record ContentResource { item, usedBy, classification }
   - Recursively walk CSS and nested content documents
```

## `ContentResource` shape

| Field | Description |
|-------|-------------|
| `item` | Manifest item for the resource |
| `usedBy` | Container paths of content documents that reference it |
| `classification` | core-media-type / foreign / exempt / unknown |

## Summary helpers

`buildManifestPlaneSummary()` and `buildSpinePlaneSummary()` provide counts for UI and tests without reaching into internal structure.

## Related tests

- [`src/epub/planes.test.ts`](../../src/epub/planes.test.ts) — minimal EPUB content walk, nav document inclusion
- [`test/hypatia.contract.test.ts`](../../test/hypatia.contract.test.ts) — real EPUB content plane counts
