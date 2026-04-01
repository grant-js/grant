---
title: Deployment Overview
description: Deploy the Grant Platform with Docker – images, .env, and orchestration
---

# Deployment Overview

The recommended way to run the **Grant Platform** is with **Docker**: build or pull images, configure a single `.env` file, and orchestrate everything with `docker compose`.

## What you deploy

- **API** — Grant API (REST + GraphQL) on port `4000`
- **Web** — Next.js frontend on port `3000`
- **Docs** (optional) — VitePress docs on port `5173`
- **Example app** (optional) — SDK example on port `3004`
- **PostgreSQL** — main database
- **Redis** — cache (recommended for production)
- **Observability stack (optional)** — PgAdmin, Prometheus, Grafana, Jaeger, Umami

All of these services are described in:

- **`docker-compose.yml`** — default stack for a single host
- **`docker-compose.demo.yml`** — production-style stack used for `demo.grantjs.org` (API replicas, nginx LB)

## Configuration checklist

Start from `.env.example`, copy it to `.env`, and make sure these are correct:

| Category         | Key(s)                                              | Description                                                                                      |
| ---------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Database & cache | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | PostgreSQL database name, user, and password.                                                    |
|                  | `REDIS_PASSWORD`                                    | Password for the Redis instance.                                                                 |
| Public URLs      | `APP_URL`                                           | Single public base URL; web proxies `/api`, `/graphql`, `/example`, etc. to API and example app. |
| CORS             | `SECURITY_FRONTEND_URL`                             | Must match the web app URL.                                                                      |
|                  | `SECURITY_ADDITIONAL_ORIGINS`                       | Extra origins such as `https://docs.yourdomain.com`.                                             |
| System user      | `SYSTEM_USER_ID`                                    | Must match the system user created during database seeding.                                      |
| Demo mode        | `DEMO_MODE_ENABLED`                                 | **Keep `false`** for real deployments.                                                           |

Everything else has safe defaults; you can tighten it later (rate limits, Redis TLS, email provider, etc.) using [Configuration](/getting-started/configuration).

## Deployment flow (single host)

1. **Prepare a server**
   - Linux host with Docker and Docker Compose v2 installed.
   - Optional: a domain pointing to the server for HTTPS.
2. **Copy and edit env file**
   - `cp .env.example .env`
   - Update the checklist values above (passwords, URLs, system user).
3. **Start the stack**
   - `docker compose up -d`
   - Run migrations and seed via the `api` service (see [Docker deployment](/deployment/docker)).
4. **Put a reverse proxy in front**
   - Terminate TLS and route traffic to `web` (`3000`) and `api` (`4000`) or terminate TLS directly in your infrastructure (load balancer, ingress controller).

For replicas with a load balancer, use the demo compose file (`docker-compose.demo.yml`). For Kubernetes, the same images and environment variables apply; use the [Kubernetes (Helm)](/deployment/kubernetes) guide and the `charts/grant-platform` chart.

## Next steps

- **Walkthrough**: [Docker deployment](/deployment/docker)
- **Kubernetes**: [Kubernetes (Helm)](/deployment/kubernetes)
- **Environment variables**: [Environment setup](/deployment/environment)
- **Full config reference**: [Configuration](/getting-started/configuration)
- **Local development**: [Quick Start](/getting-started/quick-start)
