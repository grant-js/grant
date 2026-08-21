# Story brief — AWS-native cache and job adapters

## Metadata

- **Slug**: `aws-adapters`
- **Date**: 2026-08-21
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: `approved` — gate 1 cleared 2026-08-21, Ale Heredia
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **A** of three
- **Base**: `main` at `0592720c`

## Objective

Add AWS-native strategies for the two ports that currently require Redis —
`ICacheAdapter` and `IJobAdapter` — as additional, configuration-selected options
alongside the existing `memory`, `redis`, `node-cron`, and `bullmq` strategies.

**This story deploys nothing to AWS.** It is verifiable end-to-end on the current
K8s deployment and in existing CI, and is independently valuable: a DynamoDB-backed
cache is a legitimate option for any operator who prefers it, Lambda or not.

## Why this is first

The adapters are the two hardest pieces of the AWS target and the only ones testable
against a working reference implementation. Building them alongside the Lambda
runtime means debugging two unknowns at once, and it is never clear which is at
fault. See the program brief, § Stories.

## Acceptance criteria

- [ ] A shared `ICacheAdapter` **conformance suite** exists and passes against the
      existing `InMemoryCacheAdapter` and `RedisCacheAdapter` **before** any new
      adapter is written. It executes every guarantee in § Behavior guarantees.
- [ ] Local AWS emulation (LocalStack) runs in the dev and CI compose stacks,
      covering DynamoDB, SQS, and EventBridge.
- [ ] `DynamoDbCacheAdapter` in `@grantjs/cache` implements `ICacheAdapter` and
      passes the conformance suite unmodified.
- [ ] `CacheFactory` accepts a `'dynamodb'` strategy; `CACHE_STRATEGY` is widened in
      `@grantjs/env`. The twelve per-entity namespaces (`cache/src/factory.ts`) map
      onto the DynamoDB table design.
- [ ] `AwsJobAdapter` in `@grantjs/jobs` implements `IJobAdapter`: `schedule()`
      registers a handler, `enqueue()` sends to SQS, `trigger()` dispatches by job id.
- [ ] `JobFactory` accepts an `'aws'` provider; `JOBS_PROVIDER` is widened.
      `@aws-sdk/client-*` follow the **optional peerDependency** pattern already used
      by `node-cron` and `bullmq` (`jobs/package.json`).
- [ ] The `IJobAdapter.schedule()` semantic difference across providers is documented
      **on the port**, not only in the adapter.
- [ ] `@grantjs/cache` and `@grantjs/jobs` keep their existing ESLint DAG entries —
      neither gains a workspace dependency beyond what its block already allows.
- [ ] **With no configuration changed, behavior is identical to `main`.**

## Behavior guarantees — DynamoDB cache adapter

The adapter must be a drop-in for `RedisCacheAdapter`. Non-obvious obligations:

1. **TTL semantics.** Redis `SETEX` expires precisely; DynamoDB TTL is lazy
   (deletion up to 48h late). Store an `expiresAt` epoch attribute, **filter on it
   at read time** in `get()` and `has()`, _and_ register it as the DynamoDB TTL
   attribute for storage reclamation. Read behavior is then exactly equivalent;
   only uncollected garbage differs.
2. **The Set-coercion heuristic is load-bearing and must be reproduced exactly.**
   `RedisCacheAdapter.get()` returns a `Set` whenever the parsed JSON is an array of
   all-strings (`cache/src/redis/index.ts:66-70`). `oauth-state.service.ts:133`
   depends on this via `cachedValue.size`. Reproduce it quirk-for-quirk; do **not**
   "fix" it in this story.
3. **`keys(pattern)` narrows to trailing-`*` only.** Verified sufficient for all four
   current callers (`cache-handler.ts:656,670`, `project-import.service.ts:194`,
   `oauth-state.service.ts:130`) and maps to a `Query` with `begins_with`. The
   adapter must **fail loudly** on an infix glob rather than silently return wrong
   results, and the narrowed contract must be documented on the port.
4. **`clear()`** (used only for `permissions`, `cache-handler.ts:592`) becomes
   Query-by-namespace + `BatchWriteItem`.
5. **Rate limiting is already a non-atomic read-modify-write**
   (`rate-limit.middleware.ts:checkLimit` does `get` then `set`) and is therefore
   already racy across the current two replicas. DynamoDB must **match** this, not
   regress it. Making it atomic via `UpdateItem ... ADD` is a real improvement but
   is explicitly a **non-goal** — it is a behavior change, not a port.

## Non-goals

- Any Lambda entrypoint, CDK, CloudFormation, or AWS deployment. Phases B and C.
- Removing, deprecating, or altering `RedisCacheAdapter`, `BullMQJobAdapter`,
  `NodeCronJobAdapter`, the Helm chart, or the K8s path.
- Porting BullMQ to DynamoDB. **Not possible** — BullMQ is Redis-native (Lua, sorted
  sets, blocking pops) and consumes `config.jobs.redis` directly rather than
  `ICacheAdapter`. It remains the K8s job provider.
- Making rate limiting atomic (guarantee 5).
- Narrowing the known over-invalidation in `invalidateSigningKeysCacheForScope`
  (`cache-handler.ts:663-670`) — characterized as current behavior.

## Risk flags

- [x] **API keys / tokens** — the `apiKeys` and `signingKeys` cache namespaces gain a
      new backend
- [x] **Permissions / RBAC** — `invalidateAuthorizationResultsForUser`
      (`cache-handler.ts:654`) must remain globally visible under the new adapter;
      a cache that silently fails to invalidate is a privilege-retention bug
- [x] **Tenancy** — `AwsJobAdapter.enqueue()` carries `scope` in the SQS payload;
      `validateTenantJobContext` must still hold on the receive side
- [x] Auth / sessions — the `oauth` namespace and rate-limit buckets move backends
- [ ] GDPR export / deletion / PII

→ **`security-full`** on the DynamoDB adapter and jobs adapter slices.

## Suggested active roles

- **Senior QA — load-bearing.** Owns the conformance suite, which is this story's
  primary artifact and the acceptance oracle for everything after it.
- **Senior Backend** — adapters, factories, env widening
- **Senior Security** — blocking, independent of the slice author
- **Architect** — the `IJobAdapter.schedule()` semantic change only
- **Principal Engineer**, **PM**, **Verifier**

## Human gate

- [x] Gate 1: **Story brief approved** — 2026-08-21, Ale Heredia.
