# 0002 — CDM sync jobs that exceed 15 minutes run off-Lambda

- **Status**: Accepted; **amended 2026-09-11** with the measurement it was waiting for
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

**What was not known, and now is.** When this ADR was written nobody had measured how
long a 28,880-entity import takes. The guess offered was "two minutes; it may be forty".
It is **62.3 minutes** — 415% of the ceiling. See _The measurement_ below.

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

**Phase C did not wire this, and said so** (phase C's F6: "program blocker 3 is wired —
the job runs — but not closed: the Fargate escape hatch is not"). It measured one point,
283 entities at 208.25 s, and declined to build a runtime on a single data point. The
measurement this ADR was waiting for landed in the AWS follow-ups closeout story, slice
12, and that story builds the hatch.

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

## The measurement — 2026-09-11

Four real imports through `ProjectImportService` against PostgreSQL, by
`pnpm --filter grant-api measure:cdm-import`. Full record and method in
`plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002.

|   Entities |    Duration | ms/entity | vs 15 min |
| ---------: | ----------: | --------: | --------: |
|        124 |      2.90 s |      23.4 |      0.3% |
|        620 |     18.22 s |      29.4 |      2.0% |
|      3,650 |    191.49 s |      52.5 |     21.3% |
| **28,880** | **3,738 s** | **129.4** |  **415%** |

**The answer is 62.3 minutes, and the ADR's premise holds — but not for the reason it
assumed.** It expected a long import. What it did not anticipate is that per-entity cost
_rises with scale_ — 5.5× across this range — so the ceiling is crossed far below 28,880.

**The size at which sync must leave Lambda: ≈10,700 entities.** That is the open
question's real answer, and it makes the "size-based split" in _Consequences_ specifiable
rather than speculative. Treat it as an order of magnitude, not a threshold: the four
points were taken in ascending order against a database that kept filling, so the exponent
is partly confounded by accumulated rows. A split built on this number should re-measure
per point on a fresh database first.

**The cause is structural, and it is not Lambda.** The import applies entities one at a
time through the single-entity service API, and every service call re-validates its
inputs: ~48 SQL statements per entity after slice 12's optimisation, ≈1.4 million for a
28,880-entity document, against tables that grow as the import proceeds. Statement latency
nearly doubles between 620 and 3,650 entities. That is the superlinearity.

**Which is why the hatch is still the right decision, on better grounds than originally
given.** Not "imports are slow" but: a 28,880-entity import is 4.15× over a wall no
configuration can raise, and the structural fix has a measured price. Slice 12 tried the
cheap version — `existsById`, one statement instead of two, −13% — and then bounded it:
even a _perfect_ memo eliminating every repeated lookup reaches 1.54×, leaving a 2.70×
gap. Reducing round trips per entity cannot close it. Only a batch apply path can, and
that is a story of its own (raised as a follow-on, with this profile as its brief).

So the hatch is an escape valve for a slow import, knowingly, rather than a fix for one.
Recorded that way so nobody later reads it as having made the import fast.

**Also learned: the hatch cannot exist on every topology.** A Fargate task needs a VPC,
and the bring-your-own-database vpcless shape has none. On that topology sync stays on
Lambda and stays bounded by 15 minutes, which is a documented limit of that shape rather
than a defect.
