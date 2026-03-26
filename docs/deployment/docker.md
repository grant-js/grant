---
title: Docker Deployment
description: Deploy the Grant Platform with Docker Compose
---

# Docker Deployment

This guide shows how to deploy the Grant Platform using **Docker Compose**: from a single-instance stack to a production-style setup with API replicas and a load balancer. The flow is intentionally short and focused, similar to Umami’s deployment docs.

## Compose files vs env files

- **Compose files** = infrastructure topology (which services run, replicas, tmpfs, networks).
- **Env files** = configuration (passwords, ports, DB names, URLs). Keep config in `.env.<env>`; do not duplicate it in YAML.

| Compose file              | Env file                                                | Use case                                     |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `docker-compose.yml`      | `.env` (or `--env-file .env.demo` for a demo-style run) | Default full stack                           |
| `docker-compose.demo.yml` | `.env.demo`                                             | Demo (replicas, LB, production-style)        |
| `docker-compose.e2e.yml`  | `.env.test`                                             | E2E tests (minimal stack, ephemeral storage) |

Compose resolves `${VAR}` in the YAML at **parse time** from the env passed to the process (e.g. `docker compose --env-file .env.test up`). Always pass `--env-file .env.<env>` when using a non-default env file so interpolation works. A minimal `.env` in the repo root (e.g. `COMPOSE_PROJECT_NAME=grant`) is kept for Compose and tooling; full config lives in `.env.test`, `.env.demo`, etc.

## 1. Choose your domains and ports

Decide how users will reach the platform:

| Component              | Default container port             | Typical public URL                      |
| ---------------------- | ---------------------------------- | --------------------------------------- |
| Web (Next.js)          | `3000`                             | `https://grant.yourdomain.com`          |
| API                    | `4000`                             | `https://grant.yourdomain.com/api/`     |
| Docs (optional)        | `8080` (container) → `5173` (host) | `https://grant.yourdomain.com/docs/`    |
| Example app (optional) | `3000` (container) → `3004` (host) | `https://grant.yourdomain.com/example/` |

You can keep the default ports from `docker-compose.yml` and put a reverse proxy (nginx, Traefik, load balancer, ingress) in front, or expose ports directly during initial testing.

## 2. Environment: build vs runtime

- **env_file** — The compose file sets `env_file: .env` (or `.env.demo`) on services. Those vars are injected into the **container at runtime** only; they are not available during `docker build`.
- **Build args** — We do not pass URLs or demo flags as build args for web, docs, or example-nextjs. Images are built once and are deployment-agnostic; each deployment sets `APP_URL` (and optionally `SECURITY_FRONTEND_URL`) in its env file, and the containers read them at startup.
- **Compose interpolation** — When you run `docker compose up`, Compose reads your env file and substitutes `${VAR}` in the YAML (e.g. in `environment:` or image names). So the same compose file works for any domain.

## 3. Create `.env` from the template

From the repo root:

```bash
cp .env.example .env
```

Update at least:

- **Secrets** — `POSTGRES_PASSWORD`, `REDIS_PASSWORD` (e.g. `openssl rand -base64 32`)
- **Public URLs** — `APP_URL` (single canonical URL; frontends get full config at runtime from API `GET /api/config`)
- **CORS** — `SECURITY_FRONTEND_URL` (match `APP_URL`), `SECURITY_ADDITIONAL_ORIGINS`
- **System user** — `SYSTEM_USER_ID` (must match seed)
- **Demo mode** — `DEMO_MODE_ENABLED=false` unless you want a resettable sandbox

For the **demo stack**, copy `cp .env.demo.example .env.demo` and edit (e.g. with the Config app set to **Environment: Demo**). See [Environment setup](/deployment/environment) for the full list and how build vs runtime env works.

## 4. Start the stack with Docker Compose

From the repo root:

```bash
docker compose up -d
```

This uses `docker-compose.yml` to start:

- PostgreSQL, Redis, PgAdmin, Prometheus, Grafana, Jaeger, Umami
- Grant API (`api`)
- Grant web app (`web`)
- Docs (`docs`)
- Example Next.js app (`example-nextjs`)

Default host ports:

- `3000` → web
- `4000` → API
- `5173` → docs
- `3004` → example app

> Postgres and Redis are only reachable on the internal Docker network; the API connects to them via `postgres` / `redis` hostnames.

## 5. Run migrations and seed data

With the stack running, apply migrations and seed:

```bash
docker compose run --rm api pnpm run db:migrate
docker compose run --rm api pnpm run db:seed
```

After this, you can open the web app and complete onboarding.

## 6. Put a reverse proxy in front (recommended)

For production, terminate TLS and route traffic through a reverse proxy or load balancer:

- Route `/`, `/auth/**`, etc. → **web** (`web:3000`)
- Route `/api/**`, `/graphql`, `/health`, `/api-docs`, `/storage/**` → **api** (`api:4000`)
- Optionally route `docs.yourdomain.com` → **docs** (`docs:8080`)

You can use nginx, Traefik, Caddy, or your cloud’s load balancer / ingress. Reuse the URLs you configured in `.env` to keep CORS and redirects consistent.

For a single canonical APP_URL (e.g. `https://demo.grant.center`) that routes to api, web, docs, and the example app by path, see the sample `docs/deployment/nginx-gateway.conf.example` in the repo. Copy and adapt `server_name`, upstream ports, and SSL paths for your host; it is not required for deployment.

## 7. Demo stack: replicas and load balancer

The `docker-compose.demo.yml` file is the production-style stack used to run `demo.grant.center`:

- `deploy.replicas: 2` for the API (Docker Compose v2 honors this natively)
- A single nginx gateway container that handles path-based routing for all services and round-robins across API replicas via Docker's embedded DNS
- `depends_on: condition: service_healthy` so the API waits for postgres and redis to be ready
- Database bootstrap (migrations + core seed) runs automatically on API startup, serialized across replicas using a PostgreSQL advisory lock

### 7.1 Prepare env and deploy

```bash
cp .env.demo.example .env.demo   # or cp .env.example .env.demo, then adjust for demo
./scripts/stack-deploy.sh up     # builds images and starts all services
```

This script wraps `docker compose` with the demo compose file and env:

- `up` — build + start (detached)
- `update` — rebuild + force-recreate changed services
- `down` — tear down containers and network
- `down -v` — tear down and remove volumes (full reset)
- `logs` — tail API logs

You can override defaults:

```bash
ENV_FILE=.env.demo \
COMPOSE_FILE=docker-compose.demo.yml \
  ./scripts/stack-deploy.sh up
```

Or use `docker compose` directly:

```bash
docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build
```

> In CI you can run the same script after providing `.env.demo` (or equivalent env) to the runner.

### 7.2 Database bootstrap

Migrations and core seeding happen automatically when the API starts (`bootstrapDatabase` in `server.ts`). A PostgreSQL advisory lock prevents two replicas from running migrations concurrently — one acquires the lock, runs migrations + seed, releases it; the other waits, then finds nothing to do (everything is idempotent).

No manual migrate/seed step is needed for the demo stack.

### 7.3 Rolling updates

After building or pulling new images:

```bash
./scripts/stack-deploy.sh update
# or: docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --build --force-recreate
```

Compose will recreate containers with the new images. The `restart: unless-stopped` policy handles recovery from transient failures.

## 8. Architecture diagrams

### Single host with Docker Compose

```bmermaid diagram-narrow
flowchart TD
  subgraph host[Single Docker host]
    direction TB
    subgraph infra[Infrastructure]
      postgres[(PostgreSQL)]
      redis[(Redis)]
    end

    subgraph apps[Grant apps]
      api[API (4000)]
      web[Web (3000)]
      docs[Docs (5173)]
      example[Example app (3004)]
    end
  end

  web --> api
  docs --> api
  api --> postgres
  api --> redis
```

### Demo stack with gateway and API replicas

```bmermaid diagram-narrow
flowchart TD
  gw[Gateway nginx :80] --> api1[API replica 1]
  gw --> api2[API replica 2]
  gw --> web[Web :3000]
  gw --> docs[Docs :8080]
  gw --> example[Example :3000]

  subgraph db[PostgreSQL]
  end
  subgraph cache[Redis]
  end

  api1 --> db
  api1 --> cache
  api2 --> db
  api2 --> cache
```

## 9. E2E tests (docker-compose.e2e.yml)

E2E uses a minimal stack (Postgres, Redis, API only) and **`.env.test`** as the single config source:

1. Copy the template: `cp .env.test.example .env.test` (or run `./scripts/e2e.sh` once; it creates `.env.test` if missing).
2. Start the stack with the env file so Compose interpolation works:  
   `docker compose -f docker-compose.e2e.yml --env-file .env.test up -d`  
   Or use the helper: `./scripts/e2e.sh --up` (then `./scripts/e2e.sh --test` to run tests; `./scripts/e2e.sh --down` to tear down).

The test runner (Vitest) and the API container both use `.env.test` (host-side E2E vars like `E2E_API_BASE_URL`, `E2E_DB_URL` come from the same file).

## 10. Common operations

**Optional:** For local-only overrides (e.g. port changes, extra env), add `docker-compose.override.yml`; Compose loads it automatically. Add it to `.gitignore` if the team wants it to stay local.

**Status**

```bash
docker compose ps
# Demo stack: docker compose -f docker-compose.demo.yml --env-file .env.demo ps
```

**Logs**

```bash
docker compose logs -f api
# Demo stack: ./scripts/stack-deploy.sh logs
```

**Stop**

```bash
docker compose down
# Add -v to remove volumes (DELETES database data)
```

**Scale API**

The demo stack uses `deploy.replicas: 2` by default. To override:

```bash
docker compose -f docker-compose.demo.yml --env-file .env.demo up -d --scale api=3
```

## 11. Data and volumes

Docker named volumes are used for:

- **PostgreSQL data:** `postgres_data`
- **Redis data:** `redis_data`
- **API storage:** `api_storage`
- **Observability:** `prometheus_data`, `grafana_data`, `umami_data`

Back them up like any Docker volume:

- PostgreSQL: `docker exec <postgres-container> pg_dump -U grant_user grant_db > backup.sql`
- API storage: back up the mounted volume path if you store uploads there

## 12. Pipelines and CI/CD

On **push to main**, three workflows run independently:

- **ci.yml** — Lint, build, test.
- **deploy.yml** — Build and push four images (grant-api, grant-web, grant-docs, example-nextjs) to GHCR with tags `:demo` and `:demo-$sha`; optionally deploy the demo stack via SSH.
- **release.yml** — Version and publish npm packages via [Changesets](/contributing/versioning) when the "chore: version packages" PR is merged.

### Release surfaces

| Artifact         | Trigger                                  | Versioning                    |
| ---------------- | ---------------------------------------- | ----------------------------- |
| npm packages     | Changesets (merge "Version packages" PR) | semver                        |
| Docker images    | push to main                             | `:demo`, `:demo-$sha`         |
| Demo environment | deploy workflow                          | latest main                   |
| Future releases  | version PR merge                         | semver images (e.g. `:1.4.0`) |

### GHCR authentication on the server

For the demo deploy job (or any pull from GitHub Container Registry), the server must authenticate to GHCR or pulls will fail. **One-time setup on the server:**

```bash
docker login ghcr.io
```

Use a GitHub PAT (Personal Access Token) with the **`read:packages`** scope. Document this in your runbook; without it, the deploy step can silently fail.

### Deploy job (optional)

To enable the deploy step in `deploy.yml`, set the repository variable **DEMO_DEPLOY_ENABLED** to `true` and configure secrets: **SSH_HOST**, **SSH_USER**, **SSH_PRIVATE_KEY**, **SSH_DEPLOY_PATH** (path on the server to the repo or directory containing `docker-compose.demo.yml`, `.env.demo`, and `scripts/stack-deploy.sh`). Optionally **SSH_PORT**. The job SSHs to the server and runs `./scripts/stack-deploy.sh up`, which builds images and runs `docker compose -f docker-compose.demo.yml --env-file .env.demo up -d`.

## Related

- [Deployment overview](/deployment/self-hosting)
- [Environment setup](/deployment/environment)
- [Configuration](/getting-started/configuration)
- [Versioning and release](/contributing/versioning)
