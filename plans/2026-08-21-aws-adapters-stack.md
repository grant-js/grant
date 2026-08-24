# Stack plan — AWS-native cache and job adapters

## Metadata

- **Slug**: `aws-adapters`
- **Story brief**: [`2026-08-21-aws-adapters-brief.md`](./2026-08-21-aws-adapters-brief.md) — approved 2026-08-21, Ale Heredia
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **A** of three
- **Status**: `merged-to-main` — four slices merged into the trunk (#305, #306, #309,
  #311), then the trunk merged to `main` as [#313](https://github.com/grant-js/grant/pull/313)
  (`39151c33`, 2026-08-24). Gates 3 and 4 both cleared.
- **GitHub stack**: [#307](https://github.com/grant-js/grant/stacks/307)
- **Story trunk**: `feat/aws-adapters`
- **Base**: `main` at `0592720c` (pass 7 close-out, #303)
- **worktree_path**: **not required** — `git worktree list` shows only the main
  checkout and no other story is in flight.

## Governing constraint

Every slice is **additive and configuration-selected**. The Verifier step common to
all four: **with no configuration changed, behavior is identical to `main`.** A slice
that cannot demonstrate that has failed regardless of what else it achieves.

## Active roles

- [x] Project Manager — gate decisions
- [x] Principal Engineer — slice order, integration
- [x] **Senior QA — slice 1, the load-bearing role in this story**
- [x] Senior Backend — slices 2, 3, 4
- [x] Senior Security — slices 3 and 4, blocking, independent of the slice author
- [x] Architect — slice 4 only (the `IJobAdapter.schedule()` semantic change)
- [x] Verifier — after every slice
- [ ] Senior Frontend — not active; this story touches no web code

## Ordered slices (PRs)

| #     | Branch                                | Base    | Concern                                                         | Owner        | Review bar        | PR   |
| ----- | ------------------------------------- | ------- | --------------------------------------------------------------- | ------------ | ----------------- | ---- |
| 1     | `feat/aws-adapters-cache-conformance` | trunk   | **Acceptance oracle.** Shared `ICacheAdapter` conformance suite | **QA**       | light             | #305 |
| 2     | `feat/aws-adapters-localstack`        | slice 1 | LocalStack + adapter integration lane, in the **e2e** stack¹    | Backend      | light             | #306 |
| 3     | `feat/aws-adapters-cache-dynamodb`    | slice 2 | `DynamoDbCacheAdapter` + `'dynamodb'` strategy                  | Backend      | **security-full** | #309 |
| 4     | `feat/aws-adapters-jobs-aws`          | slice 3 | `AwsJobAdapter` + `'aws'` provider; port semantics documented   | Backend+Arch | **security-full** | #311 |
| final | `feat/aws-adapters`                   | `main`  | integration                                                     | Principal    | **deep**          |      |

¹ Slice 2 shipped a different shape than planned — see [Deviations from plan](#deviations-from-plan).

## Ordering rationale

Driven by **what verifies what**. The default db→schema→api→web order does not apply
to a story whose slices are all adapters and test harness.

**Slice 1 before everything, and this is the plan's most important edge.** The
conformance suite is the acceptance oracle for slice 3. Written _after_ or
_alongside_ the adapter, the suite bends to whatever the implementation happens to
do — including its bugs. Written first and proven green against the existing
`memory` and `redis` adapters, it is an independent statement of what
`ICacheAdapter` means, and slice 3 either passes it or does not.

Slice 1 is where the brief's behavior-guarantee list becomes executable: TTL
read-filtering, the load-bearing Set-coercion heuristic (`cache/src/redis/index.ts:66-70`,
depended on by `oauth-state.service.ts:133`), trailing-`*`-only `keys()`, and
namespace-scoped `clear()`. Each gets a test that **currently passes against Redis**.
A guarantee that cannot be expressed as a passing test against the existing adapter
is not a guarantee, and should be struck from the brief rather than carried forward
as prose.

Slice 1 adds no behavior and should be mergeable on its own merits even if this
story is abandoned.

**Slice 2 before slice 3 — widening the harness before the work.** This follows the
repo's own precedent that a gate or tool comes before the change it judges
(`docs/contributing/code-quality/README.md:199`). Here the "gate" is the test
harness: no compose file in the repo (`docker-compose.yml`, `.e2e.yml`, `.demo.yml`)
contains LocalStack or DynamoDB Local, so without slice 2 the conformance suite
covers two of three adapters and the new one is verified by hand. **LocalStack
rather than DynamoDB Local** because slice 4 needs SQS and EventBridge from the same
harness — one service, both adapters.

**Slice 3 before slice 4** because both widen a factory and an env enum in the same
style. Doing the cache first establishes the pattern the jobs adapter follows, and
any disagreement about that pattern surfaces on the smaller, more constrained change.
Slice 4 is also the one carrying an Architect dependency; if the port question
reopens, it does so with slice 3 already merged rather than blocking the story.

## Dependencies and notes

- **Slice 4 changes what `IJobAdapter.schedule()` means** across providers:
  create-a-cron under `node-cron`/`bullmq`, register-a-handler under `aws`, where
  the schedule lives in EventBridge. `trigger(jobId)` already exists on the port and
  is very nearly the dispatch entry point the worker needs. If the Architect rejects
  overloading `schedule()`, slice 4 splits into a port change plus an adapter.
- `@aws-sdk/client-*` deps must follow the **optional peerDependency** pattern in
  `jobs/package.json` (`peerDependenciesMeta`, as `node-cron` and `bullmq` do), so
  no operator installs AWS SDKs to run on Redis.
- Neither `@grantjs/cache` nor `@grantjs/jobs` may gain a workspace dependency beyond
  what its existing `eslint.config.mjs` block allows. `jobs` is the one adapter also
  permitted `@grantjs/schema`; `cache` is `core`-only.
- **Nothing in this story is AWS-deployable.** That is expected. Do not add a Lambda
  handler, CDK, or a Dockerfile stage here — phases B and C.

## Deviations from plan

Recorded rather than quietly absorbed.

1. **Slice 2 changed shape entirely.** Planned as "LocalStack in dev + CI compose",
   implemented first as a parallel `docker-compose.test-services.yml` with its own
   CI bring-up/tear-down stages. That was wrong: infrastructure-dependent tests
   belong in the lane this repo already has for them. `apps/api/vitest.config.ts`
   excludes only `tests/e2e/**`, so unit _and_ integration tiers run under
   `pnpm test`, and that integration tier mocks infrastructure throughout. The
   parallel stack was reverted and the work landed as an integration lane served by
   the existing e2e stack. **Net pipeline change: `package.json` +1 line,
   `scripts/e2e.sh` +8/-2, `.github/workflows/ci.yml` untouched.**
2. **Slice 4's port change was smaller than budgeted.** The plan allowed for slice 4
   splitting into a port change plus an adapter if overloading `schedule()` was
   rejected. It was not needed: `trigger()` gained one optional parameter, which
   TypeScript treats existing one-parameter implementations as satisfying, so
   node-cron and BullMQ were untouched. The rest was documentation on the port.
3. **Slice 3 required a step the plan did not anticipate.** Every job/cache factory
   imports its providers eagerly, so `apps/api` — the composition root — must declare
   the concrete SDK for any provider it can select. Omitting it broke the e2e API
   container with `ERR_MODULE_NOT_FOUND` before a strategy was ever chosen. Applied
   pre-emptively in slice 4.
4. **Plan risk 2 (no local AWS emulation) resolved**; LocalStack joined
   `docker-compose.e2e.yml`.
5. **Plan risk 3 (concurrent CI jobs colliding on fixed ports) was not real.** The
   repository has exactly one registered self-hosted runner, which executes one job
   at a time. The failure that did occur was CI colliding with the _development_
   stack on the shared host, fixed by port separation.

## Stack setup

```sh
git switch -c feat/aws-adapters main && git push -u origin feat/aws-adapters

gh stack init --base feat/aws-adapters feat/aws-adapters-cache-conformance

# After each slice: commit, then BOTH, every time.
gh stack submit --auto
gh stack link --base feat/aws-adapters <pr> <pr>   # bottom to top

# Before the NEXT slice:
gh stack add feat/aws-adapters-localstack
```

Check positions **before** writing a slice:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

`--base` is not optional on `init` or `link`; omitted, the bottom PR re-points at
`main` and the stack merges past gate 4.

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking)
before running any of these — it carries three traps this condensed block omits:
`submit` without `--auto` hangs on an invisible interactive editor with no error;
`submit --auto` alone exits 0 having created **no stack** when the PRs already exist;
and `gh stack link` is the only non-interactive way to create or grow one. The
per-slice `gh stack add` above is deliberate — see
[§ init-consequences](../docs/contributing/agentic-sdlc.md#init-consequences) for why
declaring every branch at `init` strands later slices while reporting success.

## Human gates

- [x] Gate 1: **Story brief approved** — 2026-08-21, Ale Heredia.
- [x] Gate 2: **Stack plan approved** — 2026-08-21, Ale Heredia. Implementation unblocked.
- [x] Gate 3: **Stack PRs merged into trunk** — 2026-08-23, Ale Heredia. Trunk verified
      to contain all four slices (`30383a62`, `43318f11`, `1effd134`, `2acd4f02`), so the
      bottom-up merge trap in [Agentic SDLC § stacking](../docs/contributing/agentic-sdlc.md)
      did not bite.
- [x] Gate 4: **Story → `main` deep review complete** — 2026-08-24, Ale Heredia. Merged
      as #313 (squash), so the trunk is not an ancestor of `main`; content was verified
      present instead.

## Cleanup

- [x] Local slice branches deleted (all five, 2026-08-24)
- [x] Stack plan status → `merged-to-main`
- [ ] Remote slice branches — still on origin; not auto-deleted on merge
- [x] Phase B (`aws-lambda-runtime`) brief re-verified against the new `main` and
      submitted for its own gate 1 — approved 2026-08-24; stack plan drafted

### Post-merge verification

`main` gained [#315](https://github.com/grant-js/grant/pull/315) between this story's
last trunk update and its merge. That PR rewrote `RedisCacheAdapter.clear()` and
`keys()` to use `SCAN` instead of `KEYS`, so **the conformance suite from slice 1 and
the adapter change from #315 were never tested against each other before landing** —
each was green against a tree that did not contain the other.

Checked after the fact on `39151c33`: the integration lane passes, 48 cache and 7 jobs.

**One latent issue left open, not introduced by this story.** Redis `SCAN` may return
the same key more than once, and `scanFullKeys()` does not de-duplicate. The
conformance suite asserts exact key sets, so a duplicate would fail
`keys() with no pattern returns every key set` — non-deterministically, and only on a
keyspace large enough to span multiple `SCAN` iterations or resized mid-iteration.
Worth a `Set` in `scanFullKeys()`; belongs to whoever owns #315, not to this story.
