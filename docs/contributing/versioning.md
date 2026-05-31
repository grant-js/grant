---
title: Versioning and Release
description: How versioning and publishing work for npm packages and Docker images
---

# Versioning and Release

This doc explains how we version and publish artifacts. **Platform version** (root `package.json`, apps, npm packages, and semver image tags) is managed together via Changesets.

## Version source (for contributors)

| Artifact                                           | Version source                              | Published tags / registry                         |
| -------------------------------------------------- | ------------------------------------------- | ------------------------------------------------- |
| Platform (`grant`)                                 | Changesets **fixed** group                  | Root `package.json` version                       |
| Apps (`grant-api`, `grant-web`, `grant-docs`)      | Same fixed group                            | Not published to npm (private)                    |
| npm (`@grantjs/schema`, `client`, `server`, `cli`) | Same fixed group                            | registry.npmjs.org                                |
| Docker images                                      | `apps/api/package.json` after version PR    | `:demo`, `:sha-<commit>`, `:<version>`, `:latest` |
| `example-nextjs` image                             | Same as platform apps (image tags, not npm) | Same GHCR tags as other images                    |
| Demo environment                                   | `:demo` on main                             | Latest main commit                                |
| Web header / `GET /api/config` `appVersion`        | `apps/api/package.json` at API startup      | No env vars; matches running API image semver     |
| OpenAPI `info.version`                             | Same as `config.app.version`                | —                                                 |

Do **not** set `APP_VERSION` or `NEXT_PUBLIC_APP_VERSION` — they were removed. The API reads semver from [`apps/api/package.json`](../../apps/api/package.json) via `readPlatformVersion()` so the UI and OpenAPI stay aligned with the Docker tag CI publishes.

## Fixed versioning group

All of these bump together when you add a changeset for `grant` (or any member of the fixed group):

- `grant`, `grant-api`, `grant-web`, `grant-docs`
- `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli`

Internal packages (`@grantjs/core`, `@grantjs/database`, etc.) and examples remain in the [changeset ignore list](.changeset/config.json).

## How Changesets work

1. **Add a changeset** when you change platform or publishable package behavior:

   ```bash
   pnpm changeset
   ```

   Choose bump type (patch/minor/major) for `grant` (or any fixed-group member). This creates a file under `.changeset/`.

2. **Open a PR** (or push to an existing PR). The [release workflow](.github/workflows/release.yml) runs on every push to `main`. If there are unversioned changesets, it creates or updates a PR titled **"chore: version packages"**. Nothing is published yet.

3. **Merge the "chore: version packages" PR.** The workflow then:
   - Runs `pnpm version` (updates versions and changelogs)
   - Runs `pnpm release` (builds and publishes to npm)
   - Tags Docker images with `:<version>` and `:latest` (from current `:demo` digests)
   - `.changeset/*` files from that PR are removed in the version commit

4. **Every push to `main`** still builds and pushes app images with `:demo` and `:sha-<commit>` when relevant paths change.

## Docker image tags

| Tag                   | When                                                                                   | Use                   |
| --------------------- | -------------------------------------------------------------------------------------- | --------------------- |
| `:demo`               | Every qualifying push to `main`                                                        | Demo / rolling main   |
| `:sha-<full-sha>`     | Same build as `:demo`                                                                  | Traceability          |
| `:1.0.0`, `:1.1.0`, … | After version PR merge (or [release-baseline](.github/workflows/release-baseline.yml)) | Pin production / Helm |
| `:latest`             | Same as newest semver release                                                          | Local compose default |

### Baseline semver tags (one-time)

To tag existing `:demo` images as `1.0.0` without a version bump:

```bash
gh workflow run release-baseline.yml -f version=1.0.0 -f source_tag=demo
```

Then tag the repo and publish notes:

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

Pushing `v*` tags triggers [github-release.yml](.github/workflows/github-release.yml) (notes from `CHANGELOG.md`).

## When to add a changeset

- Platform or publishable package API/behavior changes (use the fixed group).
- **No changeset** for: docs-only (unless releasing platform), internal ignored packages, or example apps.

## GitHub Releases

- [CHANGELOG.md](https://github.com/grant-js/grant/blob/main/CHANGELOG.md) — platform-wide notes
- `docs/releases/vX.Y.Z.md` — optional detail for a release
- CI creates GitHub Releases on `v*` tag push
