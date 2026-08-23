# Story brief — Lambda-capable API runtime

## Metadata

- **Slug**: `aws-lambda-runtime`
- **Date**: 2026-08-21
- **Status**: **draft — not queued.** Phase **B** of three; do not begin until
  phase A (`aws-adapters`) has merged to `main`.
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md)
- **Depends on**: `aws-adapters`

## Objective

Make `apps/api` runnable as an AWS Lambda without changing how it runs as a
long-lived server: an additional entrypoint, an additional container image target,
a configuration-selected secrets path, and a push-based telemetry route.

## Acceptance criteria

- [ ] `create-app.ts` is extracted from `server.ts`, returning the configured Express
      app and its shutdown handles. `server.ts` keeps listening and behaves
      identically — a **provable no-op**, demonstrated by comparing boot behavior and
      an e2e run, not by reading the diff.
- [ ] A Lambda handler entrypoint exists over `create-app.ts`.
- [ ] Boot-time `bootstrapDatabase()` becomes configuration-gated, defaulting to
      today's behavior. A standalone migrate/seed runner entrypoint exists.
      **Requires an ADR** — this reverses a decision recorded at `server.ts:59`.
- [ ] Secrets resolve from Secrets Manager **once per cold start**, via the existing
      `GRANT_ENV_FILE` hook (`env/src/load-env.ts`): fetch → write `/tmp/.env` → set
      `GRANT_ENV_FILE` → `await import()` the app. Module-scope `getEnv()`
      (`config/env.config.ts:15`) then caches for the container's life at no cost.
- [ ] The API holds no database password: RDS Proxy holds the credential, Lambda
      authenticates via IAM. This also resolves rotation (blocker 6).
- [ ] **An ECR publish path exists.** `release.yml:282` publishes to GHCR only, and
      **Lambda cannot pull container images from GHCR**. Add an ECR push or mirror.
- [ ] **A `runner-lambda` Dockerfile stage exists.** `apps/api/Dockerfile:95-96` is a
      server image (`ENTRYPOINT docker-entrypoint.sh`, `CMD node dist/server.js`,
      `EXPOSE 4000`). A Lambda image needs the Runtime Interface Client or the Lambda
      Web Adapter. New stage sharing the existing builder — the existing runner stage
      is untouched.
- [ ] Multi-arch (`linux/arm64`) build, or a documented decision to stay amd64. The
      build-push step currently declares no `platforms:`.
- [ ] CloudWatch EMF telemetry through the existing `ITelemetryAdapter`. `/metrics`
      and `servicemonitor.yaml` are **unchanged** and remain the K8s path — nothing
      can scrape a frozen Lambda container, so the two coexist, config-selected.
- [ ] OTel spans force-flush before handler return, or the ADOT layer is adopted.
      Batch spans are otherwise lost when the container freezes.
- [ ] **Gzip compression ratio measured on real CDM export fixtures**, and the
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

- [ ] Gate 1: not yet sought. Re-verify all `file:line` citations against `main`
      before requesting it — this brief was drafted against `0592720c`.
