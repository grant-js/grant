# Story brief — Lambda-capable API runtime

## Metadata

- **Slug**: `aws-lambda-runtime`
- **Date**: 2026-08-21
- **Status**: **approved** (gate 1, 2026-08-24, Ale Heredia). Phase **B** of three. Its
  prerequisite, phase A (`aws-adapters`), merged to `main` as #313 on 2026-08-24.
- **Stack plan**: [`2026-08-21-aws-lambda-runtime-stack.md`](./2026-08-21-aws-lambda-runtime-stack.md)
- **Citations re-verified** against `main` at `39151c33` on 2026-08-24. One had
  drifted: `bootstrapDatabase()` moved from `server.ts:59` to `:56`. Everything else
  still holds — `env.config.ts:15`, `env/src/schema.ts:31`, `release.yml:282`,
  `apps/api/Dockerfile:88,95-96`, `project-sync-jobs.schema.ts:45`,
  `rls-context.ts:96-104`, and `body-parser/lib/read.js:190`.
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md)
- **Depends on**: `aws-adapters`

## Objective

Make `apps/api` runnable as an AWS Lambda without changing how it runs as a
long-lived server: an additional entrypoint, an additional container image target,
a configuration-selected secrets path, and a push-based telemetry route.

## Acceptance criteria

- [x] `create-app.ts` is extracted from `server.ts`, returning the configured Express
      app and its shutdown handles. `server.ts` keeps listening and behaves
      identically — a **provable no-op**, demonstrated by comparing boot behavior and
      an e2e run, not by reading the diff. _(#322; oracle #321.)_
- [~] ~~A Lambda handler entrypoint exists over `create-app.ts`.~~ **Superseded.**
  Built, then rejected on evidence: the parallel entrypoint drifted immediately
  and would have shipped CDM sync broken. The AWS target runs `dist/server.js`
  unchanged behind the Lambda Web Adapter — no handler.
  [ADR 0003](../decisions/0003-lambda-web-adapter-over-a-handler-entrypoint.md). _(#328.)_
- [x] Boot-time `bootstrapDatabase()` becomes configuration-gated, defaulting to
      today's behavior. A standalone migrate/seed runner entrypoint exists.
      `DB_BOOTSTRAP_ON_BOOT` + `node dist/migrate.js`;
      [ADR 0001](../decisions/0001-configuration-gated-database-bootstrap.md). _(#324.)_
- [~] Secrets resolve from Secrets Manager. **Mechanism superseded.** The
  `GRANT_ENV_FILE` → `await import()` preload assumed a handler to stand between
  process start and app load; ADR 0003 removed it. Secrets now resolve lazily
  through an `ISecretResolver` port, which dissolves the ordering problem instead
  of scheduling around it — and makes rotation a TTL rather than a container
  lifetime. [ADR 0004](../decisions/0004-secret-resolution-through-a-port.md). _(#330.)_
- [ ] The API holds no database password: RDS Proxy holds the credential, Lambda
      authenticates via IAM. **Deferred to phase C** — it needs CDK to exist. Groundwork
      confirmed in phase B: postgres.js already invokes a `password` callback per
      connection (`postgres/src/connection.js:750-752`), so this needs one additive
      optional `password?: () => Promise<string>` on `DatabaseConfig`. Rotation
      (blocker 6) was resolved separately by ADR 0004.
- [x] **An ECR publish path exists.** Separate `docker-lambda` job, gated on two AWS
      repo variables so it is inert until phase C sets them. GHCR path untouched.
      **Never executed** — no AWS role or ECR repository exists yet. _(#334.)_
- [x] **A `runner-lambda` Dockerfile stage exists.** _(#332.)_ `apps/api/Dockerfile:95-96` is a
      server image (`ENTRYPOINT docker-entrypoint.sh`, `CMD node dist/server.js`,
      `EXPOSE 4000`). A Lambda image needs the Runtime Interface Client or the Lambda
      Web Adapter. New stage sharing the existing builder — the existing runner stage
      is untouched.
- [x] `linux/arm64` for the Lambda image only; GHCR images stay amd64 and single-arch.
      The composite action gained optional `platforms` and `target` inputs rather than a
      fork. **The arm64 build has never been executed** — the dev machine has no
      `qemu-aarch64` binfmt handler. Indirect evidence only: `node:22-alpine` and the
      pinned adapter both publish arm64, and `bcrypt` bundles a `linux-arm64` prebuild.
      First real proof is phase C. _(#334.)_
- [x] CloudWatch EMF telemetry through the existing `ITelemetryAdapter` — no port
      change was needed. `/metrics` and `servicemonitor.yaml` are unchanged; the two
      coexist, config-selected. _(#336.)_
- [x] `TRACING_SPAN_PROCESSOR=simple` exports spans synchronously, defaulting to
      `batch`. No handler exists to force-flush from, so the strategy is config-selected
      instead. _(#328.)_
- [x] **Gzip compression ratio measured on real CDM export fixtures** *(#321; see the
      measurements artifact.)**, and the
      resulting practical payload ceiling documented. `body-parser` inflates
      `Content-Encoding: gzip` request bodies by default (`inflate` is opt-_out_,
      `body-parser/lib/read.js:190`) and applies `limit` to the **decompressed**
      stream — so gzip spends compressed bytes against Lambda's 6 MB cap while
      `API_JSON_BODY_LIMIT_BYTES` still governs real size. **The mitigation rests
      entirely on a number nobody has measured.**
- [ ] `API_JSON_BODY_LIMIT_BYTES` (default 10 MB, `env/src/schema.ts:31`) reviewed as
      the new binding ceiling.
- [ ] A design decision recorded for `project-sync` exceeding the 15-minute Lambda
      ceiling (Step Functions or Fargate escape hatch). CDM import/export is unbounded
      per tenant; the cron sweeps are safe because they yield via `maxBatches`.
- [ ] **With no configuration changed, behavior is identical to `main`.**

## Deferred from this story

- **Payload-by-reference** (optional `payloadRef` S3 key alternative to inline
  `payload`, config-gated, inline path unchanged and still default). Requires
  `IFileStorageService.getUploadUrl()` — a `@grantjs/core` **port change**, the only
  item in the program touching the domain core. **Build only if measurement says
  gzip is insufficient.** Architect sign-off required if it proceeds.
  - Context: the queue is _not_ a constraint. `project_sync_jobs.payload` is a
    Postgres `jsonb` column (`database/src/schemas/project-sync-jobs.schema.ts:45`)
    and only `{ jobRecordId }` is enqueued. SQS's 256 KB cap never applies. The
    constraint is purely HTTP ingress on `POST /api/projects/:id/sync/jobs`.

## Non-goals

- CDK, CloudFormation, CloudFront, OpenNext. Phase C.
- Removing or altering `server.ts`'s listening behavior, the existing runner image,
  the Helm chart, or `/metrics`.
- Provisioned-concurrency tuning. Note **Lambda SnapStart does not support Node.js**,
  so cold-start mitigation is limited to ARM64, image sizing, and provisioned
  concurrency — the last reintroduces idle cost and is a separate decision.

## Risk flags

- [x] Auth / sessions / MFA / AAL — the secrets bootstrap path
- [x] API keys / tokens — secrets handling, IAM DB auth
- [x] Tenancy / RLS / org scoping — RDS Proxy multiplexing depends on the
      transaction-scoped `SET LOCAL` at `lib/rls/rls-context.ts:96-104`; any change
      there is a deployment-topology change
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

→ **`security-full`** on the secrets slice.

## Suggested active roles

PM, Principal, **Architect** (ADR + any port change), Senior Backend,
Senior Security, QA, Verifier.

## Human gate

- [x] Gate 1: **approved 2026-08-24, Ale Heredia.** Citations re-verified a second time
      against `main` at `048341cb` when the stack plan was drafted; all still hold.
