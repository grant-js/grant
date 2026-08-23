# Program brief — AWS serverless as a second deployment target

> **Convention note.** The `plans/` README defines two artifact types, `-brief` and
> `-stack`, one pair per story. This file is a **program brief**: shared context for
> three sibling stories, so that findings are recorded once rather than three times.
> It is not itself a story and has no stack plan. Reject it and fold its contents
> into the three story briefs if the extra file type is unwelcome.

## Metadata

- **Slug**: `aws-serverless-target`
- **Date**: 2026-08-21
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: draft
- **Base**: `main` at `0592720c` (pass 7 close-out, #303). Every `file:line` citation
  in this program re-verifies against this commit.

## Objective

Add AWS serverless (CloudFront + Lambda + S3) as a **second first-class deployment
target** for Grant, alongside the existing Helm chart, delivered as three sequential
stories.

Motivation is reducing idle compute cost, not reducing data-tier cost — VPC, NAT,
RDS, ElastiCache and Secrets Manager are already paid for and in use at the adopting
organization.

## Stories

| Phase | Story                | Brief                                                                                     | Delivers                                                | Verifiable by                                                |
| ----- | -------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------------------ |
| **A** | `aws-adapters`       | [brief](./2026-08-21-aws-adapters-brief.md) · [stack](./2026-08-21-aws-adapters-stack.md) | AWS-native `ICacheAdapter` and `IJobAdapter` strategies | **Existing CI**, on the current K8s deployment               |
| **B** | `aws-lambda-runtime` | [brief](./2026-08-21-aws-lambda-runtime-brief.md)                                         | Lambda-capable entrypoint, secrets, image, telemetry    | CI proves no-regression; AWS behavior needs a deployed stack |
| **C** | `aws-edge-infra`     | [brief](./2026-08-21-aws-edge-infra-brief.md)                                             | CDK app, config surface, CloudFront, OpenNext, docs     | Deployed AWS stack only                                      |

**Phase A is integrated** — all four slices merged to the story trunk on 2026-08-23
(#305, #306, #309, #311); gate 4 (trunk → `main`) outstanding. Phase B takes its own
gate 1 when queued, and its `file:line` citations need re-verifying first: they were
written against `0592720c` and `main` has since moved. B and C are drafted now so the
end state is visible and reviewable, not so they proceed. Each takes its own
gate 1 when its turn comes.

**Phase A ships nothing deployable to AWS.** That is deliberate. It de-risks the two
hardest adapters while the existing K8s deployment still provides a working reference
implementation to diff against, and it is independently valuable if the remaining
phases never run.

## Guiding constraint: additive and configuration-driven

**Nothing is replaced. Every capability added here is selected by configuration,
and every existing implementation keeps working unchanged.** This is the primary
design constraint on the story and overrides convenience at every decision point.

Concretely:

- `RedisCacheAdapter`, `BullMQJobAdapter`, and `NodeCronJobAdapter` are **not
  touched, deprecated, or removed**. `DynamoDbCacheAdapter` and `AwsJobAdapter`
  join them as additional `CacheFactory` / `JobFactory` strategies.
- The long-running `server.ts` entrypoint remains the default. The Lambda handler
  is an **additional** entrypoint over shared app-construction code.
- `bootstrapDatabase()` at boot stays the default behavior; the AWS target opts
  out via configuration, it is not deleted.
- The Helm chart stays fully supported and is not modified except where a new
  config key needs a values passthrough.
- Statements below of the form "Redis has zero consumers on the AWS target" mean
  _that deployment does not configure Redis_ — never that Redis support was
  removed from the codebase.

A reviewer should be able to check out the trunk, change no configuration, and
observe byte-identical behavior to `main`.

## Context: what already fits

Recorded so later slices do not re-derive it:

- **No WebSocket server exists.** No `graphql-ws` / `ws` dependency anywhere;
  subscriptions are generated resolver _types_ only. No API Gateway WebSocket
  API is needed.
- **RLS is transaction-scoped.** `apps/api/src/lib/rls/rls-context.ts:96-104`
  uses `SET LOCAL ROLE` + `set_config(..., true)` inside a transaction, so
  **RDS Proxy stays multiplexed**. Session-level `SET ROLE` would pin one proxy
  connection per Lambda container and negate the proxy entirely. Any change to
  this file is a deployment-topology change.
- **A transactional outbox already exists.** `jobs/event-relay.job.ts` is
  `enqueueOnly`, enqueued post-commit by `lib/events/drizzle-event-publisher.ts:55`
  purely as a latency optimization; the scheduled sweep is the durability
  guarantee. **Phase 1 can therefore ship cron-only, with no queue, and remain
  correct.**
- **Ports already exist for every AWS-facing concern**: `IFileStorageService`
  (S3 adapter shipped), `IEmailService` (SES shipped), `ITelemetryAdapter`
  (CloudWatch shipped), `ICacheAdapter`, `IJobAdapter`.
- **All four `ICacheAdapter.keys()` call sites use trailing-`*` patterns only**
  (`cache-handler.ts:656,670`, `project-import.service.ts:194`,
  `oauth-state.service.ts:130`), which maps to a DynamoDB `Query` with
  `begins_with`.

## Cross-cutting blockers

Indexed here; each is owned by the phase noted.

| #   | Blocker                                                                                    | Owner phase             |
| --- | ------------------------------------------------------------------------------------------ | ----------------------- |
| 1   | `bootstrapDatabase()` at boot reverses a decision recorded at `server.ts:59`; needs an ADR | B                       |
| 2   | CDM import payload vs. Lambda's 6 MB request cap; gzip ratio **unmeasured**                | B                       |
| 3   | `project-sync` may exceed the 15-minute Lambda ceiling                                     | B (design) / C (wiring) |
| 4   | Prometheus pull-scraping has no analogue on Lambda                                         | B                       |
| 5   | OTel batch spans lost on container freeze                                                  | B                       |
| 6   | Secret rotation vs. container-scoped `getEnv()` caching                                    | B                       |
| 7   | **Lambda cannot pull images from GHCR**; release publishes GHCR-only (`release.yml:282`)   | B                       |
| 8   | `apps/api/Dockerfile:95-96` is a server image, not a Lambda image; single-arch amd64       | B                       |
| 9   | No `values.yaml`-equivalent config surface for the CDK app                                 | C                       |
| 10  | No local AWS emulation in any compose file                                                 | **A**                   |

Full statements of 1–6 live in the phase B brief; 9–10 in C and A respectively.

## Program-level risk flags

- [x] Auth / sessions / MFA / AAL
- [x] API keys / tokens
- [x] Tenancy / RLS / org scoping
- [x] Permissions / RBAC
- [ ] GDPR export / deletion / PII

Each story re-states the subset that applies to it; a flag here does not
automatically force `security-full` on an unrelated slice.

## Human gate

- [ ] Program brief acknowledged. Individual stories take their own gate 1.
