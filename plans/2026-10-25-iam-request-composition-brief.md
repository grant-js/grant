# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H2 (post-[#593](https://github.com/grant-js/grant/pull/593)). Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md). Stack: [2026-10-25-iam-request-composition-stack.md](./2026-10-25-iam-request-composition-stack.md). Copy both files into repo-root `plans/` when the first slice is cut.

## Metadata

- **Slug**: `iam-request-composition`
- **Date**: 2026-10-25
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro 2026-10-25
- **Status**: approved

## Objective

Pay JWT authenticate and the request object graph once, and stop 429s from paying that full setup. Today `create-app.ts` runs `contextMiddleware` (Grant + `authenticate` + `createRepositories` / `createServices` / `createHandlers`) before `rateLimitMiddleware`. Under RLS the context phase builds the toolbox a second time on the scoped tx. `/api` also calls `createRestRouter(context)` per request. This story is **H2 only**. H1 hold stays: request tx until handler/`res.end()`, then `releaseTransactionThenAfterCommit`.

## Acceptance criteria

- [ ] **H2 — IP/auth rate limit before context:** Express `auth:` and `global:` IP buckets run before `contextMiddleware`. Origin verification stays before any rate limiter (`middleware-order.test.ts` already asserts that). `jsonBodyParser` stays before GraphQL auth-sensitive detection (`isAuthSensitiveGraphqlRequest` in `rate-limit.middleware.ts`). Do not disable rate limiting. Do not skip `grant.authenticate` on requests that proceed.
- [ ] **H2 — Per-tenant bucket after auth:** Optional `tenant:` (`SECURITY_RATE_LIMIT_PER_TENANT_*`) still keys on `context.user.scope` after authenticate. A tenant 429 may have paid JWT + one graph (scope is not known earlier); it must not pay a second graph.
- [ ] **H2 — One toolbox:** On a scoped RLS request, `createRepositories` / `createServices` / `createHandlers` run once for the request’s handler graph. Auth may keep a thin unscoped Grant/signing-key bootstrap (JWT still runs). `SET LOCAL ROLE` + tenant GUCs still apply for every tenant-scoped query. `SECURITY_ENABLE_RLS` stays default true.
- [ ] **H2 — 429s skip the full graph:** An IP `auth:` / `global:` 429 must not enter the RLS rebuild and must not construct the handler toolbox. Existing 429 body / `Retry-After` / `/health` skip / auth-sensitive REST + GraphQL buckets stay as they are.
- [ ] **H2 — Isolation + H1 hold unchanged:** Cross-tenant read/write still fails closed (existing RLS / scope tests stay green). Unscoped, system, and RLS-off paths stay as they are. Request tx is still held until handler/`res.end()`; after-commit still runs via `releaseTransactionThenAfterCommit` on the pool, not the request client. Do not redo H1.
- [ ] **H2 — Tests + docs:** `middleware-order.test.ts` asserts relative order (origin before IP/auth limit, IP/auth limit before context, tenant limit after auth). Isolation tests stay green. Optional: a composition-count assertion (factory call count per scoped request). Docs that describe the request pipeline (`docs/advanced-topics/transactions.md` and any rate-limit note that states “after context”) match the new order. Patch changeset on packages touched.

`docs/benchmarks/report.md` measures `POST /api/auth/is-authorized` only (2026-07-20 local snapshot; cold p95 10–23 ms, warm 5–8 ms). That is H4 evaluation, not composition. Do not invent an H2 p95 or treat that report as a composition target.

Each slice ships Verifier-clean. Agents do not merge.

## Non-goals

- Skipping JWT / `grant.authenticate` on requests that proceed
- Disabling rate limiting (`SECURITY_ENABLE_RATE_LIMIT=false`)
- Raising `DB_POOL_MAX` as the fix
- Turning off RLS or moving tenant checks only into application `WHERE` (`SECURITY_ENABLE_RLS` stays default true)
- Re-doing H1 (`releaseTransactionThenAfterCommit`, hold-until-`res.end()`, after-commit on the pool)
- H3 full tenant ID sets / list `IN (...)` paging
- H4 authz walk or global `permissions.clear()`
- GraphQL DataLoader, OAuth per-slug RBAC, email-in-transaction
- `apps/web` product work
- Database schema / migrations
- `@grantjs/schema` codegen
- Published `@grantjs/{client,server,cli}`
- New load-test harness or k6/Artillery
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** Slice 1 changes middleware order (who pays JWT + graph before a 429). Slice 2 changes who gets the scoped toolbox (bootstrap db vs RLS tx) while `authenticate` and `SET LOCAL` stay on. Token formats, RBAC evaluation, and H1 hold are unchanged.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive (no web). Architect stays inactive unless a new `@grantjs/core` port appears (none expected: composition stays in `context.middleware.ts` / `lib/app-context.lib.ts`).

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-10-25.
