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

## Adding tests

1. Extend `src/harness.ts` with UI for the feature under test.
2. Add scenarios in `e2e/*.spec.ts` that exercise actual reader behavior.
