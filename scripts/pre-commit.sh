#!/usr/bin/env sh
set -e

echo "→ ESLint"
yarn lint

echo "→ TypeScript"
yarn typecheck

echo "→ Unit tests"
yarn test

echo "→ Integration / e2e tests"
yarn test:integration

echo "✓ Pre-commit checks passed"
