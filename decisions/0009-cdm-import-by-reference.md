# 0009 — CDM import payloads may travel by reference, through the presigned-upload port

- **Status**: Proposed
- **Date**: 2026-10-14
- **Context**: program "CDM imports by reference, and sync routing"
  (`plans/2026-10-14-cdm-by-reference-and-sync-routing-brief.md`), Part A, slice 1
- **Depends on**: [0002](./0002-long-running-cdm-sync-beyond-lambda.md),
  [0007](./0007-presigned-uploads-as-a-required-port-capability.md)
- **Reopens**: the deferral in `plans/2026-08-21-aws-lambda-runtime-measurements.md`
  § Finding 1 (line 87, "Gzip is sufficient. Payload-by-reference stays deferred") and
  closeout follow-on 11 (`plans/2026-09-09-aws-followups-closeout-stack.md:1260`). Neither
  record is edited; this one supersedes their conclusion for the CDM import payload only.

## Context

A CDM import today travels as one GraphQL variable (or one REST body) through the API
process: `startProjectSync` validates it (`projects.handler.ts:172`) and stores it whole in
`project_sync_jobs.payload`, a `jsonb NOT NULL` column
(`packages/@grantjs/database/src/schemas/project-sync-jobs.schema.ts:45`). The size of
what can be sent is therefore the size of what an HTTP request to the API can carry, and
three ceilings stack on top of each other.

**The Lambda invocation cap, and what it leaves.** The cap is about 6 MiB. Phase B
measured what that is in CDM terms: **5.32 MiB of raw CDM** for an uncompressed body, and
**19.76 MiB** for a gzipped one at the worst compression ratio, base64 included
(`plans/2026-08-21-aws-lambda-runtime-measurements.md:81-82`). Finding 1 concluded that
gzip makes by-reference unnecessary and deferred it.

**The AWS target then set its own, lower, limit.** `API_JSON_BODY_LIMIT_BYTES` is 5 MiB on
that target (`deploy/aws/lib/config/defaults.ts:75-93`), down from the 10 MiB
`@grantjs/env` default (`packages/@grantjs/env/src/schema.ts:31`), so the platform does not
advertise a ceiling the runtime cannot honour. `body-parser` applies the limit **after**
inflation, so a gzipped client is bounded by 5 MiB of _decompressed_ body. The comment at
`defaults.ts:86-92` records this as deliberate; it also means gzip no longer buys
headroom on this target, which is the premise Finding 1 rested on.

**A real adopter has now hit it, and gzip is not available to them at all.** Reported
2026-10-14 by Alteos, whose edge is API Gateway REST in front of a Lambda proxy:

- A `Content-Encoding: gzip` JSON body to `/graphql` returns **500 `INTERNAL_ERROR`**: the
  gateway does not treat `application/json` as binary, so the compressed bytes are not
  passed through intact. Finding 1's 19.76 MiB figure assumed a path that does not exist
  for this adopter.
- A production-shaped CDM of 2,192 entities is **5.12 MiB raw**, and was refused with
  `413` at 5,370,244 bytes against a limit of 5,242,880 (the request body is marginally
  larger than the document it carries).
- The same document imports **in 270 s in-process on Lambda**.

So for this adopter **size, not time, is the binding limit today**, and the tool Finding 1
named for size is unavailable. It also shows that bytes per entity vary by roughly 6x
between the measured profiles (about 0.4 KiB per entity for `enterprise`, 12.16 MiB over
28,880) and a real tenant (about 2.4 KiB per entity here), which is why neither size nor
entity count alone predicts the other.

**The web client promises more than the server accepts.** The import dialog accepts files
up to 25 MiB (`apps/web/components/features/project-sync-jobs/project-sync-job-start-dialog.tsx:29`);
the server accepts 10 MiB by default (`schema.ts:31`) and 5 MiB on AWS. A file between the
two parses fine in the browser, is posted, and comes back as a generic error toast.

**ADR 0002's escape hatch is out of reach of the documents it exists for.** Its reference
workload is the 28,880-entity import, **12.16 MiB** raw — 2.4x the AWS body limit and 2.3x
the uncompressed Lambda ceiling. The container runtime is built to run that import
(`jobs.sync.runtime = 'container'`, `apps/api/src/jobs/project-sync.job.ts:58`), but the
document cannot get to it. On AWS, by-reference is effectively a prerequisite for the
hatch, not an optimisation beside it.

**The pieces already exist.** [ADR 0007](./0007-presigned-uploads-as-a-required-port-capability.md)
gave every `IFileStorageService` a presigned PUT with an exact `contentLength` and a
`getMetadata()` that reads back what the store really holds. The sync container's task
role already has read/write on the uploads bucket
(`deploy/aws/lib/grant-platform.ts:599`). What is missing is the last step: **the port has
no way to read bytes back.** `packages/@grantjs/core/src/ports/storage.port.ts:63-135` has
`upload`, `getUploadUrl`, `delete`, `getUrl`, `exists`, `copy` and `getMetadata`, and no
`download`; `getUrl()` hands out a URL a client could fetch, which is not a thing a worker
should be doing with its own storage.

## Decision

**A CDM import payload may be sent by reference to an object the client uploaded itself,
through the ADR 0007 presigned PUT. The inline path is unchanged and stays the default.**

The flow, with each step's owner:

1. **Request an upload.** The client asks for an import upload for a project. The server
   authorizes it as it authorizes `startProjectSync` today, mints an `uploadId` of its own,
   **derives the key** `projects/<projectId>/imports/<uploadId>.json` from the validated
   project scope, and calls `getUploadUrl()` with a **per-purpose upload policy**:
   `application/json` only, a configured maximum size, and the short expiry already used for
   picture uploads (`config.storage.upload.urlExpirySeconds`). The existing policy is global
   and image-only (`apps/api/src/config/env.config.ts:752-758`); a CDM import is a different
   purpose with different limits, so the policy is selected by purpose rather than widened.
2. **The client PUTs the file** straight to the store. The bytes never pass through the
   API's request body, so neither the Lambda cap nor `API_JSON_BODY_LIMIT_BYTES` applies.
3. **Start the job by reference.** `startProjectSync` accepts the `uploadId` instead of an
   inline document. The server **re-derives the key** from the project and the `uploadId`
   — the client never supplies a path — and verifies with `getMetadata()` that an object
   is there and that its size is within the policy maximum. It records the reference on the
   job row instead of the document.
4. **The worker reads it** through a new required port method,
   `download(path): Promise<Buffer>` (slice 1 of this program), parses it, and validates
   it with **the same schema and the same `validateSyncInput` rules as the inline path**.
   Anything that is not valid CDM fails the job exactly as an invalid inline document does.
5. **The object is deleted when the job reaches a terminal state**, with a bucket lifecycle
   rule on the `imports/` prefix as the backstop for uploads that were never started.

Decisions inside that flow, and why:

- **`download` is required of every adapter, returns a `Buffer`, and throws
  `NotFoundError` for a missing object.** The reasoning is ADR 0007's: a capability the port
  promises and one adapter cannot honour makes ports leak, and the local adapter can read a
  file. `Buffer`, not a stream, because the only consumer parses the whole document before
  doing anything with it; a streaming variant can be added beside it without breaking a
  caller. `NotFoundError`, not `null`, because a method that returns bytes has no empty
  value, and unlike `delete()` a missing object is not an already-satisfied intent: a
  worker told to import something that is not there must fail, not import nothing.
- **Additive.** Existing documents, clients and deployments are untouched; an adopter
  changes nothing to keep today's behaviour. The shape of the GraphQL and REST contract
  (a sibling mutation versus an optional argument) is slice 2's to settle, under that one
  constraint.
- **Verification is at start and again in the worker.** `getMetadata()` at job creation
  gives a fast, user-facing refusal (missing, empty or oversize upload). It is not trusted
  as proof of content: ADR 0007 records that a presigned URL is replayable inside its
  window, so a holder may write _different bytes of the same length_ before expiry. The
  worker therefore treats what it downloads as untrusted input and validates it in full.
  The size bound holds regardless, because the URL committed to an exact length.

Two things this ADR deliberately does **not** decide, and states so it is not read as
having:

- **Routing big jobs to the container runtime.** ADR 0002 deferred a size-based split
  "until the measurement exists". The measurement exists (≈10,700 entities, ADR 0002 §
  The measurement), and by-reference removes the ingress obstacle, but _which_ jobs go
  where, and on what signal, is a separate decision with its own review surface. It is
  **Part B of the program, pending**: deferred until the adopter's infrastructure
  discussion concludes, and no Fargate work is decided by this ADR.
- **A deadline and a reaper for abandoned `RUNNING` rows.** Closeout follow-on 13 names
  the mechanism (a status commits in one transaction and the import in another, so a
  killed job is stuck). By-reference does not change it and does not fix it. Also Part B,
  pending.

## Alternatives considered

**Gzip the request** (Finding 1's answer). Rejected, on measurements rather than taste. It
is unavailable to the adopter who asked: an API Gateway REST edge does not treat
`application/json` as binary, and the gzipped request returned 500. Where it is available
it is bounded by the post-inflation limit, 5 MiB on AWS, so it buys the Lambda cap back
and nothing else. And it does not touch the web dialog's 25 MiB promise.

**Multipart upload to the API.** Rejected. The bytes still pass through the Lambda
invocation, so the same ~6 MiB cap applies; it would add a second ingestion path with its
own parser to be bounded and secured, to fix nothing.

**Raise `API_JSON_BODY_LIMIT_BYTES`.** Rejected: it is the dishonesty `defaults.ts:75-84`
exists to remove. Between 5.32 MiB and the configured limit the API would accept what the
runtime rejects at the edge, with no `413`, no domain error, no audit entry and nothing in
the request log. A limit above the runtime's is a promise nothing keeps.

**Chunked imports.** Rejected, for ADR 0002's reason: dividing the work means committing
partial imports, which abandons the single-transaction guarantee — a partially applied
permission model is a security outcome. By-reference moves the _bytes_ in one piece and
leaves the apply untouched.

**A client-supplied storage path, or a multi-purpose upload endpoint.** Rejected. A path
the client chooses in a presigned URL is a cross-tenant write
(`plans/2026-09-09-aws-followups-closeout-stack.md`, Part D, tenancy note at lines 755-756): the
key is derived server-side from the validated scope, always.

## Consequences

**Good.** The binding limit for the adopter that reported it moves from the gateway's body
size to the policy maximum, with no change to how the import applies. The 25 MiB the web
dialog already promises becomes true. ADR 0002's hatch becomes reachable by the documents
it was built for. The sync container already holds the bucket permissions it needs.

**Bad.** There are now two ways to start an import and the job row has two shapes. A job
whose payload is an object in a bucket has a life outside the database: it can be missing
when the worker runs (expired by lifecycle, deleted by hand), and an abandoned upload is
garbage nothing in the database knows about. The lifecycle rule covers S3; **the local
adapter has no lifecycle**, so slice 2 must say how abandoned local uploads are reclaimed
(the data-retention sweep is the obvious home) rather than leave them to accumulate.
`project_sync_jobs.payload` is `NOT NULL`, so slice 2 carries a migration.

**Once size is unlimited, duration becomes the limit, and slice 2 must say so up front.**
Today the body limit incidentally refuses documents too large to finish in time. By-reference
removes that accident: a document can now reach the in-process runtime that cannot finish
inside its ceiling, and it would fail only after running for 15 minutes, having used the
connection and the queue slot, with the work rolled back (ADR 0002). Slice 2 must therefore
**refuse such a document at job creation with a clear error**, using a configurable maximum
entity count. The default is derived from measurement: the adopter's 270 s for 2,192
entities is about 123 ms per entity, so **about 7,000 entities is about 900 s**, the
Lambda ceiling; slice 2 re-derives the number against ADR 0002's table before fixing it.
Adopters on the container runtime raise or disable the limit. This is a refusal, not
routing: choosing a runtime per job is Part B.

**Slice 2 must reach the REST surface, not only GraphQL.** The adopter's ETL starts imports
through REST `POST /api/projects/{id}/sync/jobs`, not GraphQL. The upload-URL request and
the by-reference `source` on the start body therefore ship on REST (with OpenAPI kept in
sync) in the same slice as on GraphQL; a by-reference path the reporting adopter cannot
call has not solved their problem.

**The unredacted-payload exposure must not widen, and is not fixed here.** The existing
`/payload` endpoint returns the stored document **unredacted**
(`apps/api/src/rest/routes/projects.routes.ts:236-245`), including bring-your-own API-key
`clientSecret` values (`UserApiKeyCdmInput.clientSecret`,
`packages/@grantjs/schema/src/schema/projects/inputs/sync-project-cdm.graphql:124`).
By-reference puts the same document in a bucket, so it needs the same or a stricter bar:

- the `imports/` prefix is never served publicly. On S3 that is bucket policy and no
  `public-read` ACL; **on the local adapter every file under `basePath` is served by
  `express.static` at `/storage` (`apps/api/src/create-app.ts:210`)**, so the prefix has
  to be excluded from that mount or kept outside `basePath`. Slice 2 owns this and tests it;
- the object is deleted at a terminal state, so the document does not outlive the job;
- the `/payload` endpoint for a by-reference job must not become a second route to a
  document nobody could read before. Whether it reads through `download` under the existing
  permission, or answers "gone" once the object is deleted, is slice 2's choice; either
  satisfies this bar and "a new way to read it" does not.

That endpoint's exposure of `clientSecret` is itself a separate follow-on (redaction, or
not storing the secret in the document). It is recorded here so it is not mistaken for part
of this decision.

**Notes for the security review.**

- **The key is derived, never accepted.** `projects/<projectId>/imports/<uploadId>.json`,
  from the validated project scope and a server-minted id. `download` applies the same path
  guards as `getUploadUrl` on both adapters (`..`, leading separator, empty and dot-prefixed
  segments), and the local adapter additionally refuses anything resolving outside
  `basePath`, so the signing key at `<basePath>/.grant-upload-key` cannot be read through
  it. Without the guard, `download` would be the first port method that returns the host's
  bytes.
- **`download` has no size limit of its own.** A caller that cannot afford an arbitrary
  object in memory reads `getMetadata()` first and refuses on `size`; the by-reference path
  does so at start and again before it parses.
- **One upload, one job.** Two jobs started from the same `uploadId`, or a job started
  after another consumed and deleted the object, must fail cleanly. Slice 2 enforces it
  (a unique index on the reference, or equivalent), not the port.
- **S3 enforcement is still unproven in CI.** LocalStack 3.8 does not verify SigV4 (ADR 0007
  § What CI can prove about enforcement is asymmetric), so the by-reference tests can show
  the round trip and the validation but not that S3 refuses an oversize PUT. Slice 2's
  recorded deploy is where that is demonstrated for this purpose.

**Program order.** This ADR, and the `download` port method, land first and alone because
`@grantjs/core` is the deep-reviewed surface (Part A, slice 1). Then: the upload-URL and
by-reference start on REST and GraphQL, with its migration, worker read, cleanup, entity
cap and CDK lifecycle rule (2); the web dialog uploading directly (3); documentation (4).
**Part B is pending**: `JOBS_SYNC_RUNTIME=auto` routing, and a deadline and reaper for
abandoned rows with its ECS task-stopped rule, wait on the adopter's infrastructure
discussion. The batched apply path (closeout follow-on 12) is out of scope for all of it.
