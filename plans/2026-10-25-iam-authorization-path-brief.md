# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H4 (post-H1 [#593](https://github.com/grant-js/grant/pull/593), H2 [#600](https://github.com/grant-js/grant/pull/600), H3 [#605](https://github.com/grant-js/grant/pull/605)). Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md) H4. Stack: [2026-10-25-iam-authorization-path-stack.md](./2026-10-25-iam-authorization-path-stack.md). H3 models: [scoped-id brief](./2026-10-25-iam-scoped-id-lists-brief.md) / [stack](./2026-10-25-iam-scoped-id-lists-stack.md). Copy both files into repo-root `plans/` when the first slice is cut — not before Alejandro approves Gates 1–2.

## Metadata

- **Slug**: `iam-authorization-path`
- **Date**: 2026-10-25
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro 2026-10-25
- **Status**: approved

## Objective

Make the permission-check path every authenticated request pays cheaper on a cache miss, and stop one IAM write from wiping every tenant’s remembered answers. Today `AuthHandler.isAuthorized` (GraphQL/REST guard and `POST /api/auth/is-authorized`) caches allow/deny until the access token expires. A miss still walks RBAC sequentially in `GrantService.getUserPermissions` (diagnosis H4: 5–6 queries; live code can reach 7 when every source is present). Role / group / permission assign, revoke, and delete then call `invalidatePermissionsCacheForAllScopes()` → `cache.permissions.clear()`. This story is **H4 only**. H1 hold, H2 one-toolbox, and H3 scoped list SQL stay as they landed.

## Acceptance criteria

- [x] **H4 — Measure (first slice):** On current `main` after #593 / #600 / #605, re-run `pnpm benchmark:authz` and update `docs/benchmarks/report.md` (date, HEAD, catalog size, cold/warm/throughput). Record observed query count / shape on one cold miss — do not invent a p95. Published targets stay **cold p95 &lt; 50 ms** and **warm p95 &lt; 15 ms**. This answers whether diagnosis H4 is stale after H1–H3. Existing `scripts/benchmarks/permission-evaluation.mjs` only; no new k6/Artillery harness.
- [x] **H4 — Cold-miss walk:** A cache-miss `isAuthorized` still unions the same four permission sources (role→group, user→group, role→permission, user→permission) and still evaluates conditions when present, but must not pay the current sequential round-trip chain as the required shape. Allow/deny / reason / `matchedPermission` stay as today’s engine. Project-app empty or missing `grantedScopes` still fail closed (`AuthorizationReason.ScopeNotGranted`) before the walk. API-key / project-app role resolution stays project-roles-only.
- [ ] **H4 — Invalidation blast radius:** An IAM write in tenant A must not flush tenant B’s hot allow-cache. Over-invalidate (extra misses) is allowed; a stale **allow** is not. Per-user prefix delete (`invalidateAuthorizationResultsForUser`, key `auth:result:{userId}:*`) already exists and stays correct. The leftover is global `permissions.clear()`. Prefixes must be delimiter-anchored (the signing-keys `organization:org-1*` / `org-10` lesson in `cache-handler.ts`).
- [ ] **H4 — Isolation + H1/H2/H3 hold unchanged:** Cross-tenant read/write still fails closed. Unscoped, system, and RLS-off paths stay as they are. Request tx is still held until handler/`res.end()`; after-commit still runs via `releaseTransactionThenAfterCommit`. One toolbox + IP/auth rate limit before context stay as #600 left them. Scoped lists still filter + sort + page in SQL as #605 left them. Do not skip `grant.authenticate`. Do not disable rate limiting. Do not raise `DB_POOL_MAX`. Do not turn off RLS (`SECURITY_ENABLE_RLS` stays default true).
- [ ] **H4 — Tests + docs:** End-to-end tests lock the contract. Implementation adapts to those tests; do not rewrite or weaken e2e to match new internals. In particular `apps/api/tests/e2e/flows.e2e.test.ts` (invitee `Organization.Query` / `Organization.Create`) and `apps/api/tests/e2e/scenarios/project-sync-replace-teardown.e2e.test.ts` (`docs:read` after group grant) stay green with the same allow outcomes. Unit tests that encode today’s global `clear()` blast radius are updated to the narrower invalidate — that is not an e2e rewrite. Isolation, project-app fail-closed, and AuthHandler cache-key tests stay green. Docs that describe permission evaluation / authz cache match the new path. Patch changeset on packages touched.

`docs/benchmarks/report.md` is the committed H4 `POST /api/auth/is-authorized` snapshot. Last published run is **2026-10-24** on `f3abf2ef` (H1 trunk `feat/iam-request-chassis`): seed catalog **68 permissions / 2 users**, cold Project.Query **p95 32 ms**, warm **p95 8 ms**, throughput **146 checks/s**. The diagnosis also cites the older **2026-07-20** CDM-imported snapshot (~371 permissions / ~272 users; cold p95 10–23 ms, warm 5–8 ms). Neither is a post-H2/H3 `main` number. Do not treat the 2026-07-20 row as current, and do not invent a new target.

Each slice ships Verifier-clean. Agents do not merge.

## Non-goals

- Skipping JWT / `grant.authenticate` on requests that proceed
- Disabling rate limiting (`SECURITY_ENABLE_RATE_LIMIT=false`)
- Raising `DB_POOL_MAX` as the fix
- Turning off RLS or moving tenant checks only into application `WHERE` (`SECURITY_ENABLE_RLS` stays default true)
- Re-doing H1 (`releaseTransactionThenAfterCommit`, hold-until-`res.end()`, after-commit on the pool)
- Re-doing H2 (rate-limit order, one toolbox, REST router once)
- Re-doing H3 (scoped list SQL page / `resolveScopedIds`)
- A Rust API rewrite
- NIST IAM maturity, IAL/AAL/FAL program, OIDC OP, SAML / Active Directory (queued after H4; see preferences)
- M2 OAuth per-slug RBAC (`getGrantedScopeSlugs` loops `getUserPermissions`). A cheaper walk helps it; rewriting the loop is not a required slice
- M1 GraphQL DataLoader / field-resolver N+1
- M8 session `getUser` on every authenticate
- M5 reverse indexes on IAM pivots, unless slice 1 EXPLAIN names one as required for the walk — then optional, not a required slice
- `apps/web` product work
- Database schema / migrations (unless PE names an index at slice-2 start)
- `@grantjs/schema` codegen
- Published `@grantjs/{client,server,cli}` (client already calls `POST /api/auth/is-authorized`; response contract stays)
- New load-test harness or k6/Artillery (measure uses the existing authz bench)
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** This path **is** authorize. Slice 2 changes how `Grant.isAuthorized` / `PermissionChecker.check` / `GrantService.getUserPermissions` gather the four sources (and how project-app / API-key tokens resolve roles). Slice 3 changes who loses a cached allow after an IAM write. A stale allow or a cross-tenant cache hit is a security bug. Token formats, authenticate, H1 hold, H2 composition, and H3 list paging are unchanged. Measure is light unless it ships production code.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive (no web). Architect stays inactive unless a new `@grantjs/core` port or cache-adapter method appears (`IGrantService.getUserPermissions` already exists; a batched “permissions in scope” method or `ICacheAdapter` invalidate-by-prefix is a port change).

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-10-25.
- [ ] Gate 4: Story → `main` — not open; trunk will be `feat/iam-authorization-path` from `main` after H3 [#605](https://github.com/grant-js/grant/pull/605).
