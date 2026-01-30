# Release Guide for @grantjs/cli

This package uses [Changesets](https://github.com/changesets/changesets) for version management and publishing (same as the rest of the monorepo).

## Overview

- **Version bumps** and **changelogs** are driven by changesets.
- **Publishing** is done from the repository root (e.g. `pnpm release`).
- Before publish, `prepublishOnly` runs `pnpm run build && pnpm test:run` in this package.

## Quick Start

### 1. Create a changeset

When you make changes that should trigger a release:

```bash
# From the repository root
pnpm changeset
```

Select `@grantjs/cli`, choose the change type (major/minor/patch), and enter a summary. Commit the new file under `.changeset/`.

### 2. Version and publish

From the repository root:

```bash
pnpm version   # Bump versions and update changelogs
pnpm install   # Update lockfile
# Commit version changes, then:
pnpm release   # Build and publish to npm
```

## Scripts

| Script           | Description                             |
| ---------------- | --------------------------------------- |
| `pnpm test`      | Run tests in watch mode                 |
| `pnpm test:run`  | Run tests once (used by prepublishOnly) |
| `pnpm build`     | Build dist (Vite)                       |
| `prepublishOnly` | Runs `build` then `test:run`            |

## Manual publish (without changesets)

```bash
pnpm --filter @grantjs/cli run build
pnpm --filter @grantjs/cli test:run
pnpm --filter @grantjs/cli publish --access public
```

## CI/CD

When the pipeline is set up, use the same pattern as `@grantjs/client`:

- **Secrets:** `NPM_TOKEN` for npm publish.
- **Version PR:** Create/update a “Version Packages” PR when changesets are merged.
- **Publish:** On merge of the version bump PR, run the release workflow.

See the repo root `.github/workflows/` and [@grantjs/client RELEASE](../client/RELEASE.md) for the full Changesets/CI flow.
