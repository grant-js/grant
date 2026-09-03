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

All of these bump together when you add a changeset for any member of the fixed group (for example `@grantjs/schema` or `grant-api`):

- `grant-api`, `grant-web`, `grant-docs`
- `@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, `@grantjs/cli`

The root `grant` package is private and not in the pnpm workspace, so changesets cannot target it by name.

Internal packages (`@grantjs/core`, `@grantjs/database`, etc.) and examples remain in the [changeset ignore list](.changeset/config.json). **Do not add a changeset for an ignored package** — Changesets will not version it, and the leftover file makes the release job try to open an empty version PR instead of publishing.

## How Changesets work

1. **Add a changeset** when you change platform or publishable package behavior:

   ```bash
   pnpm changeset
   ```

   Choose bump type (patch/minor/major) for any fixed-group member (not the root `grant` package). This creates a file under `.changeset/`.

2. **Open a PR** (or push to an existing PR). The [release workflow](.github/workflows/release.yml) runs on every push to `main`. If there are unversioned changesets, it creates or updates a PR titled **"chore: version packages"** by running `pnpm version` (`changeset version` plus [scripts/update-root-changelog.mjs](https://github.com/grant-js/grant/blob/main/scripts/update-root-changelog.mjs)). That updates package versions, package changelogs, root [CHANGELOG.md](https://github.com/grant-js/grant/blob/main/CHANGELOG.md), and the root `package.json` version. Nothing is published yet.

3. **Merge the "chore: version packages" PR.** The workflow then:
   - Runs `pnpm release` (builds and publishes to npm)
   - Tags Docker images with `:<version>` and `:latest`
   - Creates git tag `v*` and a **platform** GitHub Release (notes from changeset summaries / root changelog)
   - `.changeset/*` files from that PR are removed in the version commit

4. **Every push to `main`** still builds and pushes app images with `:demo` and `:sha-<commit>` when relevant paths change.

## npm trusted publishing

`@grantjs/schema`, `@grantjs/client`, `@grantjs/server`, and `@grantjs/cli` publish from GitHub Actions via [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC). There is no `NPM_TOKEN` on the release job.

| Requirement                                                      | Why                                                                                          |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Trusted publisher workflow filename is `release.yml`             | npm matches the **calling** workflow file; renaming it breaks publish                        |
| `release` job runs on `ubuntu-latest`                            | npm does not accept OIDC from self-hosted runners                                            |
| Job has `id-token: write` and no `NPM_TOKEN` / `NODE_AUTH_TOKEN` | A classic token (including an expired one) skips the OIDC exchange                           |
| npm CLI ≥ 11.5.1                                                 | That is when the token exchange landed; `pnpm publish` packs and shells out to `npm publish` |

Each package is configured on npmjs.com → Settings → Trusted publishing: repository `grant-js/grant`, workflow `release.yml`. After a green publish, revoke any leftover automation token.

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

Pushing a `v*` tag manually also triggers [github-release.yml](.github/workflows/github-release.yml) when a release for that tag does not already exist.

## When to add a changeset

- Platform or publishable package API/behavior changes (use the fixed group).
- **No changeset** for: docs-only (unless releasing platform), internal ignored packages, or example apps.
- The changeset **summary** is the release note. Write it for humans; it appears in package changelogs and the platform GitHub Release.

## GitHub Releases

- **Platform release** (`vX.Y.Z`) — created by [release.yml](.github/workflows/release.yml) after npm publish. Notes come from [`scripts/extract-release-notes.sh`](https://github.com/grant-js/grant/blob/main/scripts/extract-release-notes.sh): root [CHANGELOG.md](https://github.com/grant-js/grant/blob/main/CHANGELOG.md) when present, otherwise aggregated changeset entries from the fixed-group package changelogs.
- **Not created:** per-package GitHub Releases (`@grantjs/client@…`, etc.). Those tags may still exist for npm; the public release page is the platform `v*` release only.
- [CHANGELOG.md](https://github.com/grant-js/grant/blob/main/CHANGELOG.md) — platform-wide notes (kept in sync by `pnpm version` via `scripts/update-root-changelog.mjs`; preferred source for GitHub Release notes when present)
- `docs/releases/vX.Y.Z.md` — optional long-form detail for a release
- Package histories: `apps/*/CHANGELOG.md`, `packages/@grantjs/*/CHANGELOG.md`
