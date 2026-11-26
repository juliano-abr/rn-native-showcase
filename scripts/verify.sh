#!/usr/bin/env bash
# Everything CI runs that needs no Android SDK. `pnpm test:android` covers the Kotlin unit tests.
set -euo pipefail
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
