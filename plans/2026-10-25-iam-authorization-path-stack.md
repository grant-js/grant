# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact.

Story brief: [2026-10-25-iam-authorization-path-brief.md](./2026-10-25-iam-authorization-path-brief.md). Diagnosis: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H4. Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md) H4. H3 models: [scoped-id brief](./2026-10-25-iam-scoped-id-lists-brief.md) / [stack](./2026-10-25-iam-scoped-id-lists-stack.md).

## Metadata

- **Slug**: `iam-authorization-path`
- **Story brief**: `plans/2026-10-25-iam-authorization-path-brief.md` (store copy linked above; copy into repo `plans/` with the first slice — not before Alejandro approves Gates 1–2)
- **Status**: approved — Gate 2 by Alejandro 2026-10-25
- **Story trunk**: `feat/iam-authorization-path` from `main` (H3 Gate 4 [#605](https://github.com/grant-js/grant/pull/605) is merged)
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

**Slug justification:** `iam-authorization-path` names the paid path (`AuthHandler.isAuthorized` → `Grant.isAuthorized` → `PermissionChecker` → `GrantService.getUserPermissions` + the permissions-namespace cache), not one tactic. H1–H3 used the same problem-shaped pattern (`iam-request-chassis`, `iam-request-composition`, `iam-scoped-id-lists`). `iam-authz-walk` would hide invalidation; `iam-permission-evaluation` matches the bench title but not the guard + cache.

## Active roles

Only list roles that will run for this story:

- [x] Project Manager
- [x] Principal Engineer
- [ ] Architect
- [x] Senior Backend
- [ ] Senior Frontend
- [x] Senior QA
- [x] Senior Security
- [x] Verifier

Architect stays off the roster unless a new `@grantjs/core` port or cache-adapter method appears. None expected if the walk stays behind `IGrantService.getUserPermissions` and invalidation stays on `ICacheAdapter.keys` / `delete` / a namespaced helper in `CacheHandler`.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Principal may collapse slices 2 and 3 into one PR if the combined diff stays reviewable. Keep them separate unless that collapse is explicit at slice-2 start. M5 reverse indexes and M2 per-slug OAuth are **not** required slices; add an index only if slice 1 EXPLAIN names it as required for the walk.

| #     | Branch                                   | Base                          | Concern                                        | Owner role | Review bar           | PR                                                 |
| ----- | ---------------------------------------- | ----------------------------- | ---------------------------------------------- | ---------- | -------------------- | -------------------------------------------------- |
| 1     | `feat/iam-authorization-path-measure`    | `feat/iam-authorization-path` | post-H1–H3 `is-authorized` bench + query shape | Backend    | light                | [#607](https://github.com/grant-js/grant/pull/607) |
| 2     | `feat/iam-authorization-path-walk`       | prior slice                   | cold-miss RBAC walk (fewer sequential queries) | Backend    | security-full        | [#608](https://github.com/grant-js/grant/pull/608) |
| 3     | `feat/iam-authorization-path-invalidate` | prior slice                   | stop global `permissions.clear()`              | Backend    | security-full        |                                                    |
| final | `feat/iam-authorization-path`            | `main`                        | integration                                    | Principal  | deep + security-full |                                                    |

Prefer layer order: **db → schema → api → web**. This story has no schema/web slices. Slice 1 is the existing authz bench + docs. Slices 2–3 are `apps/api` grant/auth handlers + `@grantjs/core` `PermissionChecker` / `Grant` (and `@grantjs/cache` only if invalidate needs an adapter helper). Optional db index only if PE names it after measure.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/iam-authorization-path main && git push -u origin feat/iam-authorization-path

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-25-iam-authorization-path-brief.md
#   plans/2026-10-25-iam-authorization-path-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/iam-authorization-path feat/iam-authorization-path-measure

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/iam-authorization-path <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/iam-authorization-path-walk
# later, unless 2+3 collapsed:
gh stack add feat/iam-authorization-path-invalidate

# After any merge, rebase or amend below a branch:
gh stack sync
```

Check positions **before** writing a slice, not after — the branch you are about to work on must sit on the current tip of the slice below it:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking) (repo path once this file lives in `plans/`). **`--base` is not optional on `link`**. `gh stack submit --auto` opens PRs as **drafts**. Mark ready with `gh pr ready <pr>` for gate 3.

Never skip husky (`--no-verify`, `HUSKY=0`). Open PRs as `grantjs-agent` via `GRANTJS_AGENT_TOKEN` / `gh`. Agents never self-merge.

## Slice notes

### 1 — Measure (is diagnosis H4 still true after H1–H3?)

- Owner files: `docs/benchmarks/report.md`, `scripts/benchmarks/permission-evaluation.mjs`. Last committed snapshot is **2026-10-24** / `f3abf2ef` on the H1 trunk (seed catalog 68 permissions / 2 users; cold Project.Query p95 32 ms; warm 8 ms; 146 checks/s). Diagnosis H4 still cites the **2026-07-20** CDM snapshot. Neither run is post-#600 / #605 `main`.
- Today: no committed query-count for a cold miss on current `main`. Do not invent p50/p95/p99. Keep published targets (cold p95 &lt; 50 ms, warm p95 &lt; 15 ms). Rate limit must be off or raised for the published series — same note already in the report; do not leave `SECURITY_ENABLE_RATE_LIMIT=false` as a product change.
- Outcome: re-run `pnpm benchmark:authz` against a local API on current `main`. Update the report (date, SHA, environment, results, previous-snapshot pointer). Add a short observed cold-miss query list (which `GrantRepository` methods ran, in what order, wall time). Existing bench + unit/integration only. No new k6/Artillery.
- If EXPLAIN names a missing reverse index from diagnosis M5 as blocking the walk, PE may add an optional follow-on (`feat/iam-authorization-path-indexes`) — not a required row above.
- Light review. Security is not required unless this slice ships production code.
- **UX:** no web files.

### 2 — Walk (cold-miss RBAC, fewer sequential queries)

- Owner files: `apps/api/src/services/grant.service.ts` (`getUserPermissions`), `apps/api/src/repositories/grant.repository.ts` (`getUserRoleIdsInScope`, `getGroupIdsForRoles`, `getDirectGroupIdsForUser`, `getPermissionIdsForGroups`, `getDirectPermissionIdsForRoles`, `getDirectPermissionIdsForUser`, `getPermissionsByIds`), `packages/@grantjs/core/src/core/permission-checker.ts` (`check`, `getRoleGroupCombinations`), `packages/@grantjs/core/src/core/grant.ts` (`isAuthorized` order: authenticate → project-app scope cap → `PermissionChecker`), `apps/api/src/services/auth.service.ts`, `apps/api/src/handlers/auth.handler.ts` (`isAuthorized` result cache). Tests: `packages/@grantjs/core/src/core/grant.test.ts`, `permission-checker.test.ts`, e2e `is-authorized` cases in `apps/api/tests/e2e/flows.e2e.test.ts` and `apps/api/tests/e2e/scenarios/project-sync-replace-teardown.e2e.test.ts`.
- Today (still true on `main` after H1–H3 unless slice 1 records otherwise): `getUserPermissions` awaits role ids, then role-groups, then direct user-groups, then group-permissions, then role-permissions, then user-permissions, then `getPermissionsByIds`. Conditional grants add `getUser` + `getUserRoles` + `getUserGroups` (those two re-enter `getUserRoleIdsInScope`) and a role×group cartesian. Cache sits on `AuthHandler.isAuthorized`, not inside `Grant`. Deny is as expensive as allow (report interpretation).
- Outcome: same four source unions and the same allow/deny / reason codes. Fewer sequential round-trips on a miss (parallel independent queries and/or fewer SQL statements — Backend/PE choice inside this slice). Unconditional grant still wins over conditional. Project-app empty/missing scopes still fail closed before `getUserPermissions`. API-key / project-app still use project roles only. Do not skip `grant.authenticate`.
- Keep H1 hold, H2 composition, H3 list paging. Do not set `SECURITY_ENABLE_RATE_LIMIT=false`. Do not raise `DB_POOL_MAX`. Do not set `SECURITY_ENABLE_RLS=false`.
- Do not add a new `@grantjs/core` port unless a batched `getUserPermissions` shape is the chosen design; if one appears, activate Architect then.
- M2 (`getGrantedScopeSlugs` N × this walk) stays out unless PE can fold “one walk, many slugs” into this slice without growing the diff past reviewable. Record the skip or fold at slice-2 start.
- **Slice-2 start (2026-10-25):** M2 skipped — folding would drop/relocate the action+resource filter or add a batched port (Architect). Slices 2 and 3 stay separate. No M5 index (slice 1 EXPLAIN did not name one). Walk is parallel waves behind existing `IGrantService.getUserPermissions` (see `plans/2026-10-25-iam-authorization-path-slice-2.md`).
- **E2e lock:** allow/deny on `POST /api/auth/is-authorized` in the e2e suite is the contract. Adapt the walk to those tests. Do not weaken e2e to match a new query shape.
- Tests: existing grant / permission-checker / account-less / project-app fail-closed stay green; add a unit assertion that a miss does not require the old sequential chain as the only legal shape (query count or equivalent). Security-full review (independent Security, not the author).
- **UX:** no web files.

### 3 — Invalidate (tenant-scoped, not global)

- Owner files: `apps/api/src/handlers/base/cache-handler.ts` (`invalidatePermissionsCacheForAllScopes` → `cache.permissions.clear()`; `getAuthorizationCacheKey` / `auth:result:{userId}:{tenant}:{scopeId}:…`; `invalidateAuthorizationResultsForUser`), callers in `roles.handler.ts`, `groups.handler.ts`, `permissions.handler.ts`, `users.handler.ts`, `packages/@grantjs/cache/src/redis/index.ts` (`clear()` is SCAN + batched DEL of the **namespace**), `apps/api/tests/unit/handlers/base/cache-handler.mutations.test.ts` (today asserts the whole namespace is empty). #579 made delete/assign/revoke invalidate — keep that correctness; narrow the radius.
- Today: any of those IAM writes flushes **all** tenants’ allow/deny results. Per-user invalidation already prefix-deletes `auth:result:{userId}:*`. Redis `keys()` / `clear()` are SCAN-based (good) but still O(keyspace) on a global flush ([diagnosis H4](./2026-10-24-iam-performance-diagnosis.md), L3).
- Outcome: a write in tenant A does not drop tenant B’s cache. Flushing every user **in tenant A** is acceptable if a tighter user-set cannot be proven fail-closed. A stale allow is a security bug; a stale deny is only a performance miss. Key-shape may need a tenant-first (or delimiter-anchored) segment because userId is currently first — one-time full miss after deploy is fine. Do not copy the signing-keys unanchored prefix (`organization:org-1*` matching `org-10`).
- Do not skip invalidate on delete/assign/revoke to “make it faster.” #579’s contract stays: IAM writes that change effective permissions must miss the next check.
- Tests: tenant A write leaves tenant B’s cached allow intact; tenant A’s next check is a miss (or a correctly recomputed result); existing cascade tests that only require “permissions cache cleared before delete” stay ordered-correct. Update the unit that requires `store.size === 0` after `invalidatePermissionsCacheForAllScopes` — that test encodes the blast radius this slice removes. E2e `is-authorized` outcomes stay. Security-full review (independent Security).
- **UX:** no web files.

## Dependencies / notes

- Slice 1 before 2 so `main` has a written after-H1–H3 picture. Slice 1 must not invent an H4 p95. Published targets stay the ones already in `docs/benchmarks/report.md`.
- Slice 2 before 3 because invalidation is about who must re-pay the walk. Fan-out is the independent Security pass on slices 2 and 3 — schedule it before gate 3, not as part of gate 4 ([Agentic SDLC § Fan-out](../docs/contributing/agentic-sdlc.md#fan-out-parallelism)).
- H1/H2/H3 stay out (already on `main`). M1/M2/M8 stay out. NIST/OIDC stay queued. Next stories after Gate 4, not extra slices here.
- End-to-end tests lock expected API behavior. Implementation adapts to those tests; never the reverse.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1) **after** Alejandro approves Gates 1–2.
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-10-25.
- [ ] Gate 3: Stack PRs merged into trunk (light on 1; security-full on 2 and 3).
- [ ] Gate 4: Story → `main` deep + security-full — not open.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
