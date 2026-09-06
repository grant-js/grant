# Program brief — AWS target follow-ups

> **Convention note.** Same shape as
> [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md):
> a **program brief**, not a story. It carries shared context for a set of sibling
> stories so each one's brief can be short, and it is the index a reader consults to
> tell deliberate scope from oversight. It has no stack plan of its own; each story
> below takes its own gate 1.

## Metadata

- **Slug**: `aws-followups`
- **Date**: 2026-09-05
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: draft
- **Base**: `main` at `798111ac` (phase C, #382). Every `file:line` citation below
  re-verifies against this commit.
- **Predecessor**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md)
  — phases A, B and C, all merged, all four gates cleared on each.

## Objective

Close the items the AWS serverless program deliberately carried out of phases A–C,
in the order their cost of being wrong justifies. Nothing here is a defect of what
shipped; each was recorded at the time as work with its own review surface.

## Where these come from

Three sources, consolidated so nobody has to read three plans to find them:

| Source                                                                          | Items                                                                       |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [Phase C stack plan](./2026-08-21-aws-edge-infra-stack.md) § Follow-ons         | 9 rows                                                                      |
| [Phase C stack plan](./2026-08-21-aws-edge-infra-stack.md) § Carried follow-ups | F6, F9, F13, F14 — the four whose disposition is "follow-on story"          |
| [Phase B brief](./2026-08-21-aws-lambda-runtime-brief.md) + its measurements    | `API_JSON_BODY_LIMIT_BYTES` (finding 2) and the missing `413`/`400` mapping |

## The ranking, and the axis it uses

Ranked by **what it costs to be wrong**, not by effort. A compensating control that
exists on paper, and a documented capability that does not work, both cost more than
an optimisation that is merely absent.

Three tiers. Tier 1 is proposed as the first story or two; tiers 2 and 3 stay indexed
here until they are picked up.

### Tier 1 — the platform makes a promise it does not keep

| #     | Item                                                                                                                                                 | Why it is tier 1                                                                                                                                                                                                       | Shape                           |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **1** | **Bring-your-own PostgreSQL, end to end** (F13). Omitting `database` also omits the API function, the cache table, the uploads bucket and the queue. | The props say "omit `database` to bring your own" (`deploy/aws/lib/config/props.ts:132,368-372`) and the guide says it does not work. A documented path that silently yields no serving function is the worst of both. | **Own story** — brief drafted ⇩ |
| **2** | **An alarm on the origin-verify warn log** (follow-on 4).                                                                                            | The slice 4 security review sustained "the Function URL is publicly reachable" **with this as the named compensating control**. It is not wired. An accepted risk whose control does not exist is an unaccepted risk.  | Slice — pairs with 3 and 4      |
| **3** | **Scope `ses:SendEmail` to the sending identity** (F-E). Today `Resource: "*"`.                                                                      | A compromised function can send as any verified identity in the account. Blocked on `EMAIL_FROM` not being known at synth in every configuration — solvable, not hard.                                                 | Slice — pairs with 2 and 4      |
| **4** | **A test asserting middleware order** (F-D). Origin verification must precede the rate limiter.                                                      | It does today and nothing holds it there. Cheap; the cost of the regression is the edge trust model.                                                                                                                   | Slice — pairs with 2 and 3      |

Items 2–4 are one story's worth of work and share one reviewer: they are the three
loose ends of the **edge trust model** the gate 4 security pass left. Proposed story
slug `aws-edge-trust-closeout`. Item 1 is independent and larger.

### Tier 2 — a real capability gap, decided but unbuilt

| #     | Item                                                                                                                                              | Note                                                                                                                                                                                                                               |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **5** | **Credential keys resolver-backed** (F-C option 2). `classifyConfig` refuses ~15 credential-shaped keys (`deploy/aws/lib/config/env-file.ts:66`). | Turns a refusal into a capability. Touches the email, cache, storage and jobs adapters, which read them from `process.env`. **Benefits every target, so it is not an AWS story** — it is an adapters story that unblocks one.      |
| **6** | **`API_JSON_BODY_LIMIT_BYTES` on the Lambda target, and a real `413`.** Phase B measurements findings 2 and 4.                                    | Today the API advertises 10 MB and Lambda rejects at **5.32 MiB of raw CDM**; exceeding either returns `500 INTERNAL_ERROR`. The decision was assigned to "slice 5 or 6" of phase B and never taken. Two changes, one small story. |
| **7** | **Presigned-PUT uploads** (follow-on 2). Lifts the ~6 MB Lambda payload cap.                                                                      | Changes `IFileStorageService` in `@grantjs/core` — **the only item in this whole program that touches the domain core**. Architect sign-off. Benefits every target; the nginx gateway already allows 100 MB.                       |
| **8** | **`project-sync` at ADR 0002 scale, and the Fargate escape hatch** (F6, program blocker 3).                                                       | The path is wired and one import measured at **208 s / 283 entities**. ADR 0002 asks about 28,880. Needs the fixture before it needs the escape hatch — measure first, then decide whether to build.                               |

### Tier 3 — deferred trade-offs, each wanting its own decision

| #      | Item                                                                    | Why it is not urgent                                                                                                                                                            |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **9**  | **RDS Proxy on by default, and RDS IAM auth** (F14; phase B's open AC). | Proxy is off because a persistent pool forfeits Aurora auto-pause — measured at ~$58/month. IAM auth needs one additive `password?: () => Promise<string>` on `DatabaseConfig`. |
| **10** | **A failed queue message waits 90 minutes for redelivery** (F9).        | Visibility timeout is 6× a consumer that may run 15 minutes. Revisit **with** item 8's measurement, not before — the number that fixes it is the one ADR 0002 already owes.     |
| **11** | **OpenNext** (follow-on 7).                                             | The Next standalone server on Lambda works and is measured at 526–630 ms cold. This is an optimisation with its own migration.                                                  |

## Shared constraints

Inherited unchanged from the program, and they bind every story below:

- **Additive and configuration-driven.** Nothing is replaced. A reviewer must be able
  to check out the trunk, change no configuration, and observe behavior identical to
  `main`. This is why item 1 is "a second `DB_URL` path", not "make `database`
  optional by deleting the guard".
- **The construct library is the contract, `bin/` is the replaceable layer**
  ([ADR 0005](../decisions/0005-aws-target-as-a-construct-library.md)). An adopter
  composes against `deploy/aws/lib/` by writing their own `bin/grant.ts`. A follow-up
  that makes composition require a fork of `lib/` has failed regardless of what it
  achieves.
- **Evidence is a recorded deploy, not a diff**, for anything past synth. Phase C's
  verification model applies: `cdk destroy` after every deployed slice, and the
  account measured back to baseline in **both** regions — checking the platform
  region alone reported clean while `GrantCertificate` was still standing in
  `us-east-1` (F15).
- **The scratch AWS account is at baseline** as of 2026-09-05. Two residues are known
  and documented: F1's ACM validation CNAME (idempotent per domain) and F7's log
  groups (82 → 90, one per function per cycle).

## Housekeeping, not a story

Recorded here because it was ticked in two plans and is not true:

- **Remote slice branches for phases A and C were never deleted.** `git ls-remote
--heads origin` on 2026-09-05 lists five `feat/aws-adapters*` refs and eighteen
  `*aws-edge-infra*` refs. Local branches are gone and phase B's remotes are
  genuinely deleted. Both stack plans have been corrected; the deletion itself is one
  command and needs no story.

## Non-goals

- Re-opening any gate on phases A, B or C. All three merged with their deviations
  recorded; this program starts from what shipped.
- Changing the Helm chart, the docker-compose target, `deploy/gateway.conf.template`,
  or the Redis/BullMQ/node-cron paths. Every one of them stayed untouched through
  three phases and stays untouched here.
- Tier 3 items, until something makes them tier 2.

## Program-level risk flags

- [x] Auth / sessions — the edge trust model (items 2–4)
- [x] API keys / tokens — items 5 and 9 are entirely credential handling
- [x] Tenancy / RLS / org scoping — item 1 changes which database the platform serves
      against; RLS depends on the transaction-scoped `SET LOCAL` at
      `apps/api/src/lib/rls/rls-context.ts:96-104`
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

Each story re-states the subset that applies to it.

## Proposed order

1. **`byo-database`** — item 1. Brief drafted:
   [`2026-09-05-byo-database-brief.md`](./2026-09-05-byo-database-brief.md).
2. **`aws-edge-trust-closeout`** — items 2, 3, 4. One reviewer, one story.
3. Tier 2, re-ranked once 1 and 2 land. Item 6 is the cheapest and item 8 is the one
   whose answer changes two other items.

Reversing 1 and 2 is defensible — 2 is smaller and closes a security control. The
order above puts item 1 first because it is the one an adopter hits on day one.

## Human gate

- [ ] Program brief acknowledged. Individual stories take their own gate 1.
