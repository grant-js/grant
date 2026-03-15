---
title: Versioning and Release
description: How versioning and publishing work for npm packages and Docker images
---

# Versioning and Release

This doc explains how we version and publish artifacts. **Only npm packages** use semver today; Docker images use demo tags. Keeping this clear avoids confusion.

## Version source (for contributors)

| Artifact         | Version source            |
| ---------------- | ------------------------- |
| npm packages     | Changesets                |
| Docker images    | Git SHA (`:demo-$sha`)    |
| Demo environment | `:demo` tag (latest main) |

Docker images do **not** follow semver today; they use `:demo` and `:demo-$sha`. Semver image tags may be added later when we trigger image publish from the release workflow.

## How Changesets work

1. **Add a changeset** when you change a publishable package (`@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli`):

   ```bash
   pnpm changeset
   ```

   Choose the bump type (patch/minor/major) per package and add a short summary. This creates a file under `.changeset/`.

2. **Open a PR** (or push to an existing PR). The [release workflow](.github/workflows/release.yml) runs on every push to `main`. If there are unversioned changesets, it creates or updates a PR titled **"chore: version packages"**. Nothing is published yet.

3. **Merge the "chore: version packages" PR.** The workflow then:
   - Runs `pnpm version` (updates `package.json` versions and changelogs)
   - Runs `pnpm release` (builds and publishes to npm)
   - When the "chore: version packages" PR is merged, the **`.changeset/*` files included in that PR are removed as part of the version commit.** They do not accumulate forever.

4. **App images (api, web, docs, example)** are not in the changeset ignore list and are not versioned by Changesets. They are built and pushed on every push to `main` with tags `:demo` and `:demo-$sha`. See [Docker Deployment](/deployment/docker#pipelines-and-cicd) for the image and demo deploy pipeline.

## When to add a changeset

- You changed code in `packages/@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, or `@grantjs/cli` in a way that affects the public API or behavior.
- You did **not** need a changeset for: docs-only changes, app-only changes (apps/api, apps/web), or internal packages (e.g. `@grantjs/database`, `@grantjs/core`), which are in the [changeset ignore list](.changeset/config.json).

## Optional: platform version later

We may introduce a single "platform" version (e.g. root `package.json` or a `VERSION` file) updated when the version PR is merged, and use it later for Docker image tags like `:1.2.3`. For now, image tags are `:demo` and `:demo-$sha` only.
