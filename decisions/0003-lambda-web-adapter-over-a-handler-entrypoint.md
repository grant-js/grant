# 0003 — Run on Lambda via the Web Adapter, not a handler entrypoint

- **Status**: Accepted
- **Date**: 2026-08-25
- **Context**: phase B of the AWS serverless target
  (`plans/2026-08-21-aws-lambda-runtime-brief.md`)
- **Supersedes**: the story brief's criterion "A Lambda handler entrypoint exists over
  `create-app.ts`"

## Context

Two ways to put an Express application on Lambda:

1. **A handler entrypoint.** A second `dist/lambda.js` exporting `handler`, with an
   adapter (`serverless-http`, `@codegenie/serverless-express`) translating Lambda
   events into Express requests.
2. **The AWS Lambda Web Adapter.** An AWS-maintained extension process, added to the
   image with one `COPY` from a public ECR image (`awsguru/aws-lambda-adapter`, see
   the correction below). It registers with the Lambda Runtime
   API, turns each invocation into an ordinary HTTP request to the app on loopback,
   and returns the response. The application stays a normal listening web server and
   knows nothing about Lambda.

Approach 1 was built first and rejected on evidence. Approach 2 is the decision.

## Decision

**The AWS target runs `dist/server.js` unchanged, behind the Lambda Web Adapter.** No
handler entrypoint, no event-adapter dependency, no second HTTP code path.

The only application change this requires is span export strategy, below.

## Why: a parallel entrypoint drifts, and it drifted immediately

The handler was written to exclude `initializeJobs()`, on the reasoning that it
registers in-process cron timers that would die with a frozen container.

**That reasoning was wrong.** With `JOBS_PROVIDER=aws`, `AwsJobAdapter.schedule()`
creates no timers — it records a handler in a Map and logs that recurrence is
provisioned externally (`packages/@grantjs/jobs/src/aws/index.ts:109-127`). Recurrence
lives in EventBridge; dispatch arrives over SQS. Timers exist only under `node-cron`.

The consequence was a defect, not a stale comment. `getJobAdapter()` returned `null`
on every invocation, and `AwsJobAdapter.enqueue()` rejects a job id with no registered
handler — so `startProjectSync` and `startProjectExport` would have thrown _"Project
sync jobs are unavailable: job adapter is not configured"_
(`apps/api/src/handlers/projects.handler.ts:145,196`). **CDM sync would have been dead
on arrival**, and nothing in the slice caught it: the unit tests mocked around the
wiring, and no e2e test exercises the Lambda path.

Under the Web Adapter that defect could not exist. `server.ts` runs, `initializeJobs()`
runs, and the behavior is whatever the configured provider does — the same as every
other deployment. **The argument is not that the bug was hard to fix. It is that a
second entrypoint has to be kept in step with the first forever, and it fell out of
step within a single slice, written by the person holding all the context.**

It also composes with [0002](./0002-long-running-cdm-sync-beyond-lambda.md), which
already commits to a container runtime for long CDM syncs: one image and one
entrypoint serve both Lambda and Fargate, rather than `dist/lambda.js` on one and
`dist/server.js` on the other.

## Why the OpenTelemetry argument did not survive

The handler was also defended on the grounds that Lambda freezes a container the
moment it responds, so `BatchSpanProcessor` loses buffered spans, and only a handler
has a return point to flush at. Under the Web Adapter there is no such point.

That does not justify the architecture, for three reasons:

1. **Tracing is off in every shipped configuration.** `TRACING_ENABLED` defaults to
   `false` (`packages/@grantjs/env/src/schema.ts`), and `docker-compose.e2e.yml`, the
   Helm configmap defaults, and `apps/api/.env.example` all set it `false`. An
   optional subsystem nobody has enabled was allowed to dictate the entrypoint.
2. **It is a configuration problem.** `SimpleSpanProcessor` exports each span as it
   ends and buffers nothing, so a freeze loses nothing. That is a strategy choice, not
   an entrypoint choice.
3. **The brief already offered the alternative** — "or the ADOT layer is adopted" —
   and ADOT's collector extension coordinates with the Lambda lifecycle itself, so the
   application would not own the flush regardless.

**OpenTelemetry is not foreign to this target, which is worth stating precisely.**
Logs reach CloudWatch from stdout; metrics reach CloudWatch as EMF; neither involves
OTel. Traces reach X-Ray through ADOT, which _is_ a distribution of OpenTelemetry —
the repo already anticipates this, mapping `TRACING_BACKEND=xray` onto the OTLP
exporter (`apps/api/src/lib/tracing/index.ts:26-29`). OTel is the vehicle for X-Ray,
not a competitor to CloudWatch.

## Consequences

**Good.** No second entrypoint, no adapter dependency, and no divergence between how
the application runs on Lambda and everywhere else. One image serves Lambda, Fargate,
and Kubernetes. The class of bug described above is structurally impossible.

**Bad.** An extra process in the execution environment, and cold start now includes
binding a port and satisfying the adapter's readiness check before the first request
is served. The image gains an AWS-specific artifact, which makes it a little less
portable than the plain runner image — phase C owns that trade.

**Neutral.** `create-app.ts` (slice 2) was justified partly by "a second entrypoint
needs app construction without the server's behavior", and that second HTTP entrypoint
no longer exists. It keeps its place on its own merits: `server.ts` went 276 → 135
lines, `migrate.ts` is a real second (non-HTTP) entrypoint over the same code, and the
extraction was a provable no-op. Had this decision come first, that slice would have
been argued differently, not skipped.

## Operating requirements

Configuration only; no application code depends on them.

| Setting                        | Value                               | Why                                                                                                                  |
| ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `AWS_LWA_PORT`                 | matches `API_PORT` (default `4000`) | the adapter's default is `8080`                                                                                      |
| `AWS_LWA_READINESS_CHECK_PATH` | `/health`                           | already mounted, and unauthenticated                                                                                 |
| `TRACING_SPAN_PROCESSOR`       | `simple`                            | only when `TRACING_ENABLED=true`; `batch` loses spans on freeze                                                      |
| `DB_BOOTSTRAP_ON_BOOT`         | `false`                             | with `node dist/migrate.js` as a separate deploy step — [ADR 0001](./0001-configuration-gated-database-bootstrap.md) |
| `JOBS_PROVIDER`                | `aws`                               | `node-cron` would create in-process timers that a frozen container cannot honour                                     |

The extension itself is added in the image, which is slice 6's work:

```dockerfile
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:1.1.0 /lambda-adapter /opt/extensions/lambda-adapter
```

> **Corrected 2026-08-26 (slice 6).** This line originally read
> `public.ecr.aws/awsguru/aws-lambda-web-adapter:<pinned>`. **That repository does not
> exist.** The published repository is `awsguru/aws-lambda-adapter` — no `web` — despite
> the project being named the Lambda Web Adapter. Confirmed against the ECR Public API
> with a known-good control on the same code path (`lambda/nodejs` returned 1000 tags,
> `awsguru/aws-lambda-web-adapter` returned 0), and by building the image.
>
> The error survived review because this ADR was written from recall and slice 4 never
> touched the Dockerfile, so no build ever executed the claim. Version pinned at 1.1.0,
> which publishes both `linux/amd64` and `linux/arm64` — the plan's Graviton
> recommendation is therefore available. Upstream also moved from `awslabs/` to
> `aws/aws-lambda-web-adapter` on GitHub.

## Alternatives considered

**Keep the handler.** Leaner cold start and explicit control of the invocation
lifecycle. Rejected: it buys those with a permanent obligation to keep two entrypoints
in step, and the evidence that this is expensive is one slice old.

**Build both and measure.** Rejected as a way of deferring a decision the evidence
already settles. Cold-start cost is the only open question, and it is not large enough
to outweigh a structural divergence.
