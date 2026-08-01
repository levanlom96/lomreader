# Contributing to lomreader

Thank you for contributing! This project implements [EPUB 3.3](https://www.w3.org/TR/epub-33/) — please read the spec section relevant to your change before coding.

## Documentation

Start with the package docs in [`packages/lomreader/docs/`](packages/lomreader/docs/README.md):

1. [Architecture](packages/lomreader/docs/architecture.md) — how loading works end-to-end
2. [EPUB module index](packages/lomreader/docs/epub/README.md) — what each file under `src/epub/` does and why
3. [Testing guide](packages/lomreader/docs/testing.md) — unit, contract, and e2e requirements

When you add or significantly change a module, update its matching doc in `docs/epub/`.

## Development setup

```bash
corepack enable
yarn install
yarn workspace @lomreader/integration test:install-browsers
```

## Before opening a PR

Run the full check suite:

```bash
yarn typecheck
yarn test:all
yarn build
```

Optional coverage report:

```bash
yarn workspace lomreader test:coverage
```

## Adding a feature

1. Read the [EPUB 3.3 spec section](https://www.w3.org/TR/epub-33/) for your feature.
2. Implement in the appropriate `src/epub/` module (or add a new one with docs).
3. Add **unit tests** with synthetic fixtures from [`test/fixtures/build-epub.ts`](packages/lomreader/test/fixtures/build-epub.ts).
4. If behaviour affects the `hypatia.epub` fixture, update [`test/hypatia.contract.test.ts`](packages/lomreader/test/hypatia.contract.test.ts) **intentionally** and explain why in the PR.
5. Extend [`apps/integration/src/harness.ts`](apps/integration/src/harness.ts) with observable `data-testid` attributes.
6. Add **Playwright e2e tests** in `apps/integration/e2e/`.

## Backwards compatibility

- **Contract tests** freeze parser output for `hypatia.epub`. Do not update them to make failing tests pass — fix the regression instead.
- **Public types** in `src/types.ts` are part of the npm API. Breaking changes require a major version bump.

## Commit style

Use clear, imperative commit messages focused on *why*:

```
Fix spine fallback chain resolution for foreign content documents
```

## Questions

Open an issue or PR draft if you're unsure which spec section or module owns your change.
