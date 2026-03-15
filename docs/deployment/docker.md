---
title: Docker Deployment
description: Deploy the Grant Platform with Docker Compose or Docker Swarm
---

# Docker Deployment

This guide shows how to deploy the Grant Platform using **Docker Compose** (single host) and how to take the same images and configuration to **Docker Swarm** (replicas and rolling updates). The flow is intentionally short and focused, similar to Umami’s deployment docs.

## Compose files vs env files

- **Compose files** = infrastructure topology (which services run, replicas, tmpfs, networks).
- **Env files** = configuration (passwords, ports, DB names, URLs). Keep config in `.env.<env>`; do not duplicate it in YAML.

| Compose file              | Env file                                                | Use case                                     |
| ------------------------- | ------------------------------------------------------- | -------------------------------------------- |
| `docker-compose.yml`      | `.env` (or `--env-file .env.demo` for a demo-style run) | Default full stack                           |
| `docker-compose.demo.yml` | `.env.demo`                                             | Demo/Swarm (fewer services, replicas)        |
| `docker-compose.e2e.yml`  | `.env.test`                                             | E2E tests (minimal stack, ephemeral storage) |

Compose resolves `${VAR}` in the YAML at **parse time** from the env passed to the process (e.g. `docker compose --env-file .env.test up`). Always pass `--env-file .env.<env>` when using a non-default env file so interpolation works. A minimal `.env` in the repo root (e.g. `COMPOSE_PROJECT_NAME=grant`) is kept for Compose and tooling; full config lives in `.env.test`, `.env.demo`, etc.

## 1. Choose your domains and ports

Decide how users will reach the platform:

| Component              | Default container port             | Typical public URL                    |
| ---------------------- | ---------------------------------- | ------------------------------------- |
| Web (Next.js)          | `3000`                             | `https://grant.yourdomain.com`        |
| API                    | `4000`                             | `https://grant.yourdomain.com` (path) |
| Docs (optional)        | `8080` (container) → `5173` (host) | `https://docs.yourdomain.com`         |
| Example app (optional) | `3000` (container) → `3004` (host) | `https://example.yourdomain.com`      |

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

For **Swarm/demo**, copy `cp .env.demo.example .env.demo` and edit (e.g. with the Config app set to **Environment: Demo**). See [Environment setup](/deployment/environment) for the full list and how build vs runtime env works.

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

With the stack running, apply migrations and seed (same outcome as [§7.3](#73-migrate-and-seed-with-swarm); for Compose):

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

## 7. Docker Swarm: replicas and rolling updates

The `docker-compose.demo.yml` file is tuned for **Swarm** and used to run `demo.grant.center`:

- `deploy.replicas` for the API (e.g. 2 replicas)
- `update_config` with `order: start-first` for rolling updates
- An overlay network suitable for multi-node clusters
- Host-mode ports for web/docs/example so a single node can bind to the public ports

### 7.1 Initialize Swarm

On the manager node:

```bash
docker swarm init
# If the host has multiple IPs:
# docker swarm init --advertise-addr <your-ip>
```

### 7.2 Prepare env and deploy the stack

For Swarm we use the dedicated demo compose file and helper script:

```bash
cp .env.demo.example .env.demo   # or cp .env.example .env.demo, then adjust for demo
./scripts/stack-deploy.sh up   # uses .env.demo and docker-compose.demo.yml by default
```

This script:

- Loads variables from `.env.demo` in a subshell (no pollution of your shell)
- Runs `docker stack deploy` with `docker-compose.demo.yml`
- Uses `grant-demo` as the default stack name

You can override its defaults:

```bash
ENV_FILE=.env.demo \
COMPOSE_FILE=docker-compose.demo.yml \
STACK_NAME=grant-demo \
  ./scripts/stack-deploy.sh up
```

> In CI you can run the same script after providing `.env.demo` (or equivalent env) to the runner.

### 7.3 Migrate and seed with Swarm

Once the stack is up, use the helper script to run migrations and seeding inside a running API task:

```bash
./scripts/stack-migrate-seed.sh grant-demo
```

This script:

- Finds an API task for the given stack that has the database migration config
- Runs database migrations
- Runs the seed script (roles, permissions, system user, signing key)

### 7.4 Rolling updates

After building or pulling new images:

```bash
docker stack deploy -c docker-compose.demo.yml grant-demo
```

Swarm will:

- Start new API tasks
- Wait for them to pass health checks
- Drain and stop old tasks, respecting the `stop_grace_period`

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

### Swarm with API replicas

```bmermaid diagram-narrow
flowchart TD
  lb[Reverse proxy / LB] --> api1[API replica 1]
  lb --> api2[API replica 2]

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
# Swarm: docker service ls
```

**Logs**

```bash
docker compose logs -f api
# Swarm: docker service logs grant-demo_api
```

**Stop (Compose)**

```bash
docker compose down
# Add -v to remove volumes (DELETES database data)
```

**Scale API (Compose, no Swarm)**

```bash
docker compose up -d --scale api=2
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

To enable the deploy step in `deploy.yml`, set the repository variable **DEMO_DEPLOY_ENABLED** to `true` and configure secrets: **SSH_HOST**, **SSH_USER**, **SSH_PRIVATE_KEY**, **SSH_DEPLOY_PATH** (path on the server to the repo or directory containing `docker-compose.demo.yml`, `.env.demo`, and `scripts/stack-deploy.sh`). Optionally **SSH_PORT**. The job SSHs to the server and runs `./scripts/stack-deploy.sh up`, which loads `.env.demo` and runs `docker stack deploy -c docker-compose.demo.yml grant-demo`.

## Related

- [Deployment overview](/deployment/self-hosting)
- [Environment setup](/deployment/environment)
- [Configuration](/getting-started/configuration)
- [Versioning and release](/contributing/versioning)
