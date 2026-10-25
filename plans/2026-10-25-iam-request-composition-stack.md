# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact.

Story brief: [2026-10-25-iam-request-composition-brief.md](./2026-10-25-iam-request-composition-brief.md). Diagnosis: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H2. Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md).

## Metadata

- **Slug**: `iam-request-composition`
- **Story brief**: `plans/2026-10-25-iam-request-composition-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved — Gate 2 by Alejandro 2026-10-25
- **Story trunk**: `feat/iam-request-composition` from `main` (H1 Gate 4 [#593](https://github.com/grant-js/grant/pull/593) is merged)
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

Architect stays off the roster unless a new `@grantjs/core` port appears. None expected.

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

Principal may collapse slices 2 and 3 into one PR if the combined diff stays reviewable. Keep them separate unless that collapse is explicit at slice-2 start.

| #     | Branch                                | Base                           | Concern                             | Owner role | Review bar           | PR  |
| ----- | ------------------------------------- | ------------------------------ | ----------------------------------- | ---------- | -------------------- | --- |
| 1     | `feat/iam-request-composition-order`  | `feat/iam-request-composition` | IP/auth rate limit before context   | Backend    | security-full        |     |
| 2     | `feat/iam-request-composition-graph`  | prior slice                    | one toolbox (no RLS double graph)   | Backend    | security-full        |     |
| 3     | `feat/iam-request-composition-router` | prior slice                    | stop per-request `createRestRouter` | Backend    | light                |     |
| final | `feat/iam-request-composition`        | `main`                         | integration                         | Principal  | deep + security-full |     |

Prefer layer order: **db → schema → api → web**. This story has no db/schema/web slices. All slices are `apps/api` middleware / composition / REST mount.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/iam-request-composition main && git push -u origin feat/iam-request-composition

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-25-iam-request-composition-brief.md
#   plans/2026-10-25-iam-request-composition-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/iam-request-composition feat/iam-request-composition-order

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/iam-request-composition <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/iam-request-composition-graph
# later, unless 2+3 collapsed:
gh stack add feat/iam-request-composition-router

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

### 1 — Order (IP/auth limit before context)

- Owner files: `apps/api/src/create-app.ts` (today: `contextMiddleware` then `rateLimitMiddleware`, ~226–227 on `main` after #593), `apps/api/src/middleware/rate-limit.middleware.ts`, `apps/api/tests/unit/middleware/middleware-order.test.ts`, `apps/api/tests/unit/middleware/rate-limit.middleware.test.ts`.
- Today: `auth:` / `global:` are IP-keyed and do not need identity; optional `tenant:` reads `context.user.scope` after auth. GraphQL auth-sensitive ops share the REST `auth:` bucket via `isAuthSensitiveGraphqlRequest` (body already parsed — `jsonBodyParser` is before context). A 429 still paid JWT + the object graph ([diagnosis H2](./2026-10-24-iam-performance-diagnosis.md)).
- Outcome: IP `auth:` / `global:` run before context. Per-tenant bucket stays after authenticate. Origin verify stays first (existing relative-position test). Name any split middleware (context is currently an anonymous `async` function) so `middleware-order.test.ts` can assert origin &lt; IP/auth limit &lt; context &lt; tenant limit.
- Do not skip `grant.authenticate`. Do not set `SECURITY_ENABLE_RATE_LIMIT=false`. Do not change bucket keys or 429 shape.
- Tests: middleware order (relative, not absolute index); IP 429 does not construct the handler toolbox / does not enter the RLS rebuild; tenant 429 still requires scope after auth; existing auth-sensitive REST + GraphQL + `/health` skip tests stay green. Security-full review (independent Security, not the author).
- **UX:** no web files.

### 2 — Graph (one toolbox)

- Owner files: `apps/api/src/middleware/context.middleware.ts`. Composition root stays here (`AGENTS.md`: handlers / services / repositories are wired only in `context.middleware.ts` and `lib/app-context.lib.ts`). `app-context.lib.ts` is the job/system root — leave it unless a new port appears.
- Today: auth phase always `createRepositories(db)` + Grant + `authenticate`; RLS phase `createRepositories(tx)` + `createServices` + `createHandlers` again (~66 repositories, ~74 services, ~20 handlers — [diagnosis H2](./2026-10-24-iam-performance-diagnosis.md)). Unscoped / system / RLS-off builds services/handlers once on the pool db.
- Outcome: JWT + handler graph once per request. Thin unscoped Grant/signing-key bootstrap for `authenticate` is fine. Scoped queries still run on the RLS tx (`SET LOCAL`). `SECURITY_ENABLE_RLS` stays default true.
- Keep H1 hold: tx open until handler/`res.end()`; `holdResponseEndUntil` + `releaseTransactionThenAfterCommit` (`apps/api/src/lib/after-commit.lib.ts`). After-commit stays on `db` / `durableDb`. Do not redo H1. Do not raise `DB_POOL_MAX`.
- Rebind existing instances to the tx vs construct the full graph once after auth is a Backend/PE choice inside this slice. Do not add a new `@grantjs/core` port for it; if one appears, activate Architect then.
- Tests: isolation still fail-closed; existing context after-commit / durable-db tests stay green; optional composition-count assertion (factory calls once on a scoped request). Security-full review (independent Security).
- **UX:** no web files.

### 3 — Router (REST router once)

- Owner files: `apps/api/src/create-app.ts` (`app.use('/api', … createRestRouter(contextReq.context))`), `apps/api/src/rest/index.ts`, REST route factories that close over `RequestContext` (e.g. `createGroupsRouter(context)`).
- Today: every `/api` request allocates a new Express router and re-registers the route tree. GraphQL already reuses Apollo and reads `contextReq.context`. Skip this slice if slice 2 already removed the per-request mount.
- Outcome: one REST router (boot or first use), handlers still come from request context. Authorization and tenant scope on REST routes stay as they are.
- Tests: existing REST authz / scope tests stay green; optional assertion that `createRestRouter` is not called per request. Light review.
- **UX:** no web files.

## Dependencies / notes

- Slice 1 before 2 so 429s stop paying the graph before the graph is rebuilt. Slice 3 after 2 (or folded into 2) because REST routes close over the request context shape slice 2 owns.
- Slices run serially (2 needs 1’s order; 3 needs 2’s context). Fan-out is the independent Security pass on slices 1 and 2 — schedule it before gate 3, not as part of gate 4 ([Agentic SDLC § Fan-out](../docs/contributing/agentic-sdlc.md#fan-out-parallelism)).
- No H2 latency target. `docs/benchmarks/report.md` is `POST /api/auth/is-authorized` (H4), not composition.
- H3–H4 stay out. Next stories after Gate 4, not extra slices here.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1).
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.

## Human gates

- [x] Gate 2: Stack plan approved — Alejandro 2026-10-25. No further slices until this one is on the trunk.
- [ ] Gate 3: Stack PRs merged into trunk (security-full on 1 and 2; light on 3 if it stays separate).
- [ ] Gate 4: Story → `main` deep + security-full review complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
