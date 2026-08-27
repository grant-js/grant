# 0002 — CDM sync jobs that exceed 15 minutes run off-Lambda

- **Status**: Accepted
- **Date**: 2026-08-25
- **Context**: phase B of the AWS serverless target
  (`plans/2026-08-21-aws-lambda-runtime-brief.md`)
- **Depends on**: [0001](./0001-configuration-gated-database-bootstrap.md)

## Context

Lambda's maximum execution time is **15 minutes**, hard, with no extension. Most of
Grant's background work is comfortably inside it. CDM sync is not, and the reason is
structural rather than a matter of tuning.

**The scheduled sweeps are bounded by construction.** `event-relay`,
`webhook-delivery`, and `notification-delivery` each loop `for (i = 0; i < maxBatches; i++)`
(`jobs/event-relay.shared.ts:18`, `services/webhook-delivery.service.ts:176`,
`services/notification-delivery.service.ts:123`), draining a fixed number of batches
and leaving the rest for the next tick. They yield by design, so they fit any
runtime with a timeout. Nothing here applies to them.

**`ProjectSyncJob` is bounded by the tenant.** It carries no `maxBatches`. It
processes whatever the CDM document contains, in one execution, and the document is
as large as the tenant is. Slice 1 measured a plausible full-directory import at
**28,880 entities** across users, roles, groups, resources, and permissions.

**And it cannot be split, which is the decisive constraint.**
`ProjectImportService.applyProjectCdmImport(params, transaction)`
(`services/project-import.service.ts:255-268`) runs the entire import inside a
**single database transaction**, iterating every CDM handler within it. That is a
deliberate correctness property: a partially-applied permission model is a security
outcome, not merely an inconvenient one. A tenant left with roles created but grants
unlinked is a tenant with the wrong access.

A 15-minute cutoff mid-import is therefore _safe_ — the transaction rolls back and
no partial state survives — but the work is entirely lost, and a retry meets the same
wall. Retrying does not converge.

**What is not known.** Nobody has measured how long a 28,880-entity import actually
takes. It may be two minutes; it may be forty. This ADR decides what to do about
imports that exceed the ceiling; it does not claim to know which tenants do. See
_Open question_ below — that measurement should land before phase C wires anything.

## Decision

**Project sync execution is routed off Lambda to a container runtime, selected by
configuration. The transaction is not broken to fit the runtime.**

- The API — REST, GraphQL, enqueueing a sync job — runs on Lambda as phase B builds.
- `ProjectSyncJob` execution runs on a runtime without a 15-minute ceiling: an ECS or
  Fargate task, or a long-running worker container. The job envelope
  (`startProjectSync` / `startProjectExport`, the `project_sync_jobs` table, the
  polling API) is unchanged, and so is every public name.
- Which runtime executes it is configuration, in keeping with the program's guiding
  constraint. Existing deployments keep running the job in-process exactly as today.

Phase C wires this. Phase B only records the decision.

## Consequences

**Good.** The single-transaction guarantee survives untouched. No change to
`ProjectImportService`, no resumability protocol, no partially-applied imports. The
serverless target keeps its cost profile where the traffic actually is — the API —
while the one genuinely long-running workload sits on a runtime suited to it.

**Bad.** The AWS target is no longer purely serverless: it needs a container runtime
alongside Lambda, which is more infrastructure than "CloudFront + Lambda + S3"
implies. Fargate bills per task-second, so a tenant running frequent large imports
costs real money. The program brief's premise still holds — the motivation was
reducing _idle_ compute, and a task that runs only when a sync is enqueued is not
idle — but phase C should state the added surface rather than let it arrive as a
surprise.

**Neutral.** Small imports would fit comfortably on Lambda. Routing all of them to
the container runtime trades a little latency for one code path. A size-based split
is a later optimization, and it should not be built before the measurement below
exists.

## Alternatives considered

**Step Functions orchestrating chunked imports.** Rejected, and this is the one worth
explaining. Step Functions solves the duration problem cleanly — but only for work
that can be divided into independently committed steps. Here, dividing the work means
committing partial imports, which means abandoning the single-transaction guarantee
and inventing a resumability protocol with its own rollback semantics. That is a
redesign of the import's correctness model, dressed up as an infrastructure choice.
The duration limit is not a good enough reason to weaken a security-relevant
invariant.

**Cap CDM payload size so imports always fit.** Rejected: it makes the largest
tenants — exactly the ones with the strongest case for automated import — the ones
who cannot use the feature. Slice 1 also showed the ceiling would have to be a
_duration_ cap rather than a size cap, and duration is not knowable at ingress.

**Raise the Lambda timeout.** Not available. 15 minutes is a hard service limit.

**Provisioned concurrency / SnapStart to reduce startup overhead.** Irrelevant to
this decision — they address cold start, not execution duration. (SnapStart also does
not support Node.js.)

## Open question, owned by phase C

**How long does a 28,880-entity import take against RDS?** Until that is measured,
the size at which sync must leave Lambda is unknown, and so is whether a size-based
split would ever be worth building. Slice 1 built the fixtures that would make this
measurable — `apps/api/tests/helpers/cdm-scale-fixtures.ts` generates documents at
that scale, and `generateCdmAtScale` is deterministic, so a timing run is
reproducible. Measure before optimizing.
