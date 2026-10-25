# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact.

Story brief: [2026-10-25-iam-scoped-id-lists-brief.md](./2026-10-25-iam-scoped-id-lists-brief.md). Diagnosis: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H3. Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md).

## Metadata

- **Slug**: `iam-scoped-id-lists`
- **Story brief**: `plans/2026-10-25-iam-scoped-id-lists-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved — Gate 2 by Alejandro 2026-10-25
- **Story trunk**: `feat/iam-scoped-id-lists` from `main` (H2 Gate 4 [#600](https://github.com/grant-js/grant/pull/600) is merged)
- **worktree_path**: not required unless another writer is on `main` / another story trunk in the same checkout

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

Architect stays off the roster unless a new `@grantjs/core` port appears (`IScopedIdProvider` already exists; a paged/windowed method is a port change). None expected if list paging stays behind the current `getScoped*Ids` / repository query surface.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Principal may collapse slices 2 and 3 into one PR if the combined diff stays reviewable, or drop slice 3 if slice 2 already keeps search / tags / explicit ids / sort on the full accessible set. Keep them separate unless that collapse is explicit at slice-2 start. Offset → keyset is **not** a required slice (M4 leftover); add it only if PE says the page-ID fix requires it.

| #     | Branch                             | Base                       | Concern                                          | Owner role | Review bar           | PR                                                 |
| ----- | ---------------------------------- | -------------------------- | ------------------------------------------------ | ---------- | -------------------- | -------------------------------------------------- |
| 1     | `feat/iam-scoped-id-lists-measure` | `feat/iam-scoped-id-lists` | list-page cost vs scoped-id set size (recipe)    | Backend    | light                | [#602](https://github.com/grant-js/grant/pull/602) |
| 2     | `feat/iam-scoped-id-lists-page`    | prior slice                | filter + sort + page, then hydrate               | Backend    | security-full        |                                                    |
| 3     | `feat/iam-scoped-id-lists-search`  | prior slice                | skipped — slice 2 SQL covers full accessible set | Backend    | security-full        | skipped                                            |
| final | `feat/iam-scoped-id-lists`         | `main`                     | integration                                      | Principal  | deep + security-full |                                                    |

Prefer layer order: **db → schema → api → web**. This story has no db/schema/web slices. Slice 1 is docs + existing unit/integration. Slices 2–3 are `apps/api` handlers / repositories (and `@grantjs/core` only if the scoped-id port grows).

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/iam-scoped-id-lists main && git push -u origin feat/iam-scoped-id-lists

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-25-iam-scoped-id-lists-brief.md
#   plans/2026-10-25-iam-scoped-id-lists-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/iam-scoped-id-lists feat/iam-scoped-id-lists-measure

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/iam-scoped-id-lists <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/iam-scoped-id-lists-page
# later, unless 2+3 collapsed:
gh stack add feat/iam-scoped-id-lists-search

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

### 1 — Measure (list-page cost vs ID-set size)

- Owner files: `docs/contributing/scoped-id-list-measure.md` (PE pick at slice start: contributing, not `docs/benchmarks/report.md`). That report is `POST /api/auth/is-authorized` only ([diagnosis measured](./2026-10-24-iam-performance-diagnosis.md)).
- Today: no committed list-page numbers. Diagnosis H3 is read-only; open questions explicitly say dashboard GraphQL p95 and scoped-id cache hit rate are unmeasured. Do not invent them.
- Outcome: on current `main`, measure one scoped list page (default `PAGINATION_DEFAULT_PAGE_SIZE` 50) at **1k** and **10k** scoped ids. Write the recipe (how to seed or stub the ID set, which handler/query, what to record: `IN` list length, `count(*)`, wall time, row count). Existing unit/integration only. No new k6/Artillery harness.
- Light review. Security is not required unless this slice ships production code (a test helper that never changes isolation is still light).
- **UX:** no web files.

### 2 — Page (filter + sort + page, then hydrate)

- Owner files: `apps/api/src/handlers/base/cache-handler.ts` (`resolveScopedIds`, `getScoped*Ids`, cache key `${scope.tenant}:${scope.id}`), `apps/api/src/handlers/users.handler.ts` (`getUsers`), sibling list handlers that call `getScoped*Ids` (groups, roles, permissions, tags, projects, resources, api-keys), `apps/api/src/repositories/common/EntityRepository.ts` (`query`: `IN` + `count(*)` + `ORDER BY` + `LIMIT/OFFSET`), `apps/api/src/repositories/common/PivotRepository.ts` (`query` has **no SQL LIMIT**), `apps/api/tests/unit/handlers/base/cache-handler.scoped-ids.test.ts`.
- Today: cache miss loads every org/project pivot id into a `Set`. Handlers then shrink that array with `tagIds`, explicit `ids`, and (project users) `filterUserIdsBySearchDocument`. The remainder goes to `EntityRepository.query`, which applies `IN (ids)` + optional ILIKE `search` + `orderBy(sort)` + `LIMIT/OFFSET` + `count(*)`, then hydrators load tags/counts for the page. Public GraphQL args are `scope`, `page`, `limit`, `search`, `sort`, `ids`, `tagIds` — no `filters` field. Repository `filters` exists and is unused by these handlers.
- Outcome: apply those same constraints **before** hydrating full objects. A 50-row page does not require the full accessible ID array in process or in the `IN` list. Sort of page N must match today’s SQL `ORDER BY` (default `defaultSortField` when `sort` is omitted). Blind `LIMIT` on unsorted IDs is out. `PivotRepository.query` applies SQL `LIMIT` when the caller asked for a page. Tenant isolation stays fail-closed. Cache still must not serve another tenant’s IDs; if the stored value becomes a page/window rather than the full set, invalidation (`addIdToCache` / `removeIdFromCache`) has to stay correct.
- Keep H1 hold and H2 composition. Do not skip `grant.authenticate`. Do not set `SECURITY_ENABLE_RATE_LIMIT=false`. Do not raise `DB_POOL_MAX`. Do not set `SECURITY_ENABLE_RLS=false`.
- Do not add a new `@grantjs/core` port unless a paged `IScopedIdProvider` method is the chosen shape; if one appears, activate Architect then.
- Offset → keyset stays out unless this slice cannot page IDs correctly on `LIMIT/OFFSET`. If PE names it required at slice start, add an optional follow-on (`feat/iam-scoped-id-lists-keyset`) — not a required row in the table above.
- Tests: isolation still fail-closed; a caller cannot see an out-of-scope ID; page of 50 does not materialize 1k/10k ids on the list path; existing scoped-id / list / pivot tests stay green. Security-full review (independent Security, not the author).
- **UX:** no web files.

### 3 — Search / tags / ids (full accessible set, not the page window)

- Owner files: `apps/api/src/services/user-tags.service.ts` / `apps/api/src/repositories/user-tags.repository.ts` (`getUserTagIntersection`), `apps/api/src/services/project-users.service.ts` / `apps/api/src/repositories/project-users.repository.ts` (`filterUserIdsBySearchDocument`), sibling tag intersections (e.g. `getGroupTagIntersection` in `groups.handler.ts`).
- Today: `tagIds` and project-user search shrink the full id list in the handler; org-scoped `search` and `sort` run later in SQL on that whole `IN` list. `ids` is an intersect (`intersectScopedIds`).
- Outcome: after slice 2, search, tags, and explicit `ids` still match against the caller’s full accessible set (or an equivalent SQL filter that cannot return an ID outside that set). Sort stays the entity `ORDER BY`. Paging 50 IDs first and then searching/sorting only those 50 is a product bug — do not ship that.
- **Skipped.** Slice 2 pushes search / tags / explicit ids / sort / page into the same SQL as the accessible-id subquery. PE records the collapse here at slice-2 start — do not cut `feat/iam-scoped-id-lists-search`.
- Tests: tagged/search/sorted page 1 matches today’s membership and order; a match that exists outside page 1 still appears; no out-of-scope ID in the result. Security-full if this slice changes who matches.
- **UX:** no web files.

## Dependencies / notes

- Slice 1 before 2 so `main` has a written before-picture. Slice 1 must not invent an H3 p95. `docs/benchmarks/report.md` is H4, not this story.
- Slice 2 before 3 because search / tags / explicit ids inherit whatever ID window (or SQL filter) slice 2 ships. Fan-out is the independent Security pass on slices 2 and 3 — schedule it before gate 3, not as part of gate 4 ([Agentic SDLC § Fan-out](../docs/contributing/agentic-sdlc.md#fan-out-parallelism)).
- H1/H2 stay out (already on `main`). H4 stays out. Next stories after Gate 4, not extra slices here.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1).
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-10-25.
- [ ] Gate 3: Stack PRs merged into trunk (light on 1; security-full on 2 and on 3 if it stays separate).
- [ ] Gate 4: Story → `main` deep + security-full — not open.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted
- [ ] Remote story trunk deleted
- [ ] Stack plan status → `merged-to-main`
