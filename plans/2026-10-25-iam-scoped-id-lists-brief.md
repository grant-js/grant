# Story brief

Copy of Grant template `docs/contributing/templates/story-brief.md`. Project Manager owns this artifact.

Source: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H3 (post-[#600](https://github.com/grant-js/grant/pull/600)). Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md). Stack: [2026-10-25-iam-scoped-id-lists-stack.md](./2026-10-25-iam-scoped-id-lists-stack.md). Copy both files into repo-root `plans/` when the first slice is cut.

## Metadata

- **Slug**: `iam-scoped-id-lists`
- **Date**: 2026-10-25
- **Author** (human / PM agent): PM agent; Gate 1 approved by Alejandro 2026-10-25
- **Status**: approved

## Objective

Stop copying the whole tenant phone book to show one page. Today `CacheHandler.resolveScopedIds` is the scope controller: it first resolves every ID the caller may access (org/project pivot → `Set`, then cache). List handlers then apply **tag** / **explicit ids** / (sometimes) **search** on that full array in process, and pass the remainder into `EntityRepository.query` (`IN (...)` + `count(*)` + `ORDER BY` + `LIMIT/OFFSET`). Sort and page already run in SQL on the entity query — they do **not** run on the ID set first. M9 already narrowed project-user **row** hydration to the page; the leftover is this ID set. A 50-row page can still resolve 1K+ IDs. This story is **H3 only**. H1 hold and H2 one-toolbox stay as they landed.

Public list args today (users and the sibling scoped lists): `scope`, `page`, `limit`, `search`, `sort`, `ids`, and `tagIds` where the entity is tagged. There is **no** GraphQL `filters` argument. `EntityRepository` has a generic `filters` builder (eq / gte / lte / in / ilike / isNull, including JSON paths) that list handlers do not wire from the public query. H3 does not invent a new filter API.

## Acceptance criteria

- [x] **H3 — Measure (optional first slice):** On current `main`, write a recipe that measures one scoped list page (default 50) against a 1k-id set and a 10k-id set. Record query shape / row count / wall time as observed — do not invent a p95 or a pass/fail target. Docs + existing unit/integration only; no new k6/Artillery harness. `docs/benchmarks/report.md` stays the H4 `is-authorized` snapshot (see note below).
- [ ] **H3 — Filter + sort + page, then hydrate:** A 50-row list must not resolve the full accessible ID list (or hydrate full objects for that list) just to return 50 rows. Apply the **same** public constraints the caller sent — `search`, `tagIds`, explicit `ids`, `sort`, `page`, `limit` — to the scoped set **before** hydrating full objects. `PivotRepository.query` gains a SQL `LIMIT` (today it has none). Shared path is `resolveScopedIds` → list handlers (`UsersHandler.getUsers` and the other `getScoped*Ids` lists) → `EntityRepository.query`. Isolation stays fail-closed. Paging the raw ID set without `sort` (or without search/tag) is a product bug. Existing RLS / scope tests stay green.
- [ ] **H3 — Every list constraint still sees the full accessible set:** Search, tags, and explicit `ids` must not silently run only on the current page window. Who matches must stay the same as today, still scoped to IDs the caller can access. Sort order of page N must match today’s `ORDER BY` on the entity (default `defaultSortField` when `sort` is omitted). Drop a separate search/tag slice only if slice 2 already pushes filter+sort+page into SQL and PE records the collapse.
- [ ] **H3 — Isolation + H1/H2 hold unchanged:** Cross-tenant read/write still fails closed. Unscoped, system, and RLS-off paths stay as they are. Request tx is still held until handler/`res.end()`; after-commit still runs via `releaseTransactionThenAfterCommit`. One toolbox + IP/auth rate limit before context stay as #600 left them. Do not skip `grant.authenticate`. Do not disable rate limiting. Do not raise `DB_POOL_MAX`. Do not turn off RLS (`SECURITY_ENABLE_RLS` stays default true).
- [ ] **H3 — Tests + docs:** Isolation tests stay green. Scoped-id cache keys (`${scope.tenant}:${scope.id}` in `cache-handler.ts`) stay tenant-correct if the stored value or key shape changes. `cache-handler.scoped-ids.test.ts` and list/pivot query tests cover “page of 50 does not require the full ID array,” “search/tag/ids cannot return an out-of-scope ID,” and “sort order of a page matches today’s entity ORDER BY.” Docs that describe scoped lists / caching match the new path. Patch changeset on packages touched.

`docs/benchmarks/report.md` measures `POST /api/auth/is-authorized` only (2026-07-20 local snapshot; cold p95 10–23 ms, warm 5–8 ms). That is H4 evaluation, not list paging. Do not invent an H3 p95 or treat that report as a scoped-id target.

Each slice ships Verifier-clean. Agents do not merge.

## Non-goals

- Skipping JWT / `grant.authenticate` on requests that proceed
- Disabling rate limiting (`SECURITY_ENABLE_RATE_LIMIT=false`)
- Raising `DB_POOL_MAX` as the fix
- Turning off RLS or moving tenant checks only into application `WHERE` (`SECURITY_ENABLE_RLS` stays default true)
- Re-doing H1 (`releaseTransactionThenAfterCommit`, hold-until-`res.end()`, after-commit on the pool)
- Re-doing H2 (rate-limit order, one toolbox, REST router once)
- H4 authz walk or global `permissions.clear()`
- A new GraphQL/REST `filters` argument (repository `filters` stays unwired from public lists)
- Offset → keyset pagination (`pagination.lib.ts` is offset-only; M4 leftover). Out of H3 unless PE says the page-ID fix requires it — then optional, not a required slice
- GraphQL DataLoader, OAuth per-slug RBAC, email-in-transaction
- `apps/web` product work
- Database schema / migrations (unless a slice-2 SQL limit needs an index PE names at slice start)
- `@grantjs/schema` codegen
- Published `@grantjs/{client,server,cli}`
- New load-test harness or k6/Artillery (measure slice is docs + existing unit/integration)
- The queued post-#523 changeset release

## Risk flags

Mark any that apply (forces `security-full` review on affected slices):

- [ ] Auth / sessions / MFA / AAL
- [ ] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII
- [ ] None of the above

**Why:** Slice 2 (and slice 3 if it stays) changes who is in the scoped ID list, how `IN (...)` is bounded, how sort/search/tag apply before hydrate, and possibly what the scoped-id cache stores or keys. Isolation must stay fail-closed. Token formats, RBAC evaluation, and H1/H2 hold are unchanged. Measure is light unless it ships code.

## Suggested active roles

Project Manager, Principal Engineer, Senior Backend, Senior QA, Senior Security, Verifier.

Senior Frontend stays inactive (no web). Architect stays inactive unless a new `@grantjs/core` port appears (`IScopedIdProvider` already returns the full `string[]`; a paged/windowed method is a port change).

## Human gate

- [x] Gate 1: Story brief approved — Alejandro 2026-10-25.
- [ ] Gate 4: Story → `main` — not open; trunk is `feat/iam-scoped-id-lists` from `main` after H2 [#600](https://github.com/grant-js/grant/pull/600).
