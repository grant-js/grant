# grant-platform Helm chart

Deploys the Grant Platform behind a **single canonical public URL** (`global.appUrl` → `APP_URL` and related env vars aligned with [`@grantjs/env`](../../packages/@grantjs/env/src/schema.ts)).

## Prerequisites

- Kubernetes 1.25+
- **Ingress controller** — defaults target **Traefik** (Kubernetes Ingress + optional `Middleware` for `/docs` strip prefix). **ingress-nginx** remains supported via `ingress.docs.mode: nginx`.
- **PostgreSQL** and **Redis** — not bundled; install separately (e.g. Bitnami charts, cloud RDS/ElastiCache, or in-cluster operators) and set connection values below.

## Ingress controllers

### Traefik (default)

Set `ingress.className` to your Traefik `IngressClass` (e.g. `traefik` or `platform-gateway-services`).

- **Main Ingress** — standard `Prefix` paths; add timeouts / body size via Traefik `Middleware` or annotations your platform documents.
- **Docs** — `ingress.docs.mode: traefik` (default): chart creates a `Middleware` with `stripPrefix` `/docs` and a second Ingress with path prefix `/docs`. Override `ingress.docs.traefik.middleware.apiVersion` if your cluster only exposes legacy CRDs (`traefik.containo.us/v1alpha1`).
- **TLS / cert-manager** — use `ingress.extraAnnotations` (and optionally `ingress.docs.traefik.annotations`) for `cert-manager.io/cluster-issuer` and Traefik router entrypoints, e.g.:

```yaml
ingress:
  className: platform-gateway-services
  extraAnnotations:
    cert-manager.io/cluster-issuer: letsencrypt-dns
  docs:
    mode: traefik
    traefik:
      annotations:
        traefik.ingress.kubernetes.io/router.entrypoints: web, websecure
        traefik.ingress.kubernetes.io/router.tls: 'true'
  tls:
    - hosts: [grant.example.com]
      secretName: grant-tls
```

- **WebSockets** (`/graphql`) — ensure your Traefik / platform config passes upgrades (often default; document any required service or router annotations for your environment).

### ingress-nginx (optional)

Set `ingress.docs.mode: nginx` and configure `ingress.className` to your nginx ingress class. The docs Ingress uses regex + `rewrite-target` (see `templates/ingress-docs.yaml`). Example main-ingress proxy settings:

```yaml
ingress:
  className: nginx
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: 100m
    nginx.ingress.kubernetes.io/proxy-read-timeout: '300'
    nginx.ingress.kubernetes.io/proxy-send-timeout: '300'
  docs:
    mode: nginx
```

## Install

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

See `values.yaml` for image tags, replica counts, API probes / `terminationGracePeriodSeconds`, and optional `ServiceMonitor`.

## Key values → environment variables

| Value                                                  | Env / effect                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `global.appUrl`                                        | `APP_URL`, `SECURITY_FRONTEND_URL`, `OPENAPI_PRODUCTION_URL`, OAuth callback URLs                                                                                                                                                                                                                       |
| `include grant.docsUrl` template                       | `DOCS_URL` (`{APP_URL}/docs`)                                                                                                                                                                                                                                                                           |
| `externalDatabase.url`                                 | `DB_URL` (in generated Secret, ExternalSecret, or `api.existingSecretEnv`)                                                                                                                                                                                                                              |
| `redis.host`, `redis.port`, `redis.password`           | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`                                                                                                                                                                                                                                                            |
| `config.*` (structured)                                | `NODE_ENV`, `CACHE_STRATEGY`, `EMAIL_PROVIDER`, `METRICS_ENABLED`, `REDIS_*` host/port/db, URL-derived vars (wins over `config.env`)                                                                                                                                                                    |
| `files/api-configmap-env-defaults.yaml` + `config.env` | **Non-secret** API ConfigMap defaults (K8s-oriented subset of [`apps/api/.env.example`](../../apps/api/.env.example): no E2E/POSTGRES split, no dev-only localhost tracing/CORS lists); merged in `templates/configmap-env.yaml`. Secret keys are never emitted (see `config.envSecretKeys` to extend). |
| `config.envSecretKeys`                                 | Extra env names to exclude from the ConfigMap (secret-only).                                                                                                                                                                                                                                            |
| `api.startupProbe` / `api.livenessProbe`               | `/health` is only available after DB bootstrap and app init; widen `startupProbe` if migrations are slow (~5m budget in defaults).                                                                                                                                                                      |
| `api.terminationGracePeriodSeconds`                    | Pod grace period (default 60s); must exceed **`GRACEFUL_SHUTDOWN_TIMEOUT_MS`** ([`@grantjs/env` schema](../../packages/@grantjs/env/src/schema.ts), default 25000).                                                                                                                                     |
| `api.lifecycle`                                        | Optional e.g. `preStop` sleep so endpoints drain before SIGTERM-heavy shutdown.                                                                                                                                                                                                                         |

For the full env surface, see [`packages/@grantjs/env/src/schema.ts`](../../packages/@grantjs/env/src/schema.ts) and [`docs/deployment/environment.md`](../../docs/deployment/environment.md).

## Production secrets

Choose one of:

- **`api.existingSecretEnv`** — Secret in the release namespace with canonical keys (`DB_URL`, `REDIS_PASSWORD`, `AUTH_MFA_SECRET_ENCRYPTION_KEY`, …). Disables generated `*-runtime` Secret and `ExternalSecret` chart resources.
- **`externalSecret.enabled`** — External Secrets Operator syncs to Secret `{{ fullname }}-runtime` from `externalSecret.remoteRef.key` (mutually exclusive with `api.existingSecretEnv`).
- **Generated Secret** — default when neither of the above; uses `externalDatabase.url` and `redis.password` from values (not for production).

**`AUTH_MFA_SECRET_ENCRYPTION_KEY`** must be **stable across all API replicas**.

## IRSA (EKS)

Optional `serviceAccount.annotations` for `eks.amazonaws.com/role-arn` when the API needs AWS APIs (e.g. S3 storage).

## Database migrations and pod shutdown

- **Migrations** run inside the **API process** before `httpServer.listen()`: [`bootstrapDatabase()`](../../apps/api/src/server.ts) (PostgreSQL **advisory lock**; safe with multiple replicas). There is no separate Helm migration Job.
- On **SIGTERM** / **SIGINT**, the API stops **Apollo Server** (drain), closes HTTP, then shuts down tracing, jobs, cache, and the DB pool, with a timeout from **`GRACEFUL_SHUTDOWN_TIMEOUT_MS`** (default **25000** ms). Keep **`api.terminationGracePeriodSeconds`** above that value (default **60s**).

## Storage

- **`STORAGE_PROVIDER=local`** with multiple API replicas requires **ReadWriteMany** storage or **S3**; default `readOnlyRootFilesystem` is compatible with a writable volume mount for `api.persistence`.

## Ingress paths

Main Ingress routes (see [`deploy/gateway.conf.template`](../../deploy/gateway.conf.template)): API under `/graphql`, `/api`, `/api-docs`, `/.well-known`, `/org`, `/acc`, `/health`, `/storage`; example under `/example`; web catch-all `/`. Docs are routed under `/docs` (Traefik: strip prefix; nginx: regex rewrite).

## Chart versioning

- **`version`** in `Chart.yaml` — chart release (SemVer).
- **`appVersion`** — application / image line; image tags are set in `values.yaml` (`*.image.tag`).
