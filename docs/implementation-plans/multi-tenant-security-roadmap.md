---
title: Multi-Tenant Security & Rate Limiting Roadmap
description: Implementation plan for rate limiting, defense-in-depth, tenant-aware security controls, and per-tenant JWT secret
---

# Multi-Tenant Security & Rate Limiting Roadmap

This plan translates the recommendations from [Multi-Tenancy: The Architecture Powering Billions of Users in the Cloud](https://logus.graphics/blog/multi-tenancy-architecture-powering-billions-users-cloud/) (Logus Graphics, January 2026) into a phased release roadmap for the Grant platform. It covers **rate limiting**, **defense in depth**, **tenant-scoped authorization**, **audit logging**, **cache isolation**, **background job context**, **isolation testing**, and **per-tenant JWT secret** (configurable).

## Reference: Article Summary

The article defines:

- **Threat model:** Cross-tenant data access, cross-tenant actions, tenant impersonation, noisy neighbor, tenant enumeration
- **Defense in depth:** Network (rate limiting, WAF) → Authentication → Authorization (RBAC, tenant scope) → Data (RLS, encryption)
- **Tenant context:** Must be established per request and propagated to every query, cache key, and background job
- **Security pitfalls:** Missing tenant filter, tenant ID from user input, shared caches without tenant key, background jobs losing context, API responses leaking IDs

## Current State Assessment

### ✅ Already in Place

| Area                         | Status | Notes                                                                                                                                            |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Tenant scope in auth**     | ✅     | REST/GraphQL guards require scope (headers/query/body); `isAuthorized` uses scope; API keys have embedded scope (no override)                    |
| **Authorization cache keys** | ✅     | `getAuthorizationCacheKey` includes `userId`, `scope.tenant`, `scope.id`, permission, context hash; entity caches use `createCacheKey(scope)`    |
| **Audit base**               | ✅     | `AuditService` with `logCreate` / `logUpdate` / `logSoftDelete` / `logHardDelete`; used by groups, API keys, etc.                                |
| **Scope from token**         | ✅     | Session tokens allow scope override; API key scope is fixed; scope never taken from untrusted input alone (derived from auth)                    |
| **Rate limit config**        | ⚠️     | `SECURITY_ENABLE_RATE_LIMIT`, `SECURITY_RATE_LIMIT_MAX`, `SECURITY_RATE_LIMIT_WINDOW_MINUTES` exist in config but **no middleware applies them** |

### ❌ Gaps (To Address)

| Area                         | Gap                                                                                 | Risk                               |
| ---------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- |
| **Rate limiting**            | Config present, middleware not wired; no per-tenant or per-endpoint limits          | Abuse, DoS, noisy neighbor         |
| **Sensitive endpoints**      | No extra protection for `/api/auth/cli-callback`, `/api/auth/login`, token exchange | Brute force, code guessing         |
| **Audit tenant context**     | Audit logs do not consistently store tenant/scope; harder to filter by tenant       | Compliance, forensics              |
| **Background jobs**          | No formal pattern for passing/validating tenant ID in async jobs                    | Cross-tenant actions, context loss |
| **Row-Level Security (RLS)** | No database-level RLS; isolation relies on application filters                      | Single bug can leak data           |
| **Isolation testing**        | No dedicated test suite for cross-tenant access attempts                            | Regressions, unknown holes         |
| **Global JWT secret**        | Single `JWT_SECRET` for all tokens; if exposed, all tenants’ tokens are compromised | Full platform compromise           |

---

## Threat Model (Aligned with Article)

| Threat                       | Description                                | Mitigation (Planned)                                                  |
| ---------------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| **Cross-tenant data access** | Tenant A sees Tenant B's data              | RLS (Phase 4), tenant in audit (Phase 2), isolation tests (Phase 5)   |
| **Cross-tenant actions**     | Tenant A modifies Tenant B's data          | Scope from auth only (done); RLS; tenant in jobs (Phase 3)            |
| **Tenant impersonation**     | Attacker uses another tenant's ID          | Never trust client tenant ID for authz (done); audit tenant (Phase 2) |
| **Noisy neighbor**           | One tenant's load affects others           | Global + per-tenant rate limits (Phase 1)                             |
| **Abuse / DoS**              | Unauthenticated or auth endpoints hammered | Global rate limit + stricter limits on auth endpoints (Phase 1)       |
| **JWT secret compromise**    | Single secret for all tenants              | Per-tenant JWT secret (Phase 7); configurable                         |

---

## Implementation Plan

### Phase 1: Rate Limiting (Global + Auth Endpoints)

**Goal:** Apply existing rate limit config globally and add stricter limits for auth and CLI callback to prevent abuse and brute force.

**Deliverables:**

1. **Global rate limit middleware**
   - Use `config.security.enableRateLimit`, `rateLimitMax`, `rateLimitWindowMinutes`.
   - Key: IP (or `X-Forwarded-For` when trusted) for unauthenticated routes; optionally IP + userId for authenticated.
   - Response: 429 Too Many Requests with `Retry-After` when enabled.

2. **Stricter limits for sensitive routes**
   - `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/cli-callback`, `POST /api/auth/token` (token exchange): lower limit (e.g. 10–20 per window per IP) and optionally shorter window.
   - Config: e.g. `SECURITY_RATE_LIMIT_AUTH_MAX`, `SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES`.

3. **No rate limit for health/readiness** (if present) so load balancers keep working.

**Files to create/modify:**

- `apps/api/src/middleware/rate-limit.middleware.ts` – global and auth-specific limiters (in-memory or Redis-backed).
- `apps/api/src/config/env.config.ts` – add auth rate limit env vars.
- `apps/api/src/server.ts` (or REST mount point) – apply global middleware; apply auth middleware to auth routes.
- `apps/api/.env.example` – document new vars.

**Complexity:** Medium (1–2 days).  
**Dependency:** None.

---

### Phase 2: Tenant-Aware Audit Logging

**Goal:** Every audit log entry includes tenant/scope so logs can be filtered by organization/project and support compliance and forensics.

**Deliverables:**

1. **Extend `AuditLogParams` and storage**
   - Add optional `scope?: { tenant: string; id: string }` (or equivalent) to `AuditLogParams`.
   - Ensure audit tables (or JSON metadata) can store scope; if tables are per-entity, add `scope_tenant` and `scope_id` (or a single JSONB column) where appropriate.

2. **Populate scope in services**
   - In services that extend `AuditService`, pass request scope (from auth context) into `logCreate` / `logUpdate` / etc. via metadata or new param.
   - Ensure scope comes from authenticated context only, not from user input.

3. **Documentation**
   - Document audit log schema and how to query by tenant in `docs/architecture/security.md` or `docs/advanced-topics/audit-logging.md`.

**Files to create/modify:**

- `apps/api/src/services/common/audit-service.ts` – extend params and log payload with scope.
- Services that use `AuditService` (e.g. groups, API keys, organizations) – pass scope from context.
- Audit table migrations if new columns are required.
- `docs/advanced-topics/audit-logging.md` (or security.md) – tenant filtering and schema.

**Complexity:** Medium (2–3 days).  
**Dependency:** None.

---

### Phase 3: Background Job Tenant Context

**Goal:** Establish a clear pattern so async jobs always receive and validate tenant/scope and never rely on global or implicit context.

**Deliverables:**

1. **Job payload contract**
   - Define a minimal `TenantJob`-style type: `{ tenantId?: string; scope?: { tenant: string; id: string }; jobType: string; payload: unknown }`.
   - Document that tenant/scope is required for any job that acts on tenant-scoped data.

2. **Validation in job processor**
   - When processing a job, validate that tenant/scope exists and (if applicable) that the tenant is active.
   - Reject or dead-letter jobs missing tenant context.

3. **Enqueue from request handlers**
   - In REST/GraphQL handlers that enqueue jobs, always pass scope/tenant from authenticated context (e.g. `req.context` / request scope), never from client-only input.

4. **Documentation**
   - Add a short “Background jobs and tenant context” section to `docs/architecture/multi-tenancy.md` or `docs/advanced-topics/job-scheduling.md` referencing the article’s “Background Job Tenant Context” pattern.

**Files to create/modify:**

- Job queue/processor code (exact files depend on current job implementation) – add tenant to payload and validation.
- Handlers that enqueue jobs – pass scope from auth.
- `docs/architecture/multi-tenancy.md` or `docs/advanced-topics/job-scheduling.md` – document pattern.

**Complexity:** Low–Medium (1–2 days if job infra exists).  
**Dependency:** None.

---

### Phase 4: Row-Level Security (RLS) – Optional / Evaluation

**Goal:** Evaluate and, if adopted, introduce database-level RLS as defense in depth so that a missing `WHERE scope/tenant_id` in application code cannot return other tenants’ rows.

**Evaluation:** A detailed implementation evaluation (schema mapping, connection/session strategy, effort) is in [Phase 4 RLS Evaluation](./phase-4-rls-evaluation.md).

**Deliverables:**

1. **Evaluation**
   - Decide whether Grant’s schema (organization/project/account scoping) maps cleanly to RLS (e.g. per-tenant policy on key tables).
   - Document tradeoffs: complexity of policies, migration effort, connection/session context (e.g. `SET app.current_tenant`) in front of every request.

2. **If RLS is adopted**
   - Add RLS policies on critical tables (e.g. resources, permissions, project users) so rows are filtered by tenant/scope.
   - Ensure connection/session sets tenant context from authenticated request before running queries.
   - Run migrations and tests; document in `docs/architecture/security.md` and `docs/architecture/multi-tenancy.md`.

**Files to create/modify:**

- Migration(s) to enable RLS and add policies.
- Request/connection middleware or service layer to set session variable from auth scope.
- `docs/architecture/security.md` – RLS section; `docs/architecture/multi-tenancy.md` – reference article’s RLS section.

**Complexity:** High (evaluation + implementation can span 1–2 weeks).  
**Dependency:** Phase 2 (tenant context) helps define what “tenant” means for RLS.  
**Note:** This phase can be deferred or marked optional; application-level scope enforcement already provides the primary guarantee.

---

### Phase 5: Per-Tenant Rate Limiting (Noisy Neighbor)

**Goal:** Allow different rate limits per tenant (e.g. by plan or organization) so one tenant cannot starve others.

**Deliverables:**

1. **Rate limit key by tenant**
   - For authenticated requests with scope, optionally rate limit by `scope.tenant` + `scope.id` (or organization/project id) in addition to or instead of global IP/user.
   - Use existing or new config (e.g. per-tenant limits from plan or env).

2. **Config**
   - e.g. `SECURITY_RATE_LIMIT_PER_TENANT_MAX`, or read from tenant/plan settings if available.

3. **Backward compatibility**
   - If tenant cannot be determined (e.g. unauthenticated), fall back to global/IP-based limit.

**Files to create/modify:**

- `apps/api/src/middleware/rate-limit.middleware.ts` – add per-tenant limiter; key generator uses scope from request context when available.
- `apps/api/src/config/env.config.ts` – per-tenant limit config.
- `apps/api/.env.example` – document.

**Complexity:** Medium (1–2 days).  
**Dependency:** Phase 1 (rate limit middleware and request context available).

---

### Phase 6: Isolation and Security Testing

**Goal:** Automated tests that verify cross-tenant access is denied and that security controls (rate limit, audit, scope) behave as expected.

**Deliverables:**

1. **Isolation tests**
   - For critical resources (e.g. projects, resources, users within a project): create data as Tenant A, call API as Tenant B (different scope/token); expect 404 or 403.
   - Cover: direct ID access, list endpoints with scope, and (if applicable) GraphQL by scope.

2. **Rate limit tests**
   - Assert that exceeding global or auth rate limit returns 429 and (if applicable) correct `Retry-After`.

3. **Audit tests**
   - Assert that audit log entries include tenant/scope when implemented (Phase 2).

4. **Documentation**
   - Reference article’s “Testing Multi-Tenant Systems” and “Isolation Testing”; add a short “Security and isolation testing” section to `docs/development/testing.md`.

**Files to create/modify:**

- `apps/api/tests/` (or equivalent) – new or extended suite for isolation and rate limit and audit.
- `docs/development/testing.md` – link to article and describe isolation and security test strategy.

**Complexity:** Medium (2–3 days).  
**Dependency:** Phase 1 and Phase 2 improve value of tests (rate limit and audit assertions).

---

### Phase 7: Per-Tenant JWT Secret (Configurable)

**Goal:** Reduce blast radius of JWT secret compromise by allowing a separate signing/verification secret per tenant (e.g. per organization or per account). When enabled, a leaked secret for one tenant does not invalidate or expose tokens for others. Must remain **configurable** so deployments can keep using a single global secret (current behavior) or opt into per-tenant secrets.

**Current state:** A single `JWT_SECRET` is used to sign and verify all session and API-key tokens. If that secret is exposed, an attacker can forge or tamper with tokens for any tenant.

**Deliverables:**

1. **Configuration**
   - **Global-only (default):** `JWT_SECRET` only; no per-tenant lookup. Behavior unchanged.
   - **Per-tenant enabled:** Config flag (e.g. `JWT_PER_TENANT_ENABLED=true`). When set, tokens are signed and verified using a secret resolved by tenant (see below). Global secret can still act as fallback for legacy tokens during migration.

2. **Tenant boundary for JWT**
   - Define which entity owns the secret: **organization** or **account** (e.g. `organizationId` or `accountId`). Recommendation: **organization** so all projects and users under one org share one JWT secret; simpler key management and matches “tenant” in most deployments.
   - Optional: support **account**-scoped secret for personal accounts if product requires it.

3. **Per-tenant secret resolution (when enabled)**
   - **Signing:** When issuing a session token (login, refresh) or API-key token, resolve secret for the tenant (e.g. org or account) associated with the session/scope. Include a **key id** in the JWT (e.g. `kid` = organizationId or a stable key id) so verifiers know which secret to use.
   - **Verification:** On each request, decode JWT (e.g. read `kid` without verifying), resolve secret for that key/tenant, then verify signature with that secret. If per-tenant is disabled or `kid` is missing/legacy, verify with global secret only.
   - **Secret storage (configurable):**
     - **Option A – Env:** e.g. `JWT_SECRET_ORG_<orgId>` for specific orgs; others fall back to global. Good for small number of tenants.
     - **Option B – DB:** New column (e.g. `organizations.jwt_secret` or `jwt_secret_id`) or table mapping tenant id → secret (or encrypted secret). Allows runtime config and rotation without redeploy.
     - **Option C – Vault/KMS:** Resolve secret by tenant id from HashiCorp Vault or AWS KMS. Best for strict compliance; more ops.
   - Document one recommended path (e.g. DB for flexibility) and allow override via config.

4. **Backward compatibility and migration**
   - **Existing tokens:** Tokens issued with global secret have no `kid` (or a sentinel). Verifier tries global secret first for such tokens so they remain valid until expiry.
   - **New tokens:** When per-tenant is enabled, new sessions and API keys get tokens signed with the tenant’s secret and a `kid`. No need to invalidate existing sessions; natural expiry is enough unless you want a forced rotation.

5. **API and core changes**
   - **@grantjs/core:** `Grant` (or token parser) must accept a **secret resolver** `(kid?: string) => string | Promise<string>` in addition to or instead of a single `jwtSecret`. Verification: decode → get `kid` → resolve secret → verify.
   - **apps/api:** Context middleware and any code that creates `Grant` must pass a resolver that: (1) returns global secret when per-tenant is disabled or `kid` is missing, (2) when per-tenant is enabled, looks up secret for `kid` (org/account id) and returns it (or throws if unknown).
   - **Session service:** When creating access/refresh tokens, determine tenant (e.g. from scope or session’s org/account), resolve secret for that tenant, sign with it, set `kid` in payload/header.
   - **API key service:** When issuing API key tokens, scope is fixed; resolve secret for that scope’s tenant, sign with it, set `kid`.

6. **Documentation**
   - Update `docs/getting-started/configuration.md` and `docs/deployment/environment.md`: document `JWT_PER_TENANT_ENABLED`, per-tenant secret source (env vs DB vs vault), and that global `JWT_SECRET` remains required (used as fallback and when per-tenant is off).
   - Add a short “Per-tenant JWT secret” section to `docs/architecture/security.md` describing threat, behavior when enabled, and rotation.

**Files to create/modify:**

- `packages/@grantjs/core` – `GrantConfig` and token parser: support secret resolver; verification uses `kid` + resolver.
- `apps/api/src/config/env.config.ts` – `jwt.perTenantEnabled`, optional per-tenant secret source config.
- `apps/api/src/lib/jwt-secret-resolver.ts` (or similar) – resolve secret by `kid` (global vs DB/env/vault).
- `apps/api/src/middleware/context.middleware.ts` – pass resolver into `Grant` when creating context.
- `apps/api/src/services/user-sessions.service.ts` – resolve tenant secret when signing; set `kid` in JWT.
- `apps/api/src/services/api-keys.service.ts` – resolve tenant secret when signing API key tokens; set `kid`.
- DB migration (if Option B): add column or table for per-tenant secret (or secret reference).
- `docs/architecture/security.md` – per-tenant JWT section.
- `docs/getting-started/configuration.md`, `docs/deployment/environment.md` – config and env vars.

**Complexity:** High (roughly 1–2 weeks including resolver, signing path, verification path, config, and migration).  
**Dependency:** None for global-only; if using DB storage, consider after Phase 2 (audit) so tenant context is consistent.  
**Risk:** Verification must try correct secrets and not leak information; keep error messages generic on invalid token.

---

## Recommended Order and Release Mapping

| Phase | Name                           | Suggested release         | Rationale                                                  |
| ----- | ------------------------------ | ------------------------- | ---------------------------------------------------------- |
| 1     | Rate limiting (global + auth)  | Next minor                | High impact, config already exists; unblocks Phase 5 and 6 |
| 2     | Tenant-aware audit             | Next minor                | Compliance and forensics; no breaking change               |
| 3     | Background job tenant context  | Next minor                | Prevents cross-tenant bugs in async flows                  |
| 5     | Per-tenant rate limiting       | Following minor           | Builds on Phase 1; reduces noisy neighbor                  |
| 6     | Isolation and security testing | Same as Phase 1/2 or next | Locks in behavior and prevents regressions                 |
| 7     | Per-tenant JWT secret          | Following minor or later  | Configurable; reduces blast radius of secret compromise    |
| 4     | RLS (evaluation/optional)      | Backlog or later major    | High effort; optional defense in depth                     |

Phases 1, 2, 3, and 6 can be delivered in one release cycle; Phase 5 and Phase 7 in following releases; Phase 4 as a separate initiative once RLS is evaluated.

---

## Configuration Summary (New/Updated)

```bash
# Phase 1 – already present
SECURITY_ENABLE_RATE_LIMIT=true
SECURITY_RATE_LIMIT_MAX=100
SECURITY_RATE_LIMIT_WINDOW_MINUTES=15

# Phase 1 – new (auth endpoints)
SECURITY_RATE_LIMIT_AUTH_MAX=20
SECURITY_RATE_LIMIT_AUTH_WINDOW_MINUTES=15

# Phase 5 – per-tenant (optional)
SECURITY_RATE_LIMIT_PER_TENANT_ENABLED=true
SECURITY_RATE_LIMIT_PER_TENANT_MAX=200

# Phase 7 – per-tenant JWT secret (optional; default: global only)
JWT_PER_TENANT_ENABLED=false
# When true, per-tenant secret source: env (JWT_SECRET_ORG_<id>), DB (e.g. organizations.jwt_secret), or vault – see docs
```

---

## Testing Checklist

- [ ] Global rate limit: exceeding limit returns 429 and Retry-After
- [ ] Auth endpoints: stricter limit applied; 429 after N attempts
- [ ] CLI callback: rate limited; invalid code does not leak info
- [ ] Audit: critical actions log scope/tenant where applicable
- [ ] Background jobs: jobs without tenant context rejected or not enqueued for tenant-scoped actions
- [ ] Isolation: Tenant B cannot read/update/delete Tenant A’s resources by ID or list
- [ ] Per-tenant limit (Phase 5): tenant A’s usage does not consume tenant B’s quota
- [ ] Per-tenant JWT (Phase 7): when enabled, token signed with tenant secret verifies only with that tenant’s secret; global secret still verifies legacy tokens; configurable (global-only vs per-tenant)

---

## References

- [Multi-Tenancy: The Architecture Powering Billions of Users in the Cloud](https://logus.graphics/blog/multi-tenancy-architecture-powering-billions-users-cloud/) – Logus Graphics, January 2026 (threat model, defense in depth, tenant context, RLS, rate limiting, audit, caching, background jobs, testing).
- [docs/architecture/security.md](/architecture/security) – Grant security and session management.
- [docs/architecture/multi-tenancy.md](/architecture/multi-tenancy) – Grant multi-tenancy model.
- [docs/advanced-topics/audit-logging.md](/advanced-topics/audit-logging) – Audit logging (if present).
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) – Security testing methodologies.
