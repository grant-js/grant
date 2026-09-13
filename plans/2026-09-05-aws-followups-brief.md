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
- **Status**: closed — items 2–11 shipped as
  [`2026-09-09-aws-followups-closeout-stack.md`](./2026-09-09-aws-followups-closeout-stack.md),
  merged to `main` 2026-09-13 as [#445](https://github.com/grant-js/grant/pull/445)
  (`9cac2565`). Item 1 closed earlier as #394.
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

| #     | Item                                                                                                                                                 | Why it is tier 1                                                                                                                                                                                                       | Shape                                                                                                                                                                                                                                                                                                                                        |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Bring-your-own PostgreSQL, end to end** (F13). Omitting `database` also omits the API function, the cache table, the uploads bucket and the queue. | The props say "omit `database` to bring your own" (`deploy/aws/lib/config/props.ts:132,368-372`) and the guide says it does not work. A documented path that silently yields no serving function is the worst of both. | **Own story — CLOSED.** `2026-09-05-byo-database-{brief,stack,measurements}.md`. Slices #386, #387, #390, #391, #392 into the trunk 2026-09-08; gate 4's independent security pass blocked and was remediated by #393; merged to `main` 2026-09-09 as **#394** (`98943678`). Both topologies deployed, migrated, smoke-tested and torn down. |
| **2** | **An alarm on the origin-verify warn log** (follow-on 4).                                                                                            | The slice 4 security review sustained "the Function URL is publicly reachable" **with this as the named compensating control**. It is not wired. An accepted risk whose control does not exist is an unaccepted risk.  | **CLOSED.** Slice 3, #403.                                                                                                                                                                                                                                                                                                                   |
| **3** | **Scope `ses:SendEmail` to the sending identity** (F-E). Today `Resource: "*"`.                                                                      | A compromised function can send as any verified identity in the account. Blocked on `EMAIL_FROM` not being known at synth in every configuration — solvable, not hard.                                                 | **CLOSED.** Slice 2, #401.                                                                                                                                                                                                                                                                                                                   |
| **4** | **A test asserting middleware order** (F-D). Origin verification must precede the rate limiter.                                                      | It does today and nothing holds it there. Cheap; the cost of the regression is the edge trust model.                                                                                                                   | **CLOSED.** Slice 1, #400.                                                                                                                                                                                                                                                                                                                   |

Items 2–4 are one story's worth of work and share one reviewer: they are the three
loose ends of the **edge trust model** the gate 4 security pass left. Proposed story
slug `aws-edge-trust-closeout`. Item 1 is independent and larger.

### Tier 2 — a real capability gap, decided but unbuilt

| #     | Item                                                                                                                                              | Note                                                                                                                                      |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **5** | **Credential keys resolver-backed** (F-C option 2). `classifyConfig` refuses ~15 credential-shaped keys (`deploy/aws/lib/config/env-file.ts:66`). | **CLOSED.** Slices 7–8, #407 / #408. Turns a refusal into a capability. Touches the email, cache, storage and jobs adapters.              |
| **6** | **`API_JSON_BODY_LIMIT_BYTES` on the Lambda target, and a real `413`.** Phase B measurements findings 2 and 4.                                    | **CLOSED.** Slices 5–6, #404 / #405. The Lambda target no longer advertises a limit it cannot honour; oversize bodies return `413`/`400`. |
| **7** | **Presigned-PUT uploads** (follow-on 2). Lifts the ~6 MB Lambda payload cap.                                                                      | **CLOSED.** Slices 9–11 + F-3, #427–#430 / #440–#442. Port capability (ADR 0007); object key stored, URL derived on read.                 |
| **8** | **`project-sync` at ADR 0002 scale, and the Fargate escape hatch** (F6, program blocker 3).                                                       | **CLOSED.** Slices 12a–13, #433. Measured; hatch is opt-in; visibility window left alone.                                                 |

### Tier 3 — deferred trade-offs, each wanting its own decision

| #      | Item                                                                    | Why it is not urgent                                                                                                      |
| ------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **9**  | **RDS Proxy on by default, and RDS IAM auth** (F14; phase B's open AC). | **CLOSED as a decision.** Slice 14, #435: IAM auth is an option; the proxy default was re-decided rather than flipped on. |
| **10** | **A failed queue message waits 90 minutes for redelivery** (F9).        | **CLOSED as a decision.** Slice 13, #433: visibility window measured and left alone.                                      |
| **11** | **OpenNext** (follow-on 7).                                             | **CLOSED as a decision.** Slice 15, #434: decision stands; 180 ms boot measured; tool added.                              |

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
--heads origin` on 2026-09-05 listed five `feat/aws-adapters*` refs and eighteen
  `*aws-edge-infra*` refs. **Closed 2026-09-13:** `feat/aws-adapters*` was already
  gone; `chore/close-out-aws-edge-infra` and every `feat/aws-followups-*` head
  deleted; `git ls-remote --heads origin` matching those prefixes is empty.

## Non-goals

- Re-opening any gate on phases A, B or C. All three merged with their deviations
  recorded; this program starts from what shipped.
- Changing the Helm chart, the docker-compose target, `deploy/gateway.conf.template`,
  or the Redis/BullMQ/node-cron paths. Every one of them stayed untouched through
  three phases and stays untouched here.
- Tier 3 items as open work — they were decided in this story (#433, #434, #435),
  not deferred again.

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

- [x] Program brief acknowledged. Individual stories took their own gate 1.
      Items 2–11 closed by #445; item 1 by #394.
