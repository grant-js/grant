---
title: Environment Setup
description: Minimal environment configuration for Docker deployments
---

# Environment Setup

This page describes the **single root `.env`** used for Docker deployments. All apps use **canonical env variable names** (e.g. `APP_URL`). Frontends (web, docs, example-nextjs) receive URLs and flags at **runtime** via the API’s `GET /api/config` or (for docs) minimal `/config.json` then `/api/config`, not at build time.

## 1. Env files (single source of config)

Configuration lives in env files; Compose files define topology only.

| Env file    | Used by                                                                                                                                               |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.env`      | Default stack (`docker-compose.yml`); keep minimal (e.g. `COMPOSE_PROJECT_NAME=grant`) at root; full config can live in `.env.local` or per-env files |
| `.env.demo` | Demo stack (`docker-compose.demo.yml`). Copy from `.env.demo.example`.                                                                                |
| `.env.test` | E2E (`docker-compose.e2e.yml`). Copy from `.env.test.example`.                                                                                        |

- Copy templates: `cp .env.example .env`, `cp .env.demo.example .env.demo`, `cp .env.test.example .env.test` (or let `./scripts/e2e.sh` create `.env.test` on first run).
- Compose interpolates `${VAR}` from the env passed at **parse time** (e.g. `docker compose --env-file .env.test up`). Use `--env-file .env.<env>` when not using the default `.env`.
- All app containers receive vars at **runtime** via `env_file` or the interpolated `environment:` block.

Use **canonical names only** in root `.env`. There are no `NEXT_PUBLIC_*` or `VITE_*` keys in this file; those prefixes were for build-time inlining, which we no longer use.

## 2. Database and cache (required)

```bash
POSTGRES_DB=grant_db
POSTGRES_USER=grant_user
POSTGRES_PASSWORD=change-me
REDIS_PASSWORD=change-me
```

The API builds `DB_URL` from these (or you set `DB_URL` directly for a managed Postgres). For managed Redis, set `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` as needed.

## 3. Public URLs and CORS (required)

Single public URL; API and example app are reached via the same host (path-based proxy):

```bash
APP_URL=https://grant.yourdomain.com

SECURITY_FRONTEND_URL=${APP_URL}
SECURITY_ADDITIONAL_ORIGINS=https://docs.yourdomain.com
```

- **APP_URL** — single public base URL. Web, API (REST + GraphQL), docs, and example app (at `/example`) are derived from this when the web app proxies paths to the right services. Max portability with one canonical URL.
- **SECURITY_FRONTEND_URL** — must match the URL browsers use for the web app (typically same as `APP_URL`).
- **SECURITY_ADDITIONAL_ORIGINS** — extra origins allowed to call the API (e.g. docs).

**How frontends get these values:**

- **Web (Next.js)** — Client fetches `GET /api/config` (proxied to the API) and uses the JSON (appUrl, apiUrl, exampleAppUrl, demoModeEnabled, etc.).
- **Docs (VitePress)** — Entrypoint writes minimal `/config.json` with only `{ "appUrl": "${APP_URL}" }`; the docs app then fetches `${appUrl}/api/config` for the full config.
- **Example-nextjs** — Fetches config from the same API (`/api/config` when served under the web proxy, or its own env when standalone); exampleAppOrigin = `${APP_URL}/example`.

No build-time URL injection; the same image works for any deployment.

## 4. Demo mode (optional)

```bash
DEMO_MODE_ENABLED=false
DEMO_MODE_DB_REFRESH_SCHEDULE=0 0 */2 * *
```

When enabled, the API may reset data on a schedule and the web UI shows a demo banner. For production, keep these off unless you intend a resettable sandbox (e.g. `demo.grantjs.org`).

## 5. System user ID

```bash
SYSTEM_USER_ID=00000000-0000-0000-0000-000000000000
```

Must match the user created by the seed scripts. For most setups, use the default and run the provided seed.

## 6. OAuth and email

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GITHUB_CALLBACK_URL=${APP_URL}/api/auth/github/callback
GITHUB_PROJECT_CALLBACK_URL=${APP_URL}/api/auth/project/callback

EMAIL_PROVIDER=ses
EMAIL_FROM=noreply@yourdomain.com
# ... EMAIL_SES_* or other provider vars
```

Configure once DNS and TLS are in place.

## 7. Build vs runtime

- **Compose interpolation** — When you run `docker compose up`, Compose reads `.env` (or `--env-file`) and substitutes `${VAR}` in the YAML. This happens at **parse time**.
- **env_file** — Lists a file (e.g. `.env`) whose contents are injected into the **container at runtime**. They are **not** available during `docker build`; they are available when the container starts.
- **Build args** — We do not pass URL or demo flags as build args for web, docs, or example-nextjs. Images are built once and reused; URLs come from runtime env.

## 8. Config app and local development

The **Config app** (`pnpm --filter grant-config dev`) reads and writes **one root env file at a time**. Use the **Environment** selector in the header to choose **Default** (`.env`), **Demo** (`.env.demo`), or **Test** (`.env.test`).

**Local development:** Root scripts (`pnpm dev`, `pnpm dev:web`, `pnpm dev:api`, `pnpm db:migrate`, `pnpm db:seed`, etc.) load the standard env hierarchy from the monorepo root via **@grantjs/env** (no dotenv-cli). Always run these commands from the repo root so the loader finds `.env`, `.env.local`, `.env.development`, etc. No copying or syncing to per-app `.env` files is needed.

## 9. Validation

From repo root or `apps/api`:

```bash
NODE_ENV=production pnpm --filter grant-api start
```

The API validates required env, database connectivity, and Redis when configured.

## Related

- [Configuration](/getting-started/configuration) — Full configuration reference
- [Deployment overview](/deployment/self-hosting)
- [Docker deployment](/deployment/docker)
- [Kubernetes (Helm)](/deployment/kubernetes)
