# Stack plan — Lambda-capable API runtime

## Metadata

- **Slug**: `aws-lambda-runtime`
- **Story brief**: [`2026-08-21-aws-lambda-runtime-brief.md`](./2026-08-21-aws-lambda-runtime-brief.md) — approved 2026-08-24, Ale Heredia
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **B** of three
- **Status**: `in-progress` — gate 2 approved 2026-08-24; slice 1 open as #321
- **Story trunk**: `feat/aws-lambda-runtime`
- **Base**: `main` at `048341cb` (aws-adapters close-out, #318)
- **Measurements**: [`2026-08-21-aws-lambda-runtime-measurements.md`](./2026-08-21-aws-lambda-runtime-measurements.md) — slice 1 output
- **worktree_path**: **not required** — `git worktree list` shows only the main
  checkout and no other story is in flight. Revisit if phase C is drafted in parallel.

## Citation re-verification

The brief's gate-1 condition was that its `file:line` citations be re-checked if
`main` moved. It did (`39151c33` → `048341cb`, a docs-only commit). All re-verified
against `048341cb`:

| Citation                               | Status |
| -------------------------------------- | ------ |
| `server.ts:56` — `bootstrapDatabase()` | holds  |
| `config/env.config.ts:15` — `getEnv()` | holds  |
| `env/src/schema.ts:31` — body limit    | holds  |
| `release.yml:282` — GHCR-only base     | holds  |
| `apps/api/Dockerfile:88,95-96`         | holds  |
| `project-sync-jobs.schema.ts:45`       | holds  |
| `rls-context.ts:96` — `SET LOCAL ROLE` | holds  |

## Governing constraint

Inherited from the program brief and unchanged: **every slice is additive and
configuration-selected.** The Verifier step common to all seven — _with no
configuration changed, behavior is identical to `main`_ — is not a formality here.
Slice 2 is a refactor of the only entrypoint the platform has; slice 3 gates a call
that currently always runs. Either can regress every existing deployment while
looking clean in review. A slice that cannot demonstrate parity has failed regardless
of what else it achieves.

## Active roles

- [x] Project Manager — gate decisions
- [x] Principal Engineer — slice order, integration
- [x] **Senior QA — slice 1, the load-bearing role in this story** (as in phase A)
- [x] Senior Backend — slices 2, 4, 5, 6, 7
- [x] **Architect — slice 3** (two ADRs; also adjudicates any port change that surfaces)
- [x] Senior Security — **slice 5, blocking**, independent of the slice author
- [x] Verifier — after every slice
- [ ] Senior Frontend — not active; this story touches no web code

## Ordered slices (PRs)

| #     | Branch                               | Base    | Concern                                                        | Owner          | Review bar        | PR  |
| ----- | ------------------------------------ | ------- | -------------------------------------------------------------- | -------------- | ----------------- | --- |
| 1     | `feat/aws-lambda-runtime-oracle`     | trunk   | **Acceptance oracle.** Boot-parity snapshot + gzip measurement | **QA**         | light             |     |
| 2     | `feat/aws-lambda-runtime-create-app` | slice 1 | `create-app.ts` extraction — provable no-op                    | Backend        | light             |     |
| 3     | `feat/aws-lambda-runtime-bootstrap`  | slice 2 | `bootstrapDatabase()` gate, migrate/seed runner, **2 ADRs**    | Arch + Backend | light             |     |
| 4     | `feat/aws-lambda-runtime-handler`    | slice 3 | Lambda handler entrypoint + OTel force-flush                   | Backend        | light             |     |
| 5     | `feat/aws-lambda-runtime-secrets`    | slice 4 | Secrets Manager cold-start bootstrap + IAM DB auth             | Backend + Sec  | **security-full** |     |
| 6     | `feat/aws-lambda-runtime-image`      | slice 5 | `runner-lambda` Dockerfile stage, arch decision, ECR publish   | Backend        | light             |     |
| 7     | `feat/aws-lambda-runtime-emf`        | slice 6 | EMF telemetry strategy; `/metrics` untouched                   | Backend        | light             |     |
| final | `feat/aws-lambda-runtime`            | `main`  | integration                                                    | Principal      | **deep**          |     |

## Ordering rationale

The default db→schema→api→web order does not apply: this story touches no schema, no
database schema, and no web code. The order is driven by **what verifies what**, and
by keeping the security-full diff small.

**Slice 1 before everything — the phase A lesson, applied again.** Phase A's
strongest edge was writing the conformance suite before the adapter it judged, so the
suite was an independent statement of the contract rather than a description of the
implementation's bugs. The same argument holds twice here:

- The brief requires slice 2 be a **provable** no-op, "demonstrated by comparing boot
  behavior and an e2e run, not by reading the diff." A boot-parity snapshot written
  _after_ the extraction records whatever the extraction produced. Written first and
  proven green against today's `server.ts`, it is an independent statement of what
  booting means: mounted route table and order, middleware chain and order, the
  effective config summary, and the set of env keys actually read.
- The brief says of the gzip mitigation: **"the mitigation rests entirely on a number
  nobody has measured."** That number gates the `API_JSON_BODY_LIMIT_BYTES` review,
  the documented payload ceiling, and the go/no-go on the deferred
  payload-by-reference work. Measuring it is a day of work that can invalidate a
  week of it. `apps/api/tests/helpers/cdm-sync-fixtures.ts` and the round-trip
  integration tests already produce real CDM payloads to measure against.

Slice 1 adds no runtime behavior and should be mergeable on its own merits even if
this story is abandoned — the same property phase A's slice 1 had.

**Slice 2 before slice 3** because the extraction is the widest-blast-radius change
in the story and the only one that is pure refactor. Landing it alone, against a
green oracle, means every later slice sits on a known-parity base. Bundling it with
the bootstrap gate would make a genuine behavior change and a mechanical move
indistinguishable in review.

**Slice 3 before slice 4.** A Lambda that runs migrations on cold start is wrong on
every axis — concurrency, the 15-minute ceiling, and least privilege. The gate must
exist before the handler that depends on it, or slice 4 ships a handler nobody can
safely invoke. Slice 3 also carries the Architect dependency; if the ADR reopens the
question, it does so with slices 1–2 already merged rather than blocking the story.

**Slice 4 before slice 5 — smaller, more constrained change first.** The secrets
bootstrap is the _outermost wrapper_ of the handler: fetch → write `/tmp/.env` → set
`GRANT_ENV_FILE` → `await import()` the app. Shipping the handler first with ordinary
env resolution, then wrapping it, keeps the **security-full** review focused on a
diff that is only the secrets path — not a secrets path tangled with an entrypoint,
a tracing flush, and an event adapter. This mirrors phase A's argument for doing
cache before jobs.

**Slice 6 after slice 5** because the Dockerfile stage must name a concrete entrypoint
and the ECR publish path must push an image that actually boots. Slice 6 is also the
hard dependency for phase C; if the story is cut short, slices 1–6 are still a
deliverable target and slice 7 is not needed for one.

**Slice 7 last, and independently droppable.** Nothing else in the story depends on
telemetry. If the story runs long, slice 7 splits to its own follow-up without
stranding anything.

## Slice detail and known traps

Findings below were verified against `048341cb`'s tree during planning and are **not**
in the brief. Recorded here so slices do not re-derive them.

### Slice 1 — oracle — **delivered**

Results in [`2026-08-21-aws-lambda-runtime-measurements.md`](./2026-08-21-aws-lambda-runtime-measurements.md).

- `tests/e2e/boot-parity.e2e.test.ts` — 21 assertions, green against the current tree
  before slice 2 exists, and **proven to bite**: moving `i18nMiddleware` ahead of
  `cors` in `server.ts` fails it while the other 211 e2e tests stay green.
- **Response header order turned out to be the middleware execution order**, which
  makes the chain at `server.ts:93-101` observable black-box. That was not obvious
  when this plan was written and it is what makes the oracle survive slice 2 — no
  assertion knows whether an app factory exists.
- Three invariants HTTP cannot see are named in the file rather than papered over,
  and go on **slice 2's review checklist**: tracing imported first, `initializeJobs()`
  staying out of the factory, and `rateLimitMiddleware` being inert under
  `SECURITY_ENABLE_RATE_LIMIT=false`.
- Gzip measured at **17.7% mean, 22.8% worst case** over five profiles, the last of
  which is a deliberate upper bound on incompressibility rather than a tenant.
  Fixtures are validated against `startProjectSyncRequestSchema`, because a ceiling
  measured from bytes the route would reject measures nothing.

### Slice 2 — `create-app.ts`

- **`initializeJobs()` must stay out of `create-app.ts`.** `server.ts:151` calls it
  _after_ `httpServer.listen()`, and it registers in-process cron schedules
  (`lib/jobs/initialize.ts`). A Lambda cold start that registered node-cron timers
  would create timers that die with the frozen container. `create-app.ts` returns the
  app and its shutdown handles; `server.ts` keeps the `initializeJobs()` call and the
  `process.on('SIGTERM'|'SIGINT')` registration (`server.ts:266-267`).
- `import '@/lib/tracing'` must remain the **first** import of whichever module is the
  process entrypoint (`server.ts:1`) — the OTel SDK patches `http`/`express` before
  they load. Both `server.ts` and the new Lambda entrypoint carry it.
- Shutdown is returned as handles, not registered as signal listeners, for the same
  reason.

### Slice 2 — `create-app.ts` — **delivered**

- App construction moved verbatim: the extracted block is **line-for-line identical**
  to `server.ts:38-146` (diffed, ignoring blank lines). The shutdown sequence differs
  in exactly four lines — `apolloServer.stop()` twice, `CacheFactory.disconnect`,
  `closeDatabase` — each swapped for the matching handle, same order, same
  error handling.
- **The slice-1 oracle passed unmodified**, 21/21, route-table snapshot unchanged.
  That was the acceptance condition and it needed no edits to meet.
- `server.ts` 276 → 141 lines. All three named gaps verified by inspection: tracing
  first import of the entrypoint and absent from `create-app.ts`, `initializeJobs()`
  and both `process.on` handlers in `server.ts` only.
- `bootstrapDatabase()` moved **into** `createApp()`. An app without a migrated
  database is not serve-ready, and an entrypoint that skipped it would diverge from
  the server in a way nothing observes. Slice 3 now has one call site to gate rather
  than two paths to keep in step.

### Slice 2 finding — graceful shutdown is broken on `main`

Found by sending a real `SIGTERM` to the container, which the oracle cannot do (it
would stop the API the rest of the e2e suite is using).

`ApolloServerPluginDrainHttpServer` closes the HTTP server as part of
`apolloServer.stop()`. `gracefulShutdown` then calls `httpServer.close()` on the
already-closed server, which rejects with `ERR_SERVER_NOT_RUNNING`. The rejection
escapes to the outer catch, so **the process exits 1 and never runs the remaining
teardown**: `shutdownTracing()`, `shutdownJobs()`, cache disconnect, database close.

**Pre-existing, and verified as such rather than assumed** — the pre-extraction
`server.ts` was rebuilt and given the same signal, and fails identically with exit
code 1. Slice 2 reproduces it exactly, which is the correct outcome for a no-op.

Consequences on the current K8s target: every pod termination is a hard failure with
no span flush, no job cleanup, and no clean database or cache disconnect.
`GRACEFUL_SHUTDOWN_TIMEOUT_MS` never gets the chance to matter. It went unnoticed
because nothing checks the container's exit code — `scripts/e2e.sh` tears the stack
down with `down -v` regardless.

**Not fixed in this slice** — fixing it is a behavior change and would have destroyed
the no-op property slice 2 exists to demonstrate. It went out as its own PR off
`main`, [#325](https://github.com/grant-js/grant/pull/325), merged `9c1aaeb4`
2026-08-25: `closeHttpServer()` absorbs `ERR_SERVER_NOT_RUNNING` and only that code,
so shutdown runs to completion and exits 0.

**Resolved, and the resolution was re-verified through the extraction.** The trunk was
rebased onto the new `main`; slice 2 conflicted in `server.ts` exactly as predicted,
in the import block. Resolution kept `closeHttpServer` — `server.ts` still owns
shutdown — and dropped the three imports that moved to `create-app.ts`. SIGTERM
against the rebuilt container now exits 0 through the extracted `create-app` with the
full sequence: HTTP server closed, job scheduling shut down, cache disconnected,
database closed.

This also clears the ground for blocker 5 (OTel spans lost on container freeze),
which had been assuming a shutdown path that never executed.

### Slice 3 — bootstrap gate

- Two ADRs, both Architect-owned:
  1. **Boot-time `bootstrapDatabase()` becomes configuration-gated.** Reverses the
     decision recorded at `server.ts:55-56` ("Sole migrate/seed path for Kubernetes
     (no Helm hook Job); PostgreSQL advisory lock is safe for multiple replicas").
     Default stays today's behavior.
  2. **`project-sync` versus the 15-minute Lambda ceiling.** Step Functions or a
     Fargate escape hatch. CDM import/export is unbounded per tenant; the cron sweeps
     are safe because they yield via `maxBatches`.
- **The repo has no ADR directory.** `docs/architecture/` holds topic documents
  (`overview.md`, `multi-tenancy.md`, `rbac.md`, `security.md`, `data-model.md`), not
  decisions. This plan proposes `decisions/NNNN-<slug>.md` and slice
  3 establishes it. **Flagged for gate 2** — if a different home is wanted, say so
  before slice 3 rather than after two ADRs land.

### Slice 3 — bootstrap gate — **delivered**

- `DB_BOOTSTRAP_ON_BOOT`, default `true`. Verified both ways against the real image:
  default boots with the drizzle migration exactly as before and the oracle passes
  21/21; `false` logs the skip and serves normally.
- `apps/api/src/migrate.ts` → `node dist/migrate.js`, confirmed present and exiting 0
  inside the production container.
- **The reason the standalone runner is necessary was confirmed, not assumed**:
  `drizzle-kit` is absent from the production image (`ls node_modules/.bin/drizzle-kit`
  → no such file), because it is a devDependency and the runner stage prunes to
  production deps. `pnpm --filter @grantjs/database db:migrate` therefore cannot run
  in a container. `bootstrapDatabase()` uses `drizzle-orm`'s migrator, which ships.
- ADR directory established at **`decisions/`** (repo root, sibling to `plans/`) with a
  README defining the convention, plus ADRs
  [0001](../decisions/0001-configuration-gated-database-bootstrap.md) and
  [0002](../decisions/0002-long-running-cdm-sync-beyond-lambda.md). Indexed from
  AGENTS.md § Where to look.

  **Not** `docs/architecture/decisions/`, which is where this plan originally proposed
  them: `docs/` is a workspace package whose `build` script is `vitepress build`, so
  every `.md` beneath it becomes a public page. ADRs cite `plans/`, phase numbers, and
  blocker indices — engineering records for this repo, with `plans/`'s audience and
  lifecycle. At the root they are unpublished by construction rather than by an
  `srcExclude` entry someone has to remember.

- Documented in `apps/api/.env.example` and the Helm configmap defaults, both of
  which keep today's behavior.

**ADR 0002 landed differently than the plan anticipated.** The plan framed the
choice as "Step Functions or a Fargate escape hatch". Reading the code closed it:
`ProjectImportService.applyProjectCdmImport` (`services/project-import.service.ts:255-268`)
runs the whole import in a **single transaction**, so Step Functions is not an
infrastructure choice at all — chunking means committing partial imports, which means
abandoning that transaction and inventing a resumability protocol. A partially applied
permission model is a security outcome. The decision is to move the workload to a
runtime that fits the transaction, not to break the transaction to fit the runtime.

**One quantity is still unmeasured and is now called out in ADR 0002**: how long a
28,880-entity import actually takes against RDS. Until that exists, the size at which
sync must leave Lambda is unknown. Slice 1's fixtures make it measurable and
deterministic; phase C owns it.

### Slice 4 — Lambda runtime fit — **delivered, and not as planned**

**The plan's shape for this slice was wrong and was replaced.** It assumed a handler
entrypoint over `create-app.ts`. One was built, tested, and verified end to end — then
discarded in favour of the **AWS Lambda Web Adapter**, which runs `dist/server.js`
unmodified. Recorded in
[ADR 0003](../decisions/0003-lambda-web-adapter-over-a-handler-entrypoint.md); it
supersedes the brief's criterion "A Lambda handler entrypoint exists over
`create-app.ts`".

**What changed the decision.** The handler was defended on two grounds and both
collapsed under challenge from the owner:

1. _"LWA runs `server.ts`, whose cron timers die with a frozen container."_ False on
   this target. `AwsJobAdapter.schedule()` creates no timers — it records a handler
   and logs "recurrence is provisioned externally"
   (`packages/@grantjs/jobs/src/aws/index.ts:109-127`). Recurrence is EventBridge,
   dispatch is SQS. Timers exist only under `node-cron`.
2. _"Only a handler has a return point to flush OTel spans at."_ True, and irrelevant.
   `TRACING_ENABLED` defaults to `false` in **every** shipped configuration, so an
   optional, disabled subsystem was being allowed to pick the entrypoint. And the
   buffering is a strategy choice — `SimpleSpanProcessor` buffers nothing.

**The evidence that settled it.** Excluding `initializeJobs()` from the handler — on
reasoning 1 — left `getJobAdapter()` returning `null`, so `startProjectSync` and
`startProjectExport` would have thrown "job adapter is not configured"
(`handlers/projects.handler.ts:145,196`). **CDM sync would have been dead on arrival**,
and nothing in the slice caught it. The point is not that the bug was hard to fix; it
is that a parallel entrypoint fell out of step with `server.ts` within one slice,
written with full context. Under LWA that defect is structurally impossible.

**What shipped instead**, the whole runtime change being one config-selected strategy:

- `TRACING_SPAN_PROCESSOR` (`batch` | `simple`), default `batch` — server behavior
  unchanged. `simple` exports per span so nothing is buffered when a container freezes.
- ADR 0003, including the operating requirements table (`AWS_LWA_PORT`,
  `AWS_LWA_READINESS_CHECK_PATH`, `JOBS_PROVIDER=aws`, `DB_BOOTSTRAP_ON_BOOT=false`).
- **No** `lambda.ts`, **no** `serverless-http`, no second entrypoint.

**Verified against the built image** by booting unmodified `dist/server.js` under the
full AWS-target configuration — `JOBS_PROVIDER=aws` against LocalStack SQS,
`DB_BOOTSTRAP_ON_BOOT=false`, `TRACING_ENABLED=true`, `TRACING_SPAN_PROCESSOR=simple`:

```
OpenTelemetry tracing initialized
Skipping database bootstrap at boot (DB_BOOTSTRAP_ON_BOOT=false)
Recurring job registered with AWS adapter; recurrence is provisioned externally
Enqueue-only job registered with AWS adapter
Job scheduling initialized
Server started successfully
```

**Consequence for slice 6**: the image gains the LWA extension via one `COPY` from
public ECR rather than a Runtime Interface Client, and `CMD` stays `node dist/server.js`.

**Consequence for slice 2**: `create-app.ts` was justified partly by "a second
entrypoint needs app construction without the server's behavior", and that second HTTP
entrypoint no longer exists. It keeps its place on its own merits — `server.ts` 276 →
135 lines, `migrate.ts` as a real second entrypoint over the same code, and a provable
no-op — but had ADR 0003 come first, slice 2 would have been argued differently.

**Node 24**: the constraint that ruled out `@codegenie/serverless-express` is moot now
that no event adapter is used at all. The base-image version is slice 6's call.

### Slice 5 — secrets (security-full)

**Shape replaced. Delivered as `ISecretResolver`, not the `GRANT_ENV_FILE` preload the
brief described.** ADR 0003 removed the handler entrypoint, and with it the place to
stand between "process starts" and "application loads". Rather than reintroduce that
window with a `--import` preload, secret resolution moved to a port and became lazy.
Recorded in `decisions/0004-secret-resolution-through-a-port.md`.

- `ISecretResolver` in `@grantjs/core`; `EnvSecretResolver` (default) and
  `AwsSecretsManagerResolver` in a new private `@grantjs/secrets` package, selected by
  `SECRETS_PROVIDER` (default `env`). Package DAG entry added to `eslint.config.mjs`
  (`secrets: ['@grantjs/core']`) and to the changeset `ignore` list.
- `@aws-sdk/client-secrets-manager` is an optional peer of `@grantjs/secrets` and a
  concrete dependency of `apps/api`, matching the DynamoDB cache precedent and phase A
  deviation #3.
- **Only two keys are read through the port**: `AUTH_MFA_SECRET_ENCRYPTION_KEY` and
  `GITHUB_CLIENT_SECRET`. `STORAGE_S3_*`, `CACHE_DYNAMODB_*` and `JOBS_AWS_*` already
  document themselves as intentionally blank so the execution role supplies them
  (`env/src/schema.ts:132-134`), so they need nothing.
- **Blocker 6 resolved** (rotation vs. container-scoped `getEnv()` caching): secret
  values no longer pass through `getEnv()` at all. Rotation window is
  `SECRETS_CACHE_TTL_SECONDS`, default 300.
- **The `findWorkspaceRoot()` trap does not bite this image.** Verified against the
  built container: `/app/pnpm-workspace.yaml` is present with `WORKDIR /app/apps/api`,
  so the walk succeeds. It only becomes real if slice 6 slims the image — carry the
  check there, do not fix it here.
- **API surface change:** `IGitHubOAuthService.isConfigured()` returns
  `Promise<boolean>`; four handler call sites await it, and
  `IProjectOAuthProvider.getAuthorizeUrl` widened to `string | Promise<string>`.
- **Database credentials are out of scope for this slice and belong to the CDK work.**
  RDS IAM auth removes the password entirely: host/port/database/username are config,
  and the token is minted locally by SigV4 against the execution role. postgres.js
  already accepts a password callback and invokes it per connection attempt
  (`postgres/src/connection.js:750-752`), so this needs one additive optional
  `password?: () => Promise<string>` on `DatabaseConfig`. Not done here.
- **Tenancy re-check, done:** `rls-context.ts` is untouched by every slice in this
  story, so transaction-scoped `SET LOCAL ROLE` still holds and RDS Proxy can stay
  multiplexed.
- **Two findings for separate fixes, neither introduced here:**
  - `printConfigSummary()` logs `DB_CONFIG.url.split('@')[1]`
    (`apps/api/src/config/env.config.ts:981`) — a password containing a raw `@` leaks a
    fragment into the log.
  - `SECURITY_API_KEY` is declared in the env schema and config but has **no runtime
    consumer**. Left in place (additive-only), flagged for the security review.
  - `@grantjs/database` has no `ssl` option anywhere, and postgres.js defaults
    `ssl: false`. RDS Proxy requires TLS, but postgres.js parses `?sslmode=` off the
    URL, so this is config-only: `DB_URL=...?sslmode=verify-full`. Belongs to the CDK
    slice.

### Slice 6a — image (done)

**Split from the original slice 6.** The image is locally verifiable; the registry and
CI half is not. Shipping them together made one PR whose evidence was half-empty.

- New `runner-lambda` stage in `apps/api/Dockerfile`, built with
  `--target runner-lambda`. It is `FROM runner`, not a rebuild from `node:22-alpine`:
  the Lambda image is the K8s image plus one binary, so image drift cannot be the
  cause of a Lambda-only failure.
- **The `findWorkspaceRoot()` trap is closed by that choice, not worked around.**
  Extending `runner` inherits the whole builder `/app`, `pnpm-workspace.yaml` included.
  Verified in the built image, not reasoned about. A slimmed stage would still fail at
  cold start, so do not slim this one without re-checking.
- `AWS_LWA_PORT=4000` (matches inherited `API_PORT`) and
  `AWS_LWA_READINESS_CHECK_PATH=/health`.

**Two findings, both caught by verification rather than review:**

1. **ADR 0003 recorded a registry path that does not exist.**
   `public.ecr.aws/awsguru/aws-lambda-web-adapter` is not a repository; the real one is
   `awsguru/aws-lambda-adapter` — no `web`. Confirmed against the ECR Public API with a
   known-good control (`lambda/nodejs` → 1000 tags; the wrong path → 0). Pinned at
   **1.1.0**, which publishes both `linux/amd64` and `linux/arm64`. ADR 0003 amended in
   place with a dated correction.
2. **Appending a stage silently changed the default build target.** Docker builds the
   last stage when `--target` is omitted, and _every_ consumer omits it —
   `docker-compose{,.e2e,.demo}.yml` and `release.yml` (which passes only `file`).
   Without a fix, `release.yml` would have published the Lambda image to GHCR as
   `grant-api`. Closed by a trailing `FROM runner AS default` stage; new stages must be
   added above it. Proven by inspecting both images: the bare build has no adapter and
   no `AWS_LWA_*`, the targeted build has both.

### Slice 6b — registry and architecture (not started)

- ECR path: `release.yml:270-282` logs into GHCR and derives `BASE=ghcr.io/...`. Lambda
  cannot pull from GHCR. Add an ECR login + push for the Lambda image; the GHCR path
  for existing images is untouched.
- **Arch recommendation: `linux/arm64` for the Lambda image only**, K8s runner stays
  amd64 and single-arch. Graviton is materially cheaper per GB-second and cold starts
  are competitive; SnapStart is unavailable for Node.js regardless, so image size and
  architecture are the only cold-start levers that do not reintroduce idle cost.
  Confirmed available: the pinned adapter tag is multi-arch.
  The build-push composite action declares no `platforms:`
  (`.github/actions/docker-build-push/action.yml`) — it gains an optional input rather
  than a fork. It will also need a `target` input, which slice 6a did not add.
- **Node 24 base image is a separate decision, deliberately not bundled here.** The
  Dockerfile pins `node:22-alpine` for `base` and `runner`; CI runs Node 24
  (`ci.yml:83`, `release.yml:148,215`) and root `engines` says `>=18.0.0`. Bumping the
  base image changes the _existing_ K8s runner, not just the Lambda target, so it does
  not belong in an additive slice.

### Slice 7 — telemetry

- **No `@grantjs/core` port change is required, and this was checked.**
  `ITelemetryAdapter` exposes only `sendLog(entry)`. EMF is a _log format_, not a
  separate API: an EMF document is a log line carrying an `_aws` block plus top-level
  metric values. `CloudWatchTelemetryAdapter.sendLog()` spreads `entry.fields` into
  the top level of the emitted JSON (`telemetry/src/cloudwatch.ts:69-75`), so an EMF
  document passes through the existing port unchanged.
- **Recommendation: a stdout EMF strategy, not EMF over the existing CloudWatch
  adapter.** The existing adapter issues `PutLogEvents` per entry and threads a
  `sequenceToken` across calls (`cloudwatch.ts:122-133`) — that token is meaningless
  across frozen containers, and an API call per log line is the wrong shape for Lambda.
  Writing EMF to stdout lets the Lambda runtime ship it and CloudWatch extract the
  metrics, with no SDK, no sequence token, and no flush-on-freeze problem. It also
  sidesteps that `apps/api` does not currently declare
  `@aws-sdk/client-cloudwatch-logs` at all.
- Additive third strategy on `TelemetryFactory` alongside `'none'` and `'cloudwatch'`
  (`telemetry/src/factory.ts:7`), matching how phase A widened `CacheFactory`.
- `/metrics`, `metricsMiddleware`, `lib/metrics/metrics.ts`, and `servicemonitor.yaml`
  are **unchanged**. Nothing can scrape a frozen container; the two paths coexist,
  config-selected. This is blocker 4's resolution, not a migration.

## Dependencies and notes

- **Nothing in this story is AWS-deployable on its own.** No CDK, no CloudFormation,
  no CloudFront, no OpenNext — phase C. Slice 6 produces a pushable image; nothing
  invokes it yet.
- The deferred **payload-by-reference** item stays deferred. It requires
  `IFileStorageService.getUploadUrl()` — the only `@grantjs/core` port change in the
  program. **Build only if slice 1's measurement says gzip is insufficient.** If it
  does, that is a new slice with Architect sign-off, not an expansion of slice 5.
- Reminder from the brief: the queue is not a constraint. `project_sync_jobs.payload`
  is a Postgres `jsonb` column (`project-sync-jobs.schema.ts:45`) and only
  `{ jobRecordId }` is enqueued; SQS's 256 KB cap never applies. The constraint is
  purely HTTP ingress on `POST /api/projects/:id/sync/jobs`.
- The Helm chart is not modified except where a new config key needs a values
  passthrough.

## Risks

1. **Slice 2 is a silent-regression risk.** It moves the platform's only entrypoint.
   Mitigated by slice 1 landing first, and by an e2e run being part of the slice's
   acceptance rather than the story's.
2. **Slice 3's ADR could reopen the bootstrap decision entirely.** If the Architect
   rejects gating, slice 4 needs a different migration story and slices 4–6 re-plan.
   This is why slice 3 sits early and small.
3. **The gzip number could come back bad.** If real CDM payloads compress poorly
   enough that the 6 MB cap binds at realistic tenant sizes, payload-by-reference
   returns from deferred and the story grows by a slice with a port change. Slice 1
   surfaces this in week one rather than during phase C integration.
4. **Slice 6's image may not boot for reasons invisible in review** — see
   `findWorkspaceRoot()` above. Acceptance for slice 6 must include actually running
   the built image, not just building it.

## Stack setup

```sh
git switch -c feat/aws-lambda-runtime main && git push -u origin feat/aws-lambda-runtime

gh stack init --base feat/aws-lambda-runtime feat/aws-lambda-runtime-oracle

# After each slice: commit, then BOTH, every time.
gh stack submit --auto
gh stack link --base feat/aws-lambda-runtime <pr> <pr>   # bottom to top

# Before the NEXT slice:
gh stack add feat/aws-lambda-runtime-create-app
```

Check positions **before** writing a slice:

```sh
git for-each-ref --format='%(refname:short) %(objectname:short)' refs/heads
```

`--base` is not optional on `init` or `link`; omitted, the bottom PR re-points at
`main` and the stack merges past gate 4.

**`gh stack link` cannot run after the first slice.** It requires at least two PR
numbers (`requires at least 2 arg(s), only received 1`) — a stack of one is just a
PR, and there is nothing to link. The template's "run BOTH, every time" applies from
slice 2 onward. Verified on 2026-08-25 with `gh stack` v0.1.0: `init --base` alone
set #321's base to the trunk correctly, so gate 4 is not at risk in the meantime.

See [Agentic SDLC § GitHub stacking](../docs/contributing/agentic-sdlc.md#github-stacking)
before running any of these — it carries three traps this condensed block omits:
`submit` without `--auto` hangs on an invisible interactive editor with no error;
`submit --auto` alone exits 0 having created **no stack** when the PRs already exist;
and `gh stack link` is the only non-interactive way to create or grow one. The
per-slice `gh stack add` above is deliberate — see
[§ init-consequences](../docs/contributing/agentic-sdlc.md#init-consequences) for why
declaring every branch at `init` strands later slices while reporting success.

`gh stack submit --auto` opens PRs as **drafts**; `gh pr ready <pr>` when a slice is
ready for its gate-3 review, or reviewers are never requested.

## Human gates

- [x] Gate 1: **Story brief approved** — 2026-08-24, Ale Heredia. Citations
      re-verified against `048341cb`.
- [x] Gate 2: **Stack plan approved** — 2026-08-24, Ale Heredia. Implementation
      unblocked. The two flagged items (ADR directory for slice 3, arm64-only for
      slice 6) were approved as recommended, by approving the plan without amendment;
      re-open either at its slice if that reading is wrong.
- [ ] Gate 3: **Stack PRs merged into trunk** — light, except slice 5 (security-full).
- [ ] Gate 4: **Story → `main` deep review complete.**

## Cleanup

- [ ] `git worktree remove` (if a worktree becomes necessary)
- [ ] Local slice branches deleted
- [ ] Remote slice branches deleted from origin — phase A left these behind
- [ ] Stack plan status → `merged-to-main`
- [ ] Phase C (`aws-edge-infra`) brief re-verified against the new `main` and
      submitted for its own gate 1
