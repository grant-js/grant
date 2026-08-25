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

**Not fixed here.** Fixing it is a behavior change and would destroy the no-op
property this slice exists to demonstrate. It wants its own PR off `main` — the same
shape as #315 — and it is worth doing before phase B goes further, because blocker 5
(OTel spans lost on container freeze) assumes a shutdown path that currently never
executes.

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

### Slice 4 — handler

- `config.tracing.backend` **already accepts `'xray'`** and maps it to the OTLP
  exporter (`lib/tracing/index.ts:26-29`). No new exporter is needed; the slice adds a
  `forceFlush()` export alongside the existing `shutdownTracing()`
  (`lib/tracing/index.ts:104`) and calls it before handler return. `BatchSpanProcessor`
  (`:77`) is what loses spans on freeze.

### Slice 5 — secrets (security-full)

- Uses the existing `GRANT_ENV_FILE` hook (`env/src/load-env.ts:50-57`), which already
  applies `override: true` and `dotenv-expand`. No change to `@grantjs/env` is expected;
  if one becomes necessary, note that its ESLint rule forbids **every** workspace
  import (`INTERNAL_PACKAGE_DEPS.env = []`, AGENTS.md § Error handling) and any new
  throw there keeps a raw `Error` by the recorded exemption.
- `@aws-sdk/client-secrets-manager` follows the optional-peer pattern, and per phase A
  deviation #3, **`apps/api` as composition root must also declare the concrete SDK**
  if the import is eager.
- Security review must confirm `/tmp/.env` mode, that the file is never logged, that
  `printConfigSummary()` does not widen under the new path, and that no database
  password exists anywhere in the API — RDS Proxy holds it, Lambda authenticates via
  IAM. This is also the resolution of blocker 6 (rotation vs. container-scoped
  `getEnv()` caching).
- **Tenancy re-check, not a formality:** RDS Proxy stays multiplexed only because
  `rls-context.ts:96` uses transaction-scoped `SET LOCAL ROLE`. Confirm no slice in
  this story touches that file. Session-level `SET ROLE` would pin one proxy connection
  per Lambda container and negate the proxy.

### Slice 6 — image and registry

- **`findWorkspaceRoot()` will crash a slim Lambda image.** `env/src/load-env.ts:16-29`
  walks up from `process.cwd()` for `pnpm-workspace.yaml` and throws
  `Error('Workspace root not found')` if absent — on first import of `@grantjs/env`,
  before any handler code runs. Today's runner stage survives only because it copies
  the entire builder `/app` (`Dockerfile:81`), which includes the workspace file
  (`Dockerfile:26`). A `runner-lambda` stage that copies only `dist` + `node_modules`
  **fails at cold start with a bare error and no useful trace.** Either keep the file
  in the image or set `GRANT_ENV_FILE`-adjacent config so the walk is never needed.
  This is the single most likely way slice 6 burns a day.
- New stage shares the existing builder. **The existing `runner` stage is not
  modified** — `EXPOSE 4000`, `docker-entrypoint.sh`, `CMD node dist/server.js` all
  stay exactly as they are.
- **Arch recommendation: `linux/arm64` for the Lambda image only**, K8s runner stays
  amd64 and single-arch. Graviton is materially cheaper per GB-second and cold starts
  are competitive; SnapStart is unavailable for Node.js regardless, so image size and
  architecture are the only cold-start levers that do not reintroduce idle cost.
  Building both arches for an image with one consumer is cost without a customer.
  The build-push composite action currently declares no `platforms:`
  (`.github/actions/docker-build-push/action.yml:11-20`) — it gains an optional input
  rather than a fork.
- ECR path: `release.yml:270-282` logs into GHCR and derives `BASE=ghcr.io/...`.
  Lambda cannot pull from GHCR. Add an ECR login + push for the Lambda image; the
  GHCR path for existing images is untouched.

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
