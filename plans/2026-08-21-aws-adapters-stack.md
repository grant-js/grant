# Stack plan — AWS-native cache and job adapters

## Metadata

- **Slug**: `aws-adapters`
- **Story brief**: [`2026-08-21-aws-adapters-brief.md`](./2026-08-21-aws-adapters-brief.md) — approved 2026-08-21, Ale Heredia
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **A** of three
- **Status**: `approved` — gates 1 and 2 cleared 2026-08-21, Ale Heredia. No slice started.
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

| #     | Branch                                | Base    | Concern                                                         | Owner        | Review bar        | PR  |
| ----- | ------------------------------------- | ------- | --------------------------------------------------------------- | ------------ | ----------------- | --- |
| 1     | `feat/aws-adapters-cache-conformance` | trunk   | **Acceptance oracle.** Shared `ICacheAdapter` conformance suite | **QA**       | light             |     |
| 2     | `feat/aws-adapters-localstack`        | slice 1 | LocalStack in dev + CI compose (DynamoDB, SQS, EventBridge)     | Backend      | light             |     |
| 3     | `feat/aws-adapters-cache-dynamodb`    | slice 2 | `DynamoDbCacheAdapter` + `'dynamodb'` strategy                  | Backend      | **security-full** |     |
| 4     | `feat/aws-adapters-jobs-aws`          | slice 3 | `AwsJobAdapter` + `'aws'` provider; port semantics documented   | Backend+Arch | **security-full** |     |
| final | `feat/aws-adapters`                   | `main`  | integration                                                     | Principal    | **deep**          |     |

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
- [ ] Gate 3: Stack PRs merged into trunk (light / security-full as listed).
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
- [ ] Phase B (`aws-lambda-runtime`) brief re-verified against the new `main` and
      submitted for its own gate 1
