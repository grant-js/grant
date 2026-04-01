---
title: Kubernetes (Helm)
description: Deploy the Grant Platform on Kubernetes with the grant-platform Helm chart and a single canonical APP_URL
---

# Kubernetes (Helm)

This guide describes how to run the Grant Platform on **Kubernetes** using the **`grant-platform`** Helm chart in the repository (`charts/grant-platform/`). It replaces the Docker Compose **gateway nginx** pattern with **Ingress**, **Services**, and your cluster’s ingress controller—the usual approach for HTTP routing and TLS on Kubernetes.

The same **canonical environment contract** applies as for Docker: [`@grantjs/env`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/env/src/schema.ts) variable names, with **`APP_URL`** and related URLs derived from a single chart value (`global.appUrl`). See [Environment setup](/deployment/environment) for how config maps to containers.

## What you deploy

The chart deploys:

| Workload               | Role                                                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **API**                | Grant API (REST + GraphQL); `ClusterIP` Service, configurable replicas                                                          |
| **Web**                | Next.js app; catch-all `/` behind Ingress                                                                                       |
| **Docs**               | VitePress static site; served under `/docs` (separate Ingress with path rewrite)                                                |
| **Example** (optional) | Next.js example app under `/example`                                                                                            |
| **Bootstrap Job**      | Post-install/post-upgrade hook; runs `bootstrapDatabase()` (same as API startup; PostgreSQL advisory lock for safe concurrency) |

**PostgreSQL** and **Redis** are **not** bundled. Install them separately (managed cloud services, operators, or another Helm release) and point the chart at them.

## Prerequisites

- Kubernetes **1.25+**
- An **Ingress controller** — [ingress-nginx](https://kubernetes.github.io/ingress-nginx/) is the reference (path routing, WebSockets for `/graphql`, annotations for body size and timeouts). Other controllers work if they support the same routing and forwarding behavior.
- **PostgreSQL** and **Redis** reachable from the cluster (DNS names or external endpoints).
- **Helm 3**

## Install from the repository

From a clone of the [Grant repo](https://github.com/grant-js/grant) at the monorepo root:

```bash
helm upgrade --install grant ./charts/grant-platform \
  --namespace grant \
  --create-namespace \
  --set global.appUrl=https://grant.example.com \
  --set externalDatabase.url=postgresql://user:pass@postgres:5432/grant_db \
  --set externalDatabase.host=postgres \
  --set redis.host=redis \
  --set redis.password=your-redis-password
```

Adjust `externalDatabase.*` and `redis.*` to match your Services (e.g. `my-postgres.default.svc.cluster.local`). The chart sets **`DB_URL`**, **`REDIS_HOST`**, **`REDIS_PASSWORD`**, and **`APP_URL`** (and derived OAuth URLs) via a ConfigMap and Secret. Full defaults and options are in **`charts/grant-platform/values.yaml`**; the chart README in-repo lists image tags, `migrationJob`, `ServiceMonitor`, and optional persistence.

## Canonical `APP_URL`

Set **`global.appUrl`** to the **HTTPS URL** users use in the browser (no trailing path), for example `https://grant.example.com`. The chart maps this to:

- `APP_URL`, `SECURITY_FRONTEND_URL`, `OPENAPI_PRODUCTION_URL`
- `DOCS_URL` as `{APP_URL}/docs`
- `GITHUB_CALLBACK_URL` / `GITHUB_PROJECT_CALLBACK_URL` under `/api/auth/...`

This matches the single-host model documented in [Environment setup](/deployment/environment) and the path routing used in [`deploy/gateway.conf.template`](https://github.com/grant-js/grant/blob/main/deploy/gateway.conf.template).

## Ingress and path routing

- **Main Ingress** — Routes `/graphql`, `/api`, `/api-docs`, `/.well-known`, `/org`, `/acc`, `/health`, `/storage` to the API Service; `/example` to the example app; `/` to the web Service.
- **Docs Ingress** — Uses a **regex path** and `nginx.ingress.kubernetes.io/rewrite-target` so `/docs/...` is served under the same host as the rest of the app.

Default annotations include proxy body size (**100m**) and read/send timeouts (**300s**) for long GraphQL operations. Override with `ingress.annotations` / `ingress.extraAnnotations` as needed.

## TLS (cert-manager)

For automatic TLS, add annotations such as:

```yaml
ingress:
  extraAnnotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
```

and set **`ingress.tls`** to the Secret name your issuer creates. The exact annotation depends on your cert-manager and `ClusterIssuer` names.

## Production secrets

Prefer **`api.existingSecretEnv`**: a Kubernetes `Secret` in the release namespace whose keys use **canonical env names** (`DB_URL`, `REDIS_PASSWORD`, `AUTH_MFA_SECRET_ENCRYPTION_KEY`, …). When set, the chart does not generate the default `*-runtime` Secret.

**`AUTH_MFA_SECRET_ENCRYPTION_KEY`** must be **identical across all API replicas**; never use a random per-pod value.

## Storage and replicas

If **`STORAGE_PROVIDER=local`** with **multiple API replicas**, use **ReadWriteMany** storage or **S3** (`STORAGE_PROVIDER=s3`). The chart documents volume mounts for local storage in `values.yaml`.

## Related

- [Deployment overview](/deployment/self-hosting)
- [Docker deployment](/deployment/docker) — Compose, images, and demo stack (same container images)
- [Environment setup](/deployment/environment)
- [Configuration](/getting-started/configuration)
