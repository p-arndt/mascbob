# mascbob — task runner. Shared recipes live in .just/ (from p-arndt/just-common):
# edit them there and run `just sync-common`. This file holds only mascbob's own.

import '.just/common.just'
import '.just/release.just'
import '.just/docker.just'

set allow-duplicate-variables

IMAGE := "mascbob"
REGISTRY := "reg.allthing.eu"

# List recipes
default:
    @just --list

# Start the showcase dev server
dev:
    pnpm dev

# Type-check with svelte-check
check:
    pnpm check

# Prettier + eslint
lint:
    pnpm lint

# Format all files
fmt:
    pnpm format

# Unit and component tests
test:
    pnpm test

# Build the showcase and package the library into dist/
build:
    pnpm build

# Render the README images into .github/assets
readme-art:
    pnpm vitest run -c tests/readme-art/vitest.config.ts

# Everything CI runs
ci: check lint test build
