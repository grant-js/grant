# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H1 (post-[#588](https://github.com/grant-js/grant/pull/588)). Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md). Stack: [2026-10-24-iam-request-chassis-stack.md](./2026-10-24-iam-request-chassis-stack.md). Copy both files into repo-root `plans/` when the first slice is cut.

## Metadata

- **Slug**: `iam-request-chassis`
- **Date**: 2026-10-24
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro
- **Status**: approved — Gate 1 passed 2026-10-24 by Alejandro / in-progress

## Objective

Give the request’s RLS database parking spot back at COMMIT — as soon as the last tenant-scoped query is done — without turning off RLS or dropping after-commit work (jobs / webhooks). Today `contextMiddleware` keeps that transaction open until the handler ends the response, then COMMITs, then runs after-commit, then flushes the body (`holdResponseEndUntil`). A slow handler or a slow enqueue occupies a pool client (`DB_POOL_MAX` default 20) and holds the HTTP response (Lambda freeze is why enqueue is awaited). This story is **H1 only**.

## Acceptance criteria

- [ ] **M0 — Baseline:** Re-run `pnpm benchmark:authz` on current `main` and update `docs/benchmarks/report.md` (date, HEAD, same cold/warm targets). Note that this bench is `is-authorized` (H4), not pool wait. Add the smallest written recipe for watching pool checkout / `pg_stat_activity` during a scoped request (docs only unless a one-line metric already exists). No invented p95 targets for H1.
- [ ] **H1 — Spot back at COMMIT:** On a scoped RLS request, the request transaction client is returned to the pool when the transaction COMMITs. After-commit callbacks (`scheduleAfterCommit`, job/webhook enqueue) must not run on that client and must not keep it checked out. `SET LOCAL ROLE` + tenant GUCs still apply for every tenant-scoped query on that request. `SECURITY_ENABLE_RLS` stays default true.
- [ ] **H1 — Isolation unchanged:** Cross-tenant read/write still fails closed (existing RLS / scope tests stay green). Unscoped, system, and RLS-off paths stay as they are (no request transaction).
- [ ] **H1 — After-commit still happens:** Jobs/webhooks scheduled in the request still run after COMMIT and are still visible (row exists before workers see it). Lambda freeze is not re-introduced: do not flush a success that was never persisted, and do not drop in-flight enqueue on the response path unless a documented durable alternative is in place.
- [ ] **H1 — Tests + docs:** Tests cover (1) commit-then-after-commit order, (2) after-commit not using the request transaction client, (3) tenant isolation. `docs/advanced-topics/transactions.md` (and security RLS notes if they describe the hold) match the new lifecycle. Patch changeset on packages touched.

Each slice ships Verifier-clean. Agents do not merge.

## Non-goals

- Turning off RLS or moving tenant checks only into application `WHERE`
- H2 per-request composition / rate-limit order
- H3 full tenant ID sets / list `IN (...)` paging
- H4 authz walk or global `permissions.clear()`
- GraphQL DataLoader, OAuth per-slug RBAC, email-in-transaction
- Raising `DB_POOL_MAX` as the fix
- `apps/web` product work
- Published `@grantjs/{client,server,cli}`
- New load-test harness or k6/Artillery (recipe in M0 is enough)
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** Slice 2 changes when the RLS transaction COMMITs and which client after-commit uses. Isolation must stay fail-closed. Auth tokens and RBAC evaluation are unchanged.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend and Architect stay inactive (no web; no new package boundary).

## Human gate

- [x] Gate 1: Story brief approved — 2026-10-24 by Alejandro.
