---
title: Testing
description: Test setup, structure, and patterns for Grant contributors
---

# Testing

Grant uses **Vitest** for all testing across the monorepo.

## Quick Start

```bash
pnpm test              # Watch mode
pnpm test:run          # Single run
pnpm test:coverage     # With coverage report
```

### Security-sensitive guard refactors

When changing email or MFA guards, verify that every sensitive route still chains **email verification and MFA** where required:

- `rg "requireEmailVerificationGraphQL|requireEmailVerificationRest" apps/api` — only `email-then-mfa-compose.ts`, `email-verification-*.ts`, and `index.ts` should import the raw email guards for export; **routes** should use `requireEmailThenMfaGraphQL` / `requireEmailThenMfaRest` unless the endpoint is intentionally email-only.

## Test Structure

```
apps/api/tests/
├── unit/
│   ├── graphql/                # Field selection, custom scalars
│   ├── i18n/                   # i18n error mapper translationKey, helpers
│   │   ├── error-mapper.translationKey.test.ts
│   │   └── helpers.test.ts
│   ├── lib/authorization/      # Min-AAL-at-login, MFA GraphQL/REST guards
│   │   ├── min-aal-at-login.test.ts
│   │   └── mfa-guards.test.ts
│   ├── middleware/             # Rate limiting, request-logging middleware logic
│   │   ├── rate-limit.middleware.test.ts
│   │   └── request-logging.middleware.test.ts
│   ├── handlers/               # Handler optional requestLogger, project OAuth
│   │   ├── auth.handler.project-oauth.test.ts
│   │   ├── auth.handler.request-logger.test.ts
│   │   ├── auth.handler.mfa-step-up.test.ts
│   │   ├── auth.handler.verify-mfa-recovery.test.ts
│   │   └── project-oauth.handler.test.ts
│   ├── services/              # Audit service tenant scoping, MFA lifecycle
│   │   └── user-mfa.service.test.ts
│   └── jobs/                  # Tenant job context validation
├── integration/
│   ├── i18n.integration.test.ts          # REST error body includes translationKey and localized error
│   ├── mfa-auth.integration.test.ts      # MFA REST: unauthenticated /api/auth/mfa/verify → 401
│   ├── project-oauth.integration.test.ts # Project OAuth authorize, email request, email callback
│   ├── rate-limit.integration.test.ts   # HTTP-level rate limit tests (MFA paths share auth bucket)
│   ├── observability.integration.test.ts   # Metrics endpoint, telemetry/analytics/tracing adapters
│   ├── project-sync.integration.test.ts      # CDM sync job REST routes (mocked handlers)
│   ├── project-sync-graphql.integration.test.ts # CDM sync job GraphQL resolvers (mocked handlers)
│   ├── cdm-round-trip.integration.test.ts    # CDM export/import cross-refs and partial sections
│   └── request-logging.integration.test.ts   # Request-scoped logger and requestId in log payload
└── e2e/
    ├── flows.e2e.test.ts                # Full flow: register → login → org → invite → project
    ├── observability.e2e.test.ts        # GET /metrics against real API (metrics enabled in E2E stack)
    ├── scenarios/
    │   ├── multi-tenant.e2e.test.ts     # Cross-tenant isolation
    │   ├── negative-rbac.e2e.test.ts    # Authorization boundaries
    │   ├── negative-auth.e2e.test.ts    # Authentication rejection
    │   ├── project-apps.e2e.test.ts     # Project app CRUD (create, list, update, delete) via GraphQL
    │   ├── project-oauth.e2e.test.ts   # Project OAuth authorize, email request, email callback
    │   ├── mfa.e2e.test.ts             # TOTP enroll/verify, org MFA policy, recovery step-up
    │   ├── mfa-aal2-login.e2e.test.ts  # Login requiresMfaStepUp when API uses aal2 (opt-in env)
    │   ├── project-sync-jobs.e2e.test.ts # CDM import/export jobs (REST + GraphQL, RBAC)
    │   └── user-onboarding.e2e.test.ts  # User onboarding flow
    └── compliance/
        ├── soc2-access-control.e2e.test.ts
        ├── soc2-audit.e2e.test.ts
        ├── hipaa-phi.e2e.test.ts
        └── gdpr.e2e.test.ts
```

## Configuration

| App     | Environment | Config                                                                             |
| ------- | ----------- | ---------------------------------------------------------------------------------- |
| **API** | `node`      | `apps/api/vitest.config.ts` — uses `vite-tsconfig-paths` for `@/` imports          |
| **Web** | `jsdom`     | `apps/web/vitest.config.ts` — component + hook tests (`**/*.{test,spec}.{ts,tsx}`) |

## Security and Compliance Tests

E2E tests create real tenant contexts (users, organizations, projects, tokens) and issue actual HTTP requests. Each test follows a positive/negative pattern:

1. **Positive** — verify authorized users can perform operations within their scope
2. **Negative** — verify unauthorized users (other tenants, unauthenticated) get 403/404

### Test Suites

| Suite                       | File                              | Compliance                                        |
| --------------------------- | --------------------------------- | ------------------------------------------------- |
| **Multi-tenant isolation**  | `multi-tenant.e2e.test.ts`        | SOC 2 CC6.1, ISO 27001 A.8.3, HIPAA 164.312(a)(1) |
| **Negative RBAC**           | `negative-rbac.e2e.test.ts`       | SOC 2 CC6.1–CC6.2, ISO 27001 A.5.15               |
| **Negative authentication** | `negative-auth.e2e.test.ts`       | SOC 2 CC6.1, CC6.8                                |
| **SOC 2 access control**    | `soc2-access-control.e2e.test.ts` | CC6.1–CC6.3, CC6.6                                |
| **SOC 2 audit**             | `soc2-audit.e2e.test.ts`          | CC7.2–CC7.3                                       |
| **HIPAA**                   | `hipaa-phi.e2e.test.ts`           | 164.312(a–e)                                      |
| **GDPR**                    | `gdpr.e2e.test.ts`                | Articles 15, 17, 20, 25, 32                       |

### Running Security Tests

```bash
# All E2E tests from the repo root (starts API, Postgres, Redis, migrates, seeds)
pnpm test:e2e

# Focused E2E iteration: prepare the stack, run selected files, then stop it
pnpm test:e2e:up
pnpm --filter grant-api test:e2e -- tests/e2e/scenarios/multi-tenant.e2e.test.ts

# Compliance suites only, against the prepared stack
pnpm --filter grant-api test:e2e -- tests/e2e/compliance/
pnpm test:e2e:down
```

## MFA testing

MFA is covered across layers; **unit** and **integration** suites are independent and can run **in parallel** in CI (separate jobs or `pnpm exec vitest run` processes). **E2E** needs the Docker stack; prefer the root wrapper (`pnpm test:e2e`, or `pnpm test:e2e:up` + package e2e commands + `pnpm test:e2e:down`) so setup, migrations, and seeds run first.

| Layer                 | Location                                                                                                                                                                                                     | What it asserts                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| **Core**              | `packages/@grantjs/core/src/core/aal.test.ts`                                                                                                                                                                | AAL comparison / token claims                                                                                                      |
| **API unit**          | `tests/unit/lib/mfa.lib.test.ts`, `tests/unit/services/user-mfa.service.test.ts`, `tests/unit/handlers/auth.handler.verify-mfa-recovery.test.ts`, `tests/unit/lib/authorization/mfa-org-requirement.test.ts` | Crypto, service lifecycle, recovery handler, org `requireMfaForSensitiveActions` resolution                                        |
| **API unit (policy)** | `tests/unit/lib/authorization/min-aal-at-login.test.ts`, `mfa-guards.test.ts`, `tests/unit/handlers/auth.handler.mfa-step-up.test.ts`                                                                        | Min-AAL at login (GraphQL + REST), MFA guards, `requiresMfaStepUp` via login/refresh                                               |
| **Integration**       | `tests/integration/mfa-auth.integration.test.ts`                                                                                                                                                             | `POST /api/auth/mfa/verify` → **401** without session                                                                              |
| **Integration**       | `tests/integration/rate-limit.integration.test.ts`                                                                                                                                                           | MFA routes share the **auth-sensitive** rate-limit bucket (`AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS` in `rate-limit.middleware.ts`) |
| **E2E**               | `tests/e2e/scenarios/mfa.e2e.test.ts`                                                                                                                                                                        | REST TOTP verify, invalid code, org policy + recovery step-up (`otplib` for deterministic codes)                                   |
| **E2E (opt-in)**      | `tests/e2e/scenarios/mfa-aal2-login.e2e.test.ts`                                                                                                                                                             | Login `requiresMfaStepUp` when the API runs with `AUTH_MIN_AAL_AT_LOGIN=aal2`                                                      |
| **Web**               | `apps/web/hooks/mfa/use-mfa-mutations.test.tsx`                                                                                                                                                              | MFA mutations (mocked Apollo); `verifyEnrollment` → `false` when response has no data (e.g. `MFA_REQUIRED`)                        |

**`AUTH_MIN_AAL_AT_LOGIN=aal2` in E2E:** Default `docker-compose.e2e.yml` uses `aal1`. Do **not** run two stacks on the same host ports in parallel. Prefer a **second CI job** that sets `AUTH_MIN_AAL_AT_LOGIN=aal2` for the API container before `up`, or restart the API with the new env and run a second Vitest invocation. On the **host** (Vitest process), set `E2E_EXPECT_MIN_AAL_AT_LOGIN=aal2` so `mfa-aal2-login.e2e.test.ts` runs; without it, that file is skipped.

**Commands (API, from repo root):**

```bash
# Unit — MFA-related (examples)
pnpm --filter grant-api exec vitest run \
  tests/unit/lib/authorization/min-aal-at-login.test.ts \
  tests/unit/lib/authorization/mfa-guards.test.ts \
  tests/unit/handlers/auth.handler.mfa-step-up.test.ts

# Integration — can run in parallel with unit in CI
pnpm --filter grant-api exec vitest run \
  tests/integration/mfa-auth.integration.test.ts \
  tests/integration/rate-limit.integration.test.ts

# E2E — from repo root, starts stack, migrates, seeds, runs tests, then stops stack
pnpm test:e2e

# Focused E2E while iterating
pnpm test:e2e:up
pnpm --filter grant-api test:e2e -- tests/e2e/scenarios/mfa.e2e.test.ts
pnpm test:e2e:down
```

## Rate Limit Testing

Rate limiting is tested at two levels:

- **Unit** (`tests/unit/middleware/`) — middleware logic in isolation with mocked config and store; `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS` is asserted to include MFA routes (single source with `rate-limit.middleware.ts`)
- **Integration** (`tests/integration/`) — HTTP-level via supertest against a minimal Express app (stubs registered from `AUTH_SENSITIVE_RATE_LIMIT_METHOD_PATHS`)

The integration suite includes optional benchmark reporting (duration, req/s). Suppress with `BENCHMARK_REPORT=0`.

## Observability Testing

Observability is covered at two levels:

- **Integration** (`observability.integration.test.ts`) — Metrics endpoint (GET /metrics with mocked config), telemetry adapter (`sendLog` noop when provider is none), analytics adapter (`trackEvent` noop when disabled), and tracing shutdown. No real server or external backends.
- **E2E** (`observability.e2e.test.ts`) — GET /metrics against the real API container. The E2E stack enables metrics (`METRICS_ENABLED=true` in `docker-compose.e2e.yml`); telemetry and analytics are set to noop/disabled. Full E2E for log-push or analytics would require a test backend (e.g. mock HTTP receiver).

**Request logging:** Unit tests (`request-logging.middleware.test.ts`) assert requestId and request-scoped logger on `req`, and the completion log payload on `res.finish`. Handler unit test (`auth.handler.request-logger.test.ts`) asserts that when `requestLogger` is passed, the handler uses it for error logs. Integration test (`request-logging.integration.test.ts`) uses a minimal Express app with the middleware and one route that calls `getRequestLogger(req).info(...)`; it asserts the log payload includes `requestId` and the event message.

## Project OAuth testing

Project OAuth (authorize, email magic link, callback) is covered at three levels:

- **Unit** (`tests/unit/handlers/project-oauth.handler.test.ts`, `auth.handler.project-oauth.test.ts`) — Handler logic in isolation with mocked services, cache, grant, GitHub OAuth, and email. Asserts: `initiateProjectAuthorize` (NotFound, BadRequest for redirect_uri/provider, 302 URL for github vs email), `requestProjectEmailMagicLink` (validation, cache set, email send), `handleProjectCallback` (GitHub: state validation, user resolution, token signing), `handleProjectCallbackEmailFlow` (token/state validation, user resolution), `resolveUserIdFromGithubForProject` and `resolveUserIdFromEmailForProject` (find by provider/email, link or create user).
- **Integration** (`tests/integration/project-oauth.integration.test.ts`) — Minimal Express app with auth routes and real `ProjectOAuthHandler` backed by in-memory cache and mocked dependencies. Asserts: GET authorize → 302 with Location (GitHub or email entry URL), POST email/request → 202, GET callback with token/state (payload injected in cache) → 302 with Location fragment containing `access_token`. Redirects are asserted without following (Supertest does not follow redirects by default).
- **E2E** (`tests/e2e/scenarios/project-oauth.e2e.test.ts`) — Real API, DB, and Redis. Reuses project-app setup (org, project, project app with `enabledProviders`). Asserts: authorize 302 for github and email, email/request 202, then **Redis helper** (`tests/e2e/helpers/redis-e2e.ts`) reads the one-time token from E2E Redis (key pattern `grant:oauth:oauth:project-email-token:*`), and GET callback with that token and state → 302 with `access_token` in fragment. The user must be in `project_users` (DB helper `addProjectUserForE2e` in `db-tokens.ts`).

**Redirect handling:** Supertest does not follow redirects by default; assert on `res.status === 302` and `res.headers.location`. No need to follow the redirect to validate the flow.

**E2E Redis:** Set `E2E_REDIS_HOST`, `E2E_REDIS_PORT` (default 6380), and `E2E_REDIS_PASSWORD` if your E2E Redis is not at `localhost:6380` with password `grant_redis_password` (see `docker-compose.e2e.yml`).

**GitHub callback E2E:** Full GitHub OAuth flow (user authorizes in browser) is not automated in E2E; it is covered by unit and integration tests with mocked GitHub exchange. To run a full GitHub flow E2E, use a test GitHub OAuth app or a mock OAuth server (see project OAuth testing strategy).

## CDM project sync jobs

CDM import/export (async `ProjectSyncJob` rows) is covered at unit, integration, and E2E layers. Shared fixtures live in `apps/api/tests/helpers/cdm-sync-fixtures.ts`; E2E REST helpers in `apps/api/tests/e2e/helpers/sync-job.ts`.

| Layer           | Location                                                                                          | What it asserts                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Unit**        | `tests/unit/services/project-sync-job.service.test.ts`                                            | Job lifecycle: cancel conflicts, `markFailed`, terminal guards                                                       |
| **Unit**        | `tests/unit/services/project-import.metadata.test.ts`, `project-export.service.test.ts`           | `ProjectImportService` metadata; `ProjectExportService` assembly                                                     |
| **Unit**        | `tests/unit/handlers/projects.handler.start-project-sync.test.ts`, `start-project-export.test.ts` | Enqueue, idempotency, replace `confirmDestructive` validation                                                        |
| **Unit**        | `tests/unit/jobs/project-sync.job.test.ts`                                                        | Worker: snapshot order, export sections, import replace mode                                                         |
| **Unit**        | `tests/unit/lib/cdm/registry.test.ts`, `tests/unit/services/cdm-handler-registry.test.ts`         | Registry order; replace import: all `teardown` before any `apply`                                                    |
| **Unit**        | `tests/unit/lib/cdm/*.cdm-entity.test.ts`                                                         | Per-entity validate/apply/teardown/export                                                                            |
| **Integration** | `tests/integration/project-sync.integration.test.ts`                                              | All seven REST sync routes (mocked handlers + bypassed auth)                                                         |
| **Integration** | `tests/integration/project-sync-graphql.integration.test.ts`                                      | GraphQL mutations/queries delegate to handlers                                                                       |
| **Integration** | `tests/integration/cdm-round-trip.integration.test.ts`                                            | CDM opaque keys, cross-refs, partial export assembly                                                                 |
| **E2E**         | `tests/e2e/scenarios/project-sync-jobs.e2e.test.ts`                                               | Real API + DB + RBAC; export → merge import; modes; GraphQL parity                                                   |
| **E2E**         | `tests/e2e/scenarios/project-sync-replace-teardown.e2e.test.ts`                                   | Rich replace re-import; stagger `deleted_at` uniqueness; orphan pivot cleanup; direct `users[].groups` authorization |

**E2E background jobs:** `docker-compose.e2e.yml` sets `JOBS_ENABLED=true` and `JOB_PROVIDER=node-cron` so enqueue runs the worker inline (no separate worker container). Align `.env.test` with `.env.test.example` if you override job settings locally.

```bash
# Unit + integration (API package)
pnpm --filter grant-api exec vitest run \
  tests/unit/services/project-sync-job.service.test.ts \
  tests/unit/services/project-import.metadata.test.ts \
  tests/unit/services/project-export.service.test.ts \
  tests/unit/services/cdm-handler-registry.test.ts \
  tests/unit/jobs/project-sync.job.test.ts \
  tests/unit/lib/cdm \
  tests/integration/project-sync.integration.test.ts \
  tests/integration/cdm-round-trip.integration.test.ts

# E2E (prepare stack, run selected files, then stop it)
pnpm test:e2e:up
pnpm --filter grant-api test:e2e -- tests/e2e/scenarios/project-sync-jobs.e2e.test.ts
pnpm --filter grant-api test:e2e -- tests/e2e/scenarios/project-sync-replace-teardown.e2e.test.ts
pnpm test:e2e:down
```

## i18n Testing

i18n correctness is covered at three levels:

- **Unit** (`tests/unit/i18n/`) — `mapDomainToHttp` assigns the correct `translationKey` (and optional `translationParams`) for each domain exception (NotFoundError, ValidationError, TokenExpiredError, etc.). Helpers unit tests assert `translateError`, `t`, `getLocale`, and `translateStatic` with mocked `req.i18n` and `getFixedT`.
- **Integration** (`tests/integration/i18n.integration.test.ts`) — Minimal Express app with mock i18n middleware and the real error handler; requests that throw `AuthenticationError` or `NotFoundError` return 401/404 with `translationKey` and localized `error` in the JSON body. Asserts that `Accept-Language` influences the localized message.
- **E2E** — `negative-auth.e2e.test.ts` asserts that every 4xx error response includes a `translationKey` string matching `^errors\.` (and auth/validation/conflict segments where applicable). `flows.e2e.test.ts` includes a short "Error response i18n" check: unauthenticated `GET /api/me` returns 401 with `translationKey` and `error`.

## Coverage Goals

| Category                         | Target |
| -------------------------------- | ------ |
| Unit (utilities, business logic) | > 90%  |
| Integration (API endpoints)      | > 80%  |
| Component (UI)                   | > 70%  |
| Overall                          | > 80%  |

---

**Related:**

- [Development Guide](/contributing/guide) — Project structure and workflow
- [Security Audit](/contributing/security-audit) — Dependency vulnerability scanning
