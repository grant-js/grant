# Program brief — CDM imports by reference, and sync routing

> **Convention note.** Same shape as
> [`2026-09-05-aws-followups-brief.md`](./2026-09-05-aws-followups-brief.md): a **program
> brief**, not a story. It carries shared context for a set of sibling slices so each one's
> PR can be short, and it is the index a reader consults to tell deliberate scope from
> oversight. It has no stack plan of its own; each slice is a plain PR against `main`.

## Metadata

- **Slug**: `cdm-by-reference-and-sync-routing`
- **Date**: 2026-10-14
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: open — Part A approved by Ale 2026-10-14 (scope corrected the same day: Part B
  is pending). Slice 1 is in review.
- **Base**: `main` at `3185a73d` (v1.14.2). Every `file:line` citation below re-verifies
  against this commit.
- **Decision record**: [`decisions/0009-cdm-import-by-reference.md`](../decisions/0009-cdm-import-by-reference.md)
  (Proposed). It reopens the deferral in
  [`2026-08-21-aws-lambda-runtime-measurements.md`](./2026-08-21-aws-lambda-runtime-measurements.md)
  § Finding 1 and closeout follow-on 11
  ([`2026-09-09-aws-followups-closeout-stack.md:1260`](./2026-09-09-aws-followups-closeout-stack.md)).
- **Predecessors**: [`2026-09-05-aws-followups-brief.md`](./2026-09-05-aws-followups-brief.md)
  (closed), [ADR 0002](../decisions/0002-long-running-cdm-sync-beyond-lambda.md),
  [ADR 0007](../decisions/0007-presigned-uploads-as-a-required-port-capability.md).

## Objective

**Part A:** let a CDM import be any size the adopter's runtime can apply, without changing
what an import does or breaking any current caller. **Part B (pending, below):** send each
import to the runtime that can finish it.

Today a CDM travels as one request body to the API, so its size is bounded by the edge
(Lambda's ~6 MiB invocation cap, the 5 MiB `API_JSON_BODY_LIMIT_BYTES` on the AWS target,
`defaults.ts:75-93`). An adopter on an API Gateway REST edge cannot use gzip at all (the
gateway returns 500 for a `Content-Encoding: gzip` JSON body) and was refused a 5.12 MiB
document with `413` that imports in 270 s in-process. Their ETL calls REST
`/api/projects/{id}/sync/jobs`, not GraphQL. The web dialog accepts 25 MiB and the server
10 MiB or 5 MiB. And ADR 0002's container runtime cannot be reached by the 12.16 MiB,
28,880-entity import it was built for. Size, not time, is the binding limit today. Part A
removes it, which makes duration the next limit, so slice 2 refuses what cannot finish in
the in-process ceiling instead of letting it run for 15 minutes first.

## Part A — the program

Ranked by **what it costs to be wrong**. A limit that fails with an opaque 500 costs more
than a missing optimisation.

| #     | Slice                                                                                                                                                                                                                                                                                  | Surface                             | Why it sits here                                                                                                                                                                                                                 |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **`download()` on the storage port, and ADR 0009.** The one `@grantjs/core` change; the decision record for the whole program.                                                                                                                                                         | core, storage adapters, docs        | Everything below needs the port to read bytes back. `@grantjs/core` is the deep-reviewed surface (ADR 0007's reasoning), so it lands first and alone.                                                                            |
| **2** | **Upload URL, by-reference start, migration, worker read, cleanup, entity cap and the CDK lifecycle rule,** on **REST and GraphQL**. `projects/<projectId>/imports/<uploadId>.json`, per-purpose policy, `getMetadata` check; a configurable max entity count refused at job creation. | api, database, schema, `deploy/aws` | The backend half of the decision. Carries the user-facing minor bump, the migration (`payload` is `NOT NULL`) and the security review of the unredacted-payload bar. REST is not optional: the reporting adopter's ETL calls it. |
| **3** | **Web import dialog via direct upload.**                                                                                                                                                                                                                                               | web                                 | Makes the 25 MiB the dialog already promises true. Frontend only, after 2 exists to call.                                                                                                                                        |
| **4** | **Documentation.** Deployment guide, file-storage and CDM import guides, ADR 0009 status to Accepted.                                                                                                                                                                                  | docs                                | Last, so it describes what shipped.                                                                                                                                                                                              |

Slice 2's entity cap needs a default and a reason. The adopter's 270 s for 2,192 entities is
about 123 ms per entity, so **about 7,000 entities is about 900 s**, the in-process
ceiling. Slice 2 re-derives it against ADR 0002's measurements before fixing it; adopters on
the container runtime raise or disable it.

## Part B — pending

**Deferred until the adopter's infrastructure discussion concludes. No Fargate work is
decided, and nothing here is scheduled.** Recorded so the scope is a choice, not an
oversight.

| #      | Slice                                                                                                                                                                                                                           | Why it waits                                                                                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **B1** | **`JOBS_SYNC_RUNTIME=auto`: route by entity count** (inline below a threshold, container above), with a bytes fallback. Thresholds configurable, defaults from measurement. Declare `@aws-sdk/client-ecs` as a real dependency. | ADR 0002's deferred size-based split. Whether the adopter runs a container runtime at all is the open question; the entity cap in slice 2 covers them until then. |
| **B2** | **A deadline on dispatch, and a reaper for abandoned `RUNNING`/`PENDING` rows,** plus a CDK ECS task-stopped rule.                                                                                                              | Closeout follow-on 13 (a job killed at its ceiling is stuck and unretryable). Its ECS half presupposes the same decision.                                         |

ADR 0009 does not decide either; it states that it does not.

## Shared constraints

Inherited from the AWS programs, and they bind every slice:

- **Additive and configuration-driven.** A reviewer must be able to check out any slice,
  change no configuration, and observe behaviour identical to `main`. The inline import
  path stays, and `JOBS_SYNC_RUNTIME` is untouched in Part A.
- **The port is required, not optional** (ADR 0007). `download` is implemented by every
  adapter, local included, and asserted by the shared conformance suite.
- **Tenancy is derived server-side.** An upload key is built from the validated project
  scope and a server-minted id; a client never supplies a path.
- **No widening of the unredacted-payload exposure.** The `/payload` endpoint already
  returns the stored document including BYOK `clientSecret`
  (`projects.routes.ts:236-245`). By-reference must not make that document readable by
  anyone, or from anywhere, it was not readable before; the exposure itself is a separate
  follow-on.
- **The single-transaction apply is untouched** (ADR 0002). Nothing here chunks or resumes
  an import.
- **The construct library is the contract** (ADR 0005). Lifecycle and task-stopped rules
  are constructs in `deploy/aws/lib`, off by nothing an adopter has to fork to avoid.
- **Evidence is a recorded deploy for anything past synth.** S3's enforcement of the URL
  constraints is unprovable in CI (LocalStack 3.8 does not verify SigV4; ADR 0007), so
  slice 2 records one.
- **Run what the repo runs, say which lanes ran.** Each PR body states the suites that
  actually executed locally and in CI.

## Non-goals

- **The batched apply path** (closeout follow-on 12): multi-row inserts and set-based
  existence resolution to cut the ~48 statements per entity. It is the only thing that makes
  the import itself fast, and it is a story of its own. By-reference (slice 2) is a bigger
  pipe, and Part B an escape valve, not that.
- Chunked or resumable imports, gzip support at the edge, multipart upload to the API, and
  raising `API_JSON_BODY_LIMIT_BYTES` (all rejected in ADR 0009 § Alternatives).
- Redacting `clientSecret` from the stored payload or the `/payload` endpoint.
- Re-opening ADR 0002's decision, and any container-runtime or Fargate work (Part B).
- Changing the Helm chart, docker-compose targets or the Redis/BullMQ/node-cron paths
  beyond the `imports/` prefix.

## Program-level risk flags

- [x] Auth / sessions: an upload URL is a bearer capability (ADR 0007); expiry is minutes.
- [x] API keys / tokens: the CDM can carry BYOK `clientSecret`; the object holding it is
      sensitive and short-lived by design.
- [x] Tenancy / RLS / org scoping: the key prefix is the tenancy boundary.
- [ ] Permissions / RBAC: reuses the existing `startProjectSync` authorization.
- [ ] GDPR export / deletion / PII: a CDM carries user identifiers; deletion at a terminal
      state is what keeps it from outliving the job.

Each slice re-states the subset that applies to it.

## Proposed order

1. **Slice 1**: `download` on the port, adapters, conformance suite, ADR 0009 (Proposed).
2. **Slice 2**: by-reference backend on REST and GraphQL, with the entity cap (user-facing
   minor bump).
3. **Slice 3**: web dialog via direct upload.
4. **Slice 4**: documentation, ADR 0009 to Accepted.

Part B is picked up, if at all, after the infrastructure discussion, with its own gate.

## Human gate

- [x] Part A approved by Ale, 2026-10-14; Part B deferred the same day.
- [ ] **Ale merges each slice after the review agent approves it.** No slice is merged by
      an agent, and the ADR moves from Proposed to Accepted in slice 4 by Ale's decision,
      not automatically.
