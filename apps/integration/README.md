# @lomreader/integration

Integration and e2e test suite for lomreader. Uses a Vite harness app plus Playwright to verify real browser usage as features are added.

## Setup

Install Playwright browsers (once):

```bash
yarn workspace @lomreader/integration test:install-browsers
```

## Commands

```bash
yarn workspace @lomreader/integration dev       # open harness at http://localhost:5174
yarn workspace @lomreader/integration test      # run e2e tests
yarn workspace @lomreader/integration test:ui   # Playwright UI mode
```

E2e tests automatically start the integration harness and EPUB server.

## Test files

| File | Purpose |
|------|---------|
| `e2e/reader.spec.ts` | Harness UI and epub-server fixture checks |
| `e2e/api.spec.ts` | Direct `createReader().open()` in browser context |

## Adding tests

1. Extend `src/harness.ts` with UI for the feature under test (`data-testid` attributes).
2. Add scenarios in `e2e/*.spec.ts` that exercise actual reader behaviour.
3. Keep frozen counts in sync with `packages/lomreader/test/hypatia.contract.test.ts`.

See [testing guide](../../packages/lomreader/docs/testing.md).
