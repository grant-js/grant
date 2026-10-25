# Stack plan

Copy of Grant template `docs/contributing/templates/stack-plan.md`. Principal Engineer owns this artifact.

Story brief: [2026-10-24-iam-request-chassis-brief.md](./2026-10-24-iam-request-chassis-brief.md). Diagnosis: [IAM performance diagnosis](./2026-10-24-iam-performance-diagnosis.md) H1. Pictures: [IAM performance visual](./2026-10-24-iam-performance-visual.md).

## Metadata

- **Slug**: `iam-request-chassis`
- **Story brief**: `plans/2026-10-24-iam-request-chassis-brief.md` (store copy linked above; copy into repo `plans/` with the first slice)
- **Status**: approved — Gate 2 passed 2026-10-24 by Alejandro / in-progress
- **Story trunk**: `feat/iam-request-chassis`
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

## Ordered slices (PRs)

Init `gh stack` with **slice 1 only**. `gh stack add` the next branch when that slice starts — never declare the whole list up front.

| #     | Branch                             | Base                       | Concern                         | Owner role | Review bar           | PR                                                 |
| ----- | ---------------------------------- | -------------------------- | ------------------------------- | ---------- | -------------------- | -------------------------------------------------- |
| 1     | `feat/iam-request-chassis-measure` | `feat/iam-request-chassis` | authz bench + pool-watch recipe | Backend    | light                | [#590](https://github.com/grant-js/grant/pull/590) |
| 2     | `feat/iam-request-chassis-hold`    | prior slice                | RLS client back at COMMIT       | Backend    | security-full        | [#591](https://github.com/grant-js/grant/pull/591) |
| final | `feat/iam-request-chassis`         | `main`                     | integration                     | Principal  | deep + security-full |                                                    |

Prefer layer order: **db → schema → api → web**. This story has no db/schema/web slices. Measure is docs + committed bench. Hold is `apps/api` middleware / after-commit.

## Stack setup

Root the stack on the story trunk — never the default branch, or slices target `main` and skip gate 4:

```sh
# Trunk
git switch -c feat/iam-request-chassis main && git push -u origin feat/iam-request-chassis

# Copy store plans into repo if they are not there yet:
#   plans/2026-10-24-iam-request-chassis-brief.md
#   plans/2026-10-24-iam-request-chassis-stack.md

# Init with the FIRST slice branch only — never the whole list.
gh stack init --base feat/iam-request-chassis feat/iam-request-chassis-measure

# After each slice: commit, then BOTH of these, every time.
gh stack submit --auto
gh stack link --base feat/iam-request-chassis <pr> <pr>   # bottom to top

# Before the NEXT slice — creates the branch on the current tip and pushes nothing:
gh stack add feat/iam-request-chassis-hold

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

### 1 — Measure (M0)

- Re-run `pnpm benchmark:authz` against a local API on current `main`. Update `docs/benchmarks/report.md` (date, SHA, environment table, results). Keep cold p95 &lt; 50 ms and warm p95 &lt; 15 ms as the published targets.
- This bench is `POST /api/auth/is-authorized` (H4). Say that in the report. It is the before-picture, not an H1 proof.
- Add a short “how to watch the parking spot” note (pool checkout / `pg_stat_activity` while a scoped GraphQL/REST request is in flight). Docs only unless a one-line existing metric can be named. No new metrics platform.
- **UX:** no web files.

### 2 — Hold (H1)

- Owner files: `apps/api/src/middleware/context.middleware.ts`, `apps/api/src/lib/after-commit.lib.ts`, tests around context / after-commit, `docs/advanced-topics/transactions.md`.
- Today: RLS `db.transaction` stays open until `res` `finish`/`close`; `holdResponseEndUntil` then `releaseTransaction()` → COMMIT → `afterCommit.run()` → flush body. Lambda freeze is why enqueue is awaited before flush.
- Outcome: request transaction client is back in the pool at COMMIT; after-commit uses `db` / `durableDb`, not the request client. `SET LOCAL` tenant context still wraps every scoped query. Default RLS stays on.
- Do not “fix” H1 by raising `DB_POOL_MAX` or setting `SECURITY_ENABLE_RLS=false`.
- Do not flush a success that never COMMITed. Do not drop after-commit on Lambda unless the alternative is written down and tested.
- Tests: isolation still fail-closed; after-commit order; client not reused for after-commit. Security-full review.
- **UX:** no web files.

## Dependencies / notes

- Slice 1 before 2 so `main` has a published before-picture. Slice 2 may land without a new p95; we do not invent H1 latency targets.
- H2–H4 stay out. Next stories after Gate 4, not extra slices here.
- Copy this brief + stack into repo `plans/` on the trunk (or slice 1).
- Reviews as `grantjs-agent` COMMENT only. Alejandro APPROVE from `logusgraphics`.

## Human gates

- [x] Gate 2: Stack plan approved — 2026-10-24 by Alejandro.
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep + security-full complete.

## Cleanup

- [ ] `git worktree remove` (if used)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
