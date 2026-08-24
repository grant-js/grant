# Story brief — AWS edge and infrastructure

## Metadata

- **Slug**: `aws-edge-infra`
- **Date**: 2026-08-21
- **Status**: **draft — not queued.** Phase **C** of three; do not begin until
  phase B (`aws-lambda-runtime`) has merged to `main`.
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md)
- **Depends on**: `aws-lambda-runtime`

## Objective

Deliver the deployable artifact: a CDK app that stands up the full AWS target, with
a configuration surface at parity with the Helm chart's `values.yaml`, and a
deployment guide at parity with `docs/deployment/kubernetes.md`.

**This is the story that decides whether the AWS target is "easy to configure and
deploy" or merely "deployable by someone who reads CDK source."** The config-surface
and smoke-test criteria below are what separate the two; they are not polish.

## Acceptance criteria

- [ ] A CDK app under `deploy/aws/` synthesizes the full stack.
- [ ] **A configuration surface at parity with `values.yaml`**: a typed props
      interface, a defaults file, and schema validation equivalent to
      `charts/grant-platform/values.schema.json`. Configuring a deployment must not
      require reading CDK source.
- [ ] **EventBridge rules are generated from the same job id/schedule source the API
      reads** — no hand-maintained parallel list. This is the specific reason CDK was
      chosen over hand-written CloudFormation: a drifted cron list fails silently, and
      the symptom ("a sweep stopped running") surfaces hours later.
- [ ] `cdk synth` output is committed and reviewed, giving a CloudFormation template
      as a byproduct. The synthesized template is the **evidence** that generation
      produced exactly the seven expected rules and no others.
- [ ] The standalone migrate/seed runner from phase B is wired as a deploy-time
      one-shot (CDK custom resource or pipeline step). First deploy must converge
      without manual intervention.
- [ ] `apps/web` deploys via OpenNext, with `/_next/static/*` served from S3.
      Note `apps/web` has **no `middleware.ts`**, so no Lambda@Edge complexity, and
      **no `NEXT_PUBLIC_*` vars**, so runtime configuration works.
- [ ] `docs/` (VitePress, already a static build behind nginx) deploys as an S3 origin.
- [ ] CloudFront provides the gateway routing for the AWS target.
      `deploy/gateway.conf.template` is **unchanged** and remains the routing path for
      the K8s and docker-compose targets. Note `next.config.ts` `rewrites()` hardcodes
      `http://localhost:4000` and is dev-only by its own comment.
- [ ] `config.storage.provider` is S3 for this target; the `local` provider,
      `storageMiddleware()`, and `pvc-api.yaml` are untouched and still work.
- [ ] **A smoke test against a deployed stack** exists and runs post-deploy.
- [ ] `docs/deployment/aws-serverless.md` written, at the depth of
      `docs/deployment/kubernetes.md`.
- [ ] Helm chart values passthroughs added only where a new shared config key
      requires one; no other chart change.

## Non-goals

- Deploying `apps/config` (the setup wizard on :3005).
- Changing the Helm chart's structure, the docs nginx image, or the
  docker-compose targets.
- Replacing GHCR publishing. ECR is additive (phase B).

## Known constraints

- **Phase C cannot be CI-verified.** Its slices trade CI confidence for deploy-time
  confidence. Budget a scratch AWS account and accept that gate 3 here is a
  deploy-and-observe review, not a diff review. Serialize the slices so a bad deploy
  is attributable to one change.
- **API Gateway vs. Function URL**: CloudFront → Lambda Function URL with OAC is
  cheaper than API Gateway HTTP API. Grant has its own API-key/JWT system, so API
  Gateway usage plans and API keys buy nothing. Recommend Function URLs.
- **Buffered Lambda responses cap at 6 MB.** CDM export artifacts should be served as
  presigned S3 URLs rather than response bodies; presigned download already exists
  (`storage/src/s3/index.ts:129`).

## Risk flags

- [x] Tenancy / RLS / org scoping — RDS Proxy topology
- [x] Auth / sessions — CloudFront routing of auth endpoints; rate-limit buckets
      keyed on client IP depend on correct forwarded-header handling at the edge
      (`getClientIp`, `lib/headers.lib`)
- [ ] API keys / tokens
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

## Suggested active roles

PM, Principal, Senior Backend, **Senior Frontend** (OpenNext), Senior Security
(edge routing of auth paths), QA, Verifier.

## Human gate

- [ ] Gate 1: not yet sought, and blocked on phase B. Re-verify all `file:line`
      citations against `main` before requesting it — this brief was drafted against
      `0592720c` and has not been re-checked.
