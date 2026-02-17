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

## Test Structure

```
apps/api/tests/
├── unit/
│   ├── graphql/                # Field selection, custom scalars
│   ├── i18n/                   # i18n error mapper translationKey, helpers
│   │   ├── error-mapper.translationKey.test.ts
│   │   └── helpers.test.ts
│   ├── middleware/             # Rate limiting, request-logging middleware logic
│   │   ├── rate-limit.middleware.test.ts
│   │   └── request-logging.middleware.test.ts
│   ├── handlers/               # Handler optional requestLogger behavior
│   │   └── auth.handler.request-logger.test.ts
│   ├── services/              # Audit service tenant scoping
│   └── jobs/                  # Tenant job context validation
├── integration/
│   ├── i18n.integration.test.ts          # REST error body includes translationKey and localized error
│   ├── rate-limit.integration.test.ts   # HTTP-level rate limit tests
│   ├── observability.integration.test.ts   # Metrics endpoint, telemetry/analytics/tracing adapters
│   └── request-logging.integration.test.ts   # Request-scoped logger and requestId in log payload
└── e2e/
    ├── flows.e2e.test.ts                # Full flow: register → login → org → invite → project
    ├── observability.e2e.test.ts        # GET /metrics against real API (metrics enabled in E2E stack)
    ├── scenarios/
    │   ├── multi-tenant.e2e.test.ts     # Cross-tenant isolation
    │   ├── negative-rbac.e2e.test.ts    # Authorization boundaries
    │   ├── negative-auth.e2e.test.ts    # Authentication rejection
    │   └── user-onboarding.e2e.test.ts  # User onboarding flow
    └── compliance/
        ├── soc2-access-control.e2e.test.ts
        ├── soc2-audit.e2e.test.ts
        ├── hipaa-phi.e2e.test.ts
        └── gdpr.e2e.test.ts
```

## Configuration

| App     | Environment | Config                                                                    |
| ------- | ----------- | ------------------------------------------------------------------------- |
| **API** | `node`      | `apps/api/vitest.config.ts` — uses `vite-tsconfig-paths` for `@/` imports |
| **Web** | `jsdom`     | `apps/web/vitest.config.ts` — component testing with DOM                  |

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
cd apps/api

# All E2E tests (requires running API and database)
pnpm test tests/e2e/

# Isolation scenarios only
pnpm test tests/e2e/scenarios/multi-tenant.e2e.test.ts

# Compliance suites only
pnpm test tests/e2e/compliance/
```

## Rate Limit Testing

Rate limiting is tested at two levels:

- **Unit** (`tests/unit/middleware/`) — middleware logic in isolation with mocked config and store
- **Integration** (`tests/integration/`) — HTTP-level via supertest against a minimal Express app

The integration suite includes optional benchmark reporting (duration, req/s). Suppress with `BENCHMARK_REPORT=0`.

## Observability Testing

Observability is covered at two levels:

- **Integration** (`observability.integration.test.ts`) — Metrics endpoint (GET /metrics with mocked config), telemetry adapter (`sendLog` noop when provider is none), analytics adapter (`trackEvent` noop when disabled), and tracing shutdown. No real server or external backends.
- **E2E** (`observability.e2e.test.ts`) — GET /metrics against the real API container. The E2E stack enables metrics (`METRICS_ENABLED=true` in `docker-compose.e2e.yml`); telemetry and analytics are set to noop/disabled. Full E2E for log-push or analytics would require a test backend (e.g. mock HTTP receiver).

**Request logging:** Unit tests (`request-logging.middleware.test.ts`) assert requestId and request-scoped logger on `req`, and the completion log payload on `res.finish`. Handler unit test (`auth.handler.request-logger.test.ts`) asserts that when `requestLogger` is passed, the handler uses it for error logs. Integration test (`request-logging.integration.test.ts`) uses a minimal Express app with the middleware and one route that calls `getRequestLogger(req).info(...)`; it asserts the log payload includes `requestId` and the event message.

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
