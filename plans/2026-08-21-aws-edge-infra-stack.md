# Stack plan — AWS edge and infrastructure

## Metadata

- **Slug**: `aws-edge-infra`
- **Story brief**: [`2026-08-21-aws-edge-infra-brief.md`](./2026-08-21-aws-edge-infra-brief.md) — approved 2026-08-27, Ale Heredia; **ready-for-main** 2026-09-05
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **C** of three
- **Status**: `merged-to-main` — trunk merged as
  [#382](https://github.com/grant-js/grant/pull/382) (`798111ac`, 2026-09-05, squash),
  so the trunk is not an ancestor of `main`; content was verified identical before
  merging. All four gates cleared. The three gate 4 blocking flags cleared in the
  integration PR: teardown recorded, `main` merged, and an independent security review
  run whose one High finding (F-A) was fixed there.
- **Story trunk**: `feat/aws-edge-infra`
- **Base**: `main` at `440c322f` at gate 2. Trunk last merged `main` at `c83e30bb`
  (#348, 2026-08-29).
- **Measurements**: `plans/2026-08-21-aws-edge-infra-measurements.md` — created by slice 1, appended to by every deployed slice
- **Governing ADR**: [0005](../decisions/0005-aws-target-as-a-construct-library.md)
- **worktree_path**: **not required.** `git worktree list` shows the main checkout
  plus two dependency-bump worktrees; no other story is in flight. Revisit if the
  presigned-upload story (below) runs in parallel.

## Citation re-verification

`main` moved after gate 1 (`dabc7339` → `440c322f`: #341 version packages, #343
changelog generator). All fourteen of the brief's citations re-verified against
`440c322f`:

| Citation                                             | Status |
| ---------------------------------------------------- | ------ |
| `apps/web/lib/apollo-client.ts:74` — bare `/graphql` | holds  |
| `apps/api/src/create-app.ts:157` — storage gate      | holds  |
| `storage/src/s3/index.ts:129` — presigned download   | holds  |
| `storage/src/s3/index.ts:45` — server-side put       | holds  |
| `apps/api/src/lib/rls/rls-context.ts:96`             | holds  |
| `apps/api/src/lib/headers.lib.ts:28` — `getClientIp` | holds  |
| `docs/.vitepress/config.ts:16` — `base: '/docs/'`    | holds  |
| `deploy/gateway.conf.template:17` — `100M`           | holds  |
| `deploy/gateway.conf.template:144` — docs rewrite    | holds  |
| `env/src/schema.ts:31` — 10 MB body limit            | holds  |
| `apps/web/next.config.ts:22` — dev-only comment      | holds  |
| `apps/api/src/jobs/*.job.ts` — 6 scheduled jobs      | holds  |
| `apps/web/middleware.ts` — absent                    | holds  |
| `NEXT_PUBLIC_*` in `apps/web` — zero                 | holds  |

## Gate 1 decisions

The brief's three open questions, answered 2026-08-27. Recorded here because each
determined a slice.

1. **Routing source of truth → three copies plus a parity test.** Generating
   `deploy/gateway.conf.template` would modify the K8s routing path the brief pins as
   unchanged, giving a phase C bug a blast radius that reaches the existing
   deployment. Instead slice 1 declares the table once and asserts the three agree.
   Additive; `gateway.conf.template` is not touched.
2. **Upload cap → documented, with a separate story for presigned-PUT.** The AWS
   target is new and never had the gateway's `100M`, so this is an initial limitation
   rather than a regression. Adding presigned-PUT means changing
   `IFileStorageService` in `@grantjs/core`, both storage adapters, an API handler and
   the web upload flow — a vertical feature that would be reviewed by the wrong eyes
   inside a deploy slice, and one that benefits every target. It becomes its own story.
3. **Bring-your-own VPC → in scope at the library layer, free.** ADR 0005 already has
   constructs accept `IVpc`, so referencing an existing VPC costs one optional prop
   and no toggle. The expense is only in the _reference app's_ green-field VPC
   creation and its validation, which lands in slice 4 alongside the data tier that
   needs it.

## Governing constraint

Inherited and unchanged: **additive and configuration-driven.** For phase C that has
a sharper edge than for A or B, because phase C adds no configuration to existing
targets at all — it adds a directory. The parity property is therefore:

> With `deploy/aws/` present and never invoked, `charts/`, `docker-compose*.yml`,
> `deploy/gateway.conf.template` and every application path behave identically to
> `main`.

The one file that could violate this is `deploy/gateway.conf.template`, and gate 1
decision 1 keeps it read-only for the whole story. Any slice proposing to edit it has
left the plan.

## Verification model

**Phase C cannot be CI-verified past slice 2**, so the evidence standard is different
and has to be stated up front or it will be negotiated per slice.

| Slice | Evidence                                                                 |
| ----- | ------------------------------------------------------------------------ |
| 1–2   | CI. Parity test and committed `cdk synth` run in `Lint, build, test`.    |
| 3–7   | **A recorded deploy.** Appended to the measurements file, before review. |

Every deployed slice records, in `plans/2026-08-21-aws-edge-infra-measurements.md`:

- `cdk deploy` wall-clock time, per stage where separable
- the resources created, from `cdk diff` output rather than from memory
- the observable check performed against the live stack, with its output
- **`cdk destroy` run to completion, and what it left behind.** An adopter's first
  real action after evaluating is to tear down. If destroy strands resources, the
  target is not adoptable, and that is only discoverable by doing it every time.

Slices deploy **serially into one scratch account**. Two concurrent deploys make a
failure unattributable, which is the whole reason for serializing.

## Active roles

- [x] Project Manager — gate decisions
- [x] Principal Engineer — slice order, integration, scratch-account hygiene
- [x] **Senior QA — slices 1 and 7.** The load-bearing role again: slice 1 is the
      only drift oracle this story gets, and slice 7 is the only end-to-end check.
- [x] Senior Backend — slices 2, 4, 6
- [x] Senior Frontend — slice 5 (OpenNext)
- [x] **Architect — slice 2** (props surface is an API per ADR 0005)
- [x] **Senior Security — slice 4, blocking**, independent of the slice author
- [x] Verifier — after every slice

## Ordered slices (PRs)

| #     | Branch                              | Base     | Concern                                                     | Owner             | Review bar        | PR                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----- | ----------------------------------- | -------- | ----------------------------------------------------------- | ----------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/aws-edge-infra-routing`       | trunk    | **Routing oracle.** One declaration + three-way parity test | **QA**            | light             | [#347](https://github.com/grant-js/grant/pull/347)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2     | `feat/aws-edge-infra-library`       | slice 1  | Construct library skeleton, props, validation, synth        | Backend + Arch    | light             | [#349](https://github.com/grant-js/grant/pull/349)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 3     | `feat/aws-edge-infra-docs-site`     | slice 2  | Docs on S3, CloudFront, cert, zone, Function                | Backend           | light             | [#351](https://github.com/grant-js/grant/pull/351) · [#352](https://github.com/grant-js/grant/pull/352) · [#353](https://github.com/grant-js/grant/pull/353)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 4     | `feat/aws-edge-infra-api`           | slice 3  | Network, data tier, API Lambda, migrate one-shot            | Backend + **Sec** | **security-full** | 4a [#354](https://github.com/grant-js/grant/pull/354) · [#355](https://github.com/grant-js/grant/pull/355) · [#356](https://github.com/grant-js/grant/pull/356) — 4b [#357](https://github.com/grant-js/grant/pull/357) · [#358](https://github.com/grant-js/grant/pull/358) · [#361](https://github.com/grant-js/grant/pull/361) · [#362](https://github.com/grant-js/grant/pull/362) — 4c [#360](https://github.com/grant-js/grant/pull/360) — 4d [#364](https://github.com/grant-js/grant/pull/364) · [#365](https://github.com/grant-js/grant/pull/365) — sec [#366](https://github.com/grant-js/grant/pull/366) |
| 5     | `feat/aws-edge-infra-web`           | slice 4  | Next standalone + LWA (not OpenNext); `_next/static`        | **Frontend**      | light             | [#368](https://github.com/grant-js/grant/pull/368) · [#369](https://github.com/grant-js/grant/pull/369)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 5b    | `feat/aws-edge-infra-lambda-bundle` | slice 5  | Bundle the API for cold start; `.env` config surface        | Backend           | light             | [#370](https://github.com/grant-js/grant/pull/370) · [#371](https://github.com/grant-js/grant/pull/371) · [#372](https://github.com/grant-js/grant/pull/372)                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 6     | `feat/aws-edge-infra-jobs`          | slice 5b | EventBridge rules generated from the job source             | Backend           | light             | [#374](https://github.com/grant-js/grant/pull/374)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7     | `feat/aws-edge-infra-guide`         | slice 6  | Smoke test, deployment guide, measured figures              | **QA**            | light             | [#381](https://github.com/grant-js/grant/pull/381)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| final | `feat/aws-edge-infra`               | `main`   | integration                                                 | Principal         | **deep**          | **not opened**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

### Slice 1 — routing oracle

**No CDK.** A test over files that already exist, so it lands and pays off even if the
rest of the story stalls — it catches drift between the gateway and the dev rewrites
today, which nothing currently does.

- One declaration of the canonical path → target table.
- A test asserting `deploy/gateway.conf.template` and `apps/web/next.config.ts`
  rewrites both agree with it.
- **An explicit intentional-divergence list**, each entry carrying its reason. Known
  starting set: `/storage` (gateway only; `create-app.ts:157` mounts it for the local
  provider), `/example` (gateway only), the root-level Swagger asset rewrites
  (`next.config.ts` only, a dev quirk). Drift is then _an unlisted difference_, not
  _any difference_ — otherwise the test is noise and gets deleted.
- Seeds the measurements file.

Written before the CloudFront behaviours exist, deliberately: an oracle written
afterwards records whatever the implementation produced.

### Slice 2 — construct library

Per ADR 0005. Props take `IVpc` / `ICertificate` / `IBucket` / `IHostedZone`; the
reference app takes scalars. Includes the `us-east-1` certificate-ARN assertion, the
defaults file, schema validation at parity with `values.schema.json`, and the first
committed `cdk synth`. No resources deploy. Architect co-owns because the exported
props are an API from this point.

### Slice 3 — docs site

First deployed slice, and deliberately the smallest vertical that exercises the risky
edge pieces — certificate, hosted zone, OAC, the `docs/` key prefix, the CloudFront
Function for directory indexes and trailing-slash redirects — while risking only a
static site. If cert or zone assumptions are wrong, this is where it surfaces, before
a database exists.

### Slice 4 — API and data tier

**Split into 4a/4b/4c at execution time**, as this section pre-authorised. The split
fell where the plan said it would — 4a stands alone as a deployable, destroyable unit
— and then went one step further, because 4b as scoped still bundled the proxy, the
secret, the migrate one-shot, the Lambda, DynamoDB, S3 and the edge behaviours onto
the one slice carrying a security-full bar.

- **4a** — network and data tier. Merged, deployed, destroyed.
- **4b** — the image can reach and migrate the database: RDS Proxy, the platform
  secret, the migrate one-shot and its IAM. Verified by a migration running against a
  real cluster, through the proxy the API will later use.
- **4c** — the API serves traffic: the Lambda, its Function URL, the DynamoDB cache
  table, the storage bucket and the CloudFront API behaviours. Verified by `/health`
  through the edge.

The security review splits along the same seam: credentials and network reachability
in 4b, edge header handling and rate limiting in 4c.

**The migrate one-shot is an ECS Fargate task, not a Lambda.** The LWA image cannot
run it: the adapter is a Lambda _extension_ that probes `/health` on port 4000, so a
container whose command is `node dist/migrate.js` never satisfies the runtime contract
even when the migration itself succeeds. ADR 0003 already establishes that one image
serves Lambda and Fargate alike, and `apps/api/src/migrate.ts` names "an ECS one-off
task" first among its intended runners. Fargate bills per task-second and costs
nothing idle.

The largest slice, and the only one at **security-full**: it lands VPC wiring, the
data tier, secrets, the API Lambda and the migrate one-shot, and it is where auth
paths first route through CloudFront (forwarded-header handling feeds `getClientIp`,
`apps/api/src/lib/headers.lib.ts:28`, which the rate limiter keys on).

**RDS Proxy is opt-in, default off.** A persistent proxy pool forfeits Aurora
auto-pause, which is the cost-floor the target exists to keep. The architecture
diagram in the brief is the enabled path, not the one that ships. `DB_URL` points at
the cluster writer unless `database.proxy.enabled` is set. IAM database
authentication (phase B leftover) was not added — F14.

**Expected to split** into 4a (network + data tier) and 4b (API Lambda + migrate) at
execution time if it approaches the ~30-file review ceiling — the same call phase B
made for slice 6. Flagged now rather than discovered mid-review.

### Slice 5 — web

`_next/static` to S3 and the default CloudFront behaviour, as planned. Low-risk by
construction: zero `NEXT_PUBLIC_*` and no `middleware.ts`, both re-verified above.

**Deviation, decided at execution time: not OpenNext.** The Next.js standalone server
runs behind the Lambda Web Adapter instead — the same image/LWA/Function-URL pattern
slice 4 built and deployed.

OpenNext exists to solve ISR cache persistence and image optimization on serverless,
and this app uses neither: no `revalidate`, `revalidatePath`, `revalidateTag` or
`generateStaticParams` anywhere, and zero `next/image` imports. It is an authenticated
per-tenant dashboard — dynamic SSR plus client-side Apollo. Adopting OpenNext would add
a second build toolchain and a dependency on Next 16 support that is active but not
formally verified, to buy features nothing here consumes. Next's own Adapter API went
stable in 16.2 with an official AWS adapter in development, so that plumbing may be
superseded regardless.

Revisit if ISR or image optimization is adopted, or when the official adapter ships.

**The web function uses `AWS_IAM` with Origin Access Control, where the API could
not.** Both OAC blockers were API-specific: its signing mode overwrites the viewer's
`Authorization` header, and POST requires a viewer-supplied body hash. The web app
authenticates by **cookie** and serves **GET only** — no server actions, no route
handlers, no native form posts — and the default behaviour is restricted to
GET/HEAD/OPTIONS, so no body can reach it. There is therefore no second publicly
reachable origin, and no `middleware.ts` was needed.

### Slice 5b — bundle and config surface (execution-time)

Not in the original seven. Landed between web and jobs because slice 5 measured the
API cold start at ~7.6 s, 77% of it module loading, and because slice 4 recorded
that the target still had no `values.yaml` analogue.

- **#370** bundles `dist/server.js` for Lambda; slice 7 measured API init at
  **3,776 ms**, about half the pre-bundle figure.
- **#371** (stacked on #370) adds `deploy/aws/.env` as the Helm `config:` analogue.
  Absent is fine — the stack then deploys on `AWS_TARGET_ENV_DEFAULTS` alone.
- **#372** keeps generated CDK output out of the root TypeScript project.

### Slice 6 — scheduled jobs

EventBridge rules generated from the same source the API reads. The committed `cdk
synth` diff is the evidence, and it must show **exactly six** rules — five production
plus one demo-gated. A different count is a failed slice even if the deploy works.

**The slice is larger than "rules", and the reason is in the code the earlier slices
left.** `AwsJobAdapter.schedule()` registers a handler and creates no timer, so
recurrence and dispatch both live outside the process — and neither existed:
`IJobAdapter.trigger()` had **no caller anywhere in `apps/api`**. The target ran
`node-cron` inside a Lambda, where a timer fires only while a container happens to be
thawed, which `deploy/aws/.env.example` already recorded as a known gap. Provisioning
rules without a dispatch entry point would have produced six rules that invoke nothing.

Three decisions, taken at execution time and recorded here rather than in a commit
message.

1. **Dispatch lands on a second Lambda with no Function URL.** The Lambda Web Adapter
   forwards a non-HTTP event by POSTing it to `AWS_LWA_PASS_THROUGH_PATH`, and no AWS
   event source can attach the secret CloudFront sends — so the route has to sit ahead
   of `originVerifyMiddleware`. On the API function that is an unauthenticated job
   trigger on a publicly reachable origin, which is precisely the `/health` exposure
   slice 4c deleted. On a function with no URL, `lambda:InvokeFunction` is the guard
   and AWS enforces it before any code runs — the IAM boundary the API could not have.
   It also stops sweeps competing for the API's reserved concurrency and lifts the
   30-second timeout, which exists only to match CloudFront's origin response limit.
   `JOBS_EVENT_DISPATCH_ENABLED` defaults to **false**, so every other target and the
   API function itself are unchanged.
2. **The schedule table lives in `deploy/aws` with a parity test**, not imported from
   the API. Gate 1 decision 1, applied a second time: a CDK app cannot import the API's
   configuration graph at synth time, so the copy is checked instead —
   `scheduled-jobs.test.ts` parses `apps/api/src/jobs/*.job.ts`, `env.config.ts` and
   `@grantjs/env`'s defaults, and fails if the table names a job they do not, misses
   one they do, or quotes a drifted default.
3. **The SQS queue is not optional once the provider changes.** `enqueue()` sends to
   the queue where `node-cron` ran the handler inline, so shipping rules without a
   queue and a consumer would have left `startProjectSync` accepting work nothing runs.
   Delivered together, which moves project sync off the request path — from the API's
   30-second timeout to fifteen minutes.

**EventBridge is not Unix cron**, and the difference that matters is silent:
day-of-week is 1-based there and 0-based in `node-cron`, so passing an expression
through produces a rule that deploys, fires, and fires on the wrong day. `cron.ts`
translates and refuses at synth what it cannot express.

### Slice 7 — smoke test and guide

Smoke test covering **at least one path per CloudFront behaviour** — the routing table
has no CI coverage anywhere, so this is its only end-to-end check. Plus
`docs/deployment/aws-serverless.md` at the depth of `docs/deployment/kubernetes.md`,
with the brief's timing and cost estimates **replaced by the measured figures**
accumulated across slices 3–6.

**Delivered (#381).** Green-field deploy 2026-09-05, `aws.grantjs.org`,
`-c ephemeral=true`: **14/14** smoke checks, EventBridge rule count **6**, first
account created through the live API, SES delivery 1/0/0. Total wall clock **~12 min**
with cached images. Cost floor **≈ $93 / month**, of which Aurora at a flat 0.5 ACU
is the larger half (F11).

**Slice 7's own `cdk destroy` is not in the measurements file.** Every earlier
deployed slice recorded teardown; this one recorded the deploy and the smoke run
and stopped. The scratch stack from 2026-09-05 may still be up. Blocking for gate 4
until confirmed — see F15.

## Stack setup

```sh
# Trunk
git switch -c feat/aws-edge-infra main && git push -u origin feat/aws-edge-infra

# Init with the FIRST slice branch only.
gh stack init --base feat/aws-edge-infra feat/aws-edge-infra-routing

# After each slice: commit, then BOTH, every time.
gh stack submit --auto
gh stack link --base feat/aws-edge-infra <pr> <pr>   # bottom to top

# Before the NEXT slice:
gh stack add feat/aws-edge-infra-library

# After any merge, rebase or amend below a branch:
gh stack sync
```

`--base` is not optional on `init` or `link`; omitted, the bottom PR re-points at
`main` and the stack merges past gate 4. `gh stack submit --auto` opens drafts — mark
each ready with `gh pr ready <pr>` when it is ready for gate 3.

## Dependencies / notes

- **Scratch AWS account required from slice 3.** Principal owns its lifecycle. Bootstrap
  once (`cdk bootstrap`); default qualifier is fine.
- **A registrable domain and a hosted zone in that account** are prerequisites for
  slice 3 and cannot be faked. Blocking on this at slice 3 rather than slice 1 is
  deliberate — slices 1 and 2 need no AWS access at all.
- **The container image has never been published.** Slice 4 uses
  `DockerImageCode.fromImageAsset()` at host architecture, so it does not depend on
  phase B's untested ECR path. Exercising that path is a slice 4 stretch goal, not a
  prerequisite.
- **Local e2e stack collides with CI** on the self-hosted runner. Tear it down before
  pushing, as in phases A and B.
- **Follow-on story, not part of this stack**: presigned-PUT in `IFileStorageService`,
  removing the 6 MB upload cap for every target. Gate 1 decision 2.

## Carried follow-ups

Findings from deployed slices that are deliberately **not** fixed where they were
found, recorded here so they are tracked work rather than observations in a log.

| #   | Finding                                                                                                                                                                                                                                                                                                                             | Disposition                                                                                                                                                                                                                                                                                                                                             | Owner slice          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| F1  | `cdk destroy` strands the ACM DNS-validation CNAME. ACM writes it via `DomainValidationOptions.HostedZoneId`, so CloudFormation never owns it and cannot delete it (`GrantCertificate` contains no `AWS::Route53::RecordSet`).                                                                                                      | **Documented in the guide** with cleanup command. Slice 6 refined it: the leak is idempotent per domain, not per-cycle. The original "smoke test asserts zone baseline record count" half was **not** built — `smoke.ts` is HTTP-only.                                                                                                                  | 7 ✓ / assert skipped |
| F2  | Unknown paths diverge from nginx. CloudFront returns **404** with the VitePress 404 page; nginx's `try_files $uri $uri/ /index.html` serves the **homepage with 200**.                                                                                                                                                              | **Done in guide.** Documented as a deliberate difference.                                                                                                                                                                                                                                                                                               | 7 ✓                  |
| F3  | S3 objects carried no `Cache-Control`.                                                                                                                                                                                                                                                                                              | **Fixed** in slice 3d.                                                                                                                                                                                                                                                                                                                                  | —                    |
| F4  | `cdk bootstrap` executes the app and fails on missing context for an operation that ignores it.                                                                                                                                                                                                                                     | **Fixed** in slice 3d via `pnpm bootstrap`.                                                                                                                                                                                                                                                                                                             | —                    |
| F5  | A scheduled job that fails is not retried. Under the Web Adapter the invocation returns the route's HTTP response, so a 500 still completes the invocation successfully and EventBridge sees nothing to retry.                                                                                                                      | **Done in guide.** Accepted and documented. Queued jobs are unaffected (`batchItemFailures`).                                                                                                                                                                                                                                                           | 7 ✓                  |
| F6  | `project-sync` now runs on the jobs function, under Lambda's 15-minute ceiling. ADR 0002 routes imports past that ceiling to a container runtime, and phase C was to wire it. Slice 6 measured a real import at **208 s / 283 entities** — room under 15 min, and **not** the 28,880-entity measurement ADR 0002 still owes.        | **Still a follow-on story.** Program blocker 3 is wired (the job runs) but not closed (the Fargate escape hatch is not).                                                                                                                                                                                                                                | follow-on story      |
| F7  | **`cdk destroy` strands every log group the stack created.** Measured after slice 6's teardown: stack-owned groups plus CDK custom-resource groups. CDK's `LogGroup` defaults to `RETAIN`, and unlike F1 this grows by one group per function per deploy cycle.                                                                     | **Done in guide.** Cleanup command in the teardown section.                                                                                                                                                                                                                                                                                             | 7 ✓                  |
| F8  | The jobs function's **first two cold starts hit Lambda's 10-second init ceiling** (`INIT_REPORT … Status: timeout`), then settled at 4,196 ms. Cycle 2 (function created after migrate) saw none. Plausible mechanism untested.                                                                                                     | **Missed by slice 7.** Not in `docs/deployment/aws-serverless.md` known-limitations. Steady-state ~3.8 s is in the cold-start table; the init-timeout incident is not. Fix in the integration PR or a follow-up docs commit.                                                                                                                            | 7 — **open**         |
| F9  | **A failed queue message waits 90 minutes for redelivery.** The visibility timeout is AWS's recommended six times the consumer timeout, and the consumer may run for Lambda's full 15 minutes — so three receives to reach the dead-letter queue takes ~4.5 hours.                                                                  | **Accept.** Revisit with a measurement of real import durations, which ADR 0002 already owes.                                                                                                                                                                                                                                                           | follow-on story      |
| F10 | **A destroy/redeploy cycle silently drops the out-of-band secrets.** The platform secret is recreated empty, so `GITHUB_CLIENT_SECRET` and `AUTH_MFA_SECRET_ENCRYPTION_KEY` are gone until `put-secrets` runs again.                                                                                                                | **Done in guide**, prominently.                                                                                                                                                                                                                                                                                                                         | 7 ✓                  |
| F11 | **Aurora never reaches 0 ACU.** Cluster is `minCapacity: 0` / 300 s auto-pause; observed capacity is a flat **0.5 ACU** because three sweeps run every minute. Cost Explorer agrees (0.538 ACU mean). Direct experiment (disable rules, watch pause) was **not** run.                                                               | **Done in guide** as its own section, with levers. The brief's cost-floor attribution (NAT + min-capacity DB) was corrected: Aurora is the larger half and the schedule is the cause.                                                                                                                                                                   | 7 ✓                  |
| F12 | `ApiFunctionUrl` stack output claimed "IAM-authorized … not publicly reachable." Live stack: `AuthType: NONE`, unsigned GET reaches the app (origin-verify 403).                                                                                                                                                                    | **Fixed** in slice 7. Output text now matches the accepted risk from the slice 4 security review.                                                                                                                                                                                                                                                       | —                    |
| F13 | **Bring-your-own PostgreSQL is not end-to-end.** Omitting `database` also drops the API function, which reads `DB_URL` from the platform secret the stack only creates alongside its own cluster.                                                                                                                                   | **Documented as a warning** in the guide. Follow-on: decouple the serving function from the managed cluster. Until then the green-field path always creates Aurora.                                                                                                                                                                                     | follow-on story      |
| F14 | Phase B deferred **RDS IAM authentication** (Lambda holds no DB password; RDS Proxy + IAM) to phase C. Not built. The proxy exists as an **opt-in** (`database.proxy.enabled`, default **false**) because a persistent pool forfeits Aurora auto-pause. Default path is cluster-direct with a password in the platform secret.      | **Follow-on**, not a failed AC of this story (this brief never listed IAM auth). Phase B's own AC remains open. Recorded so gate 4 does not assume the architecture diagram's `RDS Proxy ──► Postgres` is the default.                                                                                                                                  | follow-on story      |
| F15 | **Slice 7 did not record `cdk destroy`.** Verification model required teardown after every deployed slice. The 2026-09-05 scratch stack may still be running (~$93/month).                                                                                                                                                          | **Closed 2026-09-05.** `cdk destroy --all`, 39 s; account measured back to baseline in both regions and appended to the measurements file. It found a real gap: the slice 7 session destroyed `GrantPlatform` but left `GrantCertificate` and its ACM certificate standing in `us-east-1`, which a check of the platform region alone reports as clean. | Principal            |
| F16 | Slice 4's `security-full` review was performed by the **slice author**. Findings were real and #366 closed them, but the plan required a reviewer independent of the author. The assembled trunk now has three origins with three different trust models (API: origin-verify on a public Function URL; web: OAC+IAM; jobs: no URL). | **Still owed.** Belongs to gate 4's story-level pass, not a re-opening of gate 3. Blocking in the sense that gate 4 is not "light plus a skim."                                                                                                                                                                                                         | Gate 4               |

## Human gates

- [x] Gate 2: Stack plan approved — merged to `main` as [#346](https://github.com/grant-js/grant/pull/346)
      (2026-08-27), titled gates 1–2. Implementation unblocked from that point.
- [x] Gate 3: Stack PRs merged into trunk (light, except slice 4 security-full).
      All seven slices plus the 5b extras, last #381 on 2026-09-05. Slice 4's
      `security-full` review ran and its findings are closed by #366 — **but the
      reviewer was the slice author**, so the plan's "independent of the slice
      author" condition is _not_ met. Recorded rather than quietly ticked; an
      independent pass is still owed (F16 below) and belongs to gate 4, not a
      re-opening of gate 3.
- [ ] Gate 4: Story → `main` deep review complete.

## Gate 4 flags

Gate 4 is integration verification on the assembled trunk, not a second slice
review. These are the items that pass would miss if it only read the diffs:

1. **Cleared 2026-09-05 — scratch account (F15).** `cdk destroy --all` run to
   completion (39 s) and the residue table appended. Everything billed is at zero;
   the two carried residues are F1's validation CNAME (now measured as idempotent
   across two full cycles, not merely inferred) and F7's log groups, 82 → 90. The
   audit earned its place: the slice 7 session had left `GrantCertificate` running
   in `us-east-1`, which checking the platform region alone reports as clean.
2. **Blocking — merge `main` first.** Trunk is behind `main` by #375 (npm trusted
   publishing) and #376 (version packages). Opening against a stale `main` makes
   the deep review look at a merge that is not the one that will land.
3. **Blocking — independent security pass still owed.** Slice 4's accepted risk
   (Function URL is publicly reachable; origin-verify is the guard; reserved
   concurrency bounds spend not availability) is exactly where self-review is
   weakest. Gate 4 is the remaining place an independent reviewer sees the
   assembled edge. The web origin uses OAC+IAM; the API origin does not; the jobs
   function has no URL. That three-way split did not exist when slice 4 was
   reviewed.
4. **Should-fix in the integration PR — F8.** The jobs-function init-timeout is
   in the measurements file and was assigned to the guide; it is not in
   `docs/deployment/aws-serverless.md`. One paragraph in Known limitations.
5. **Not blocking, must be visible:**
   - OpenNext was not used (AC marked `[~]`).
   - RDS Proxy is **off by default** (F14).
   - RDS IAM auth (phase B leftover) was not built (F14).
   - BYO Postgres is not end-to-end (F13).
   - Program blocker 3 is wired, not closed (F6).
   - Origin-verify vs rate-limiter middleware order is untested (slice 4 residual).
   - Remote slice branches still exist on origin and locally.

## Cleanup

- [x] Scratch account torn down; final `cdk destroy` recorded (2026-09-05, both regions at baseline)
- [x] `git worktree remove` (none was created)
- [x] Local slice branches deleted (2026-09-05)
- [x] Remote slice branches deleted from origin (2026-09-05)
- [x] Stack plan status → `merged-to-main`
- [x] Program brief updated: phase C outcome, blocker 9 closed. **Blocker 3 deliberately
      not ticked** — it is wired, not closed: `project-sync` runs on the jobs Lambda
      under the 15-minute ceiling, but the only measurement is 208 s for 283 entities,
      two orders of magnitude below the scenario ADR 0002 asks about.

## Follow-ons

Carried out of this story rather than done inside it. Each is here because it is real
work with its own review surface, not because it was forgotten.

| #   | Item                                                                                                                                                                                                                     | Why it is not in phase C                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Make credential keys resolver-backed** (gate 4 F-C, option 2). `classifyConfig` now _refuses_ ~15 credential-shaped keys because Lambda env vars are template plaintext and the adapters read them from `process.env`. | Touches the email, cache, storage and jobs adapters. Benefits every target, so it is not an AWS story. Refusal is the safe interim.                          |
| 2   | **Presigned-PUT uploads.** Lifts the ~6 MB Lambda payload cap; the nginx gateway allows 100 MB.                                                                                                                          | Changes `IFileStorageService` in `@grantjs/core` plus both adapters, an API handler and the web upload flow. Vertical feature, wrong eyes in a deploy slice. |
| 3   | **Bring-your-own PostgreSQL, end to end** (F13). Omitting `database` also omits the API function, which reads `DB_URL` from the platform secret the stack creates beside its own cluster.                                | The props already document the intent; wiring it needs a second `DB_URL` path. Recorded in the library and the guide.                                        |
| 4   | **An alarm on the origin-verify warn log.** The security review sustained the public-Function-URL risk _with_ this as the named compensating control, and it is not wired.                                               | The control exists on paper only. Small, but it is observability work rather than deploy work.                                                               |
| 5   | **`project-sync` at ADR 0002 scale, and the Fargate escape hatch** (program blocker 3).                                                                                                                                  | Needs a 28,880-entity fixture. One import at 283 entities establishes the path works, not that it scales.                                                    |
| 6   | **RDS Proxy on by default, and RDS IAM auth** (F14). Proxy is off because it forfeits Aurora auto-pause; IAM auth was a phase B leftover never built.                                                                    | Both are cost/behaviour trade-offs that want their own decision, not a default flipped in an integration PR.                                                 |
| 7   | **OpenNext.** The web app runs as a Next standalone server on Lambda; the acceptance criterion is marked `[~]`.                                                                                                          | It works and is measured — 526–630 ms cold. Adopting OpenNext is an optimisation with its own migration.                                                     |
| 8   | **A test asserting middleware order** (gate 4 F-D). Origin verification must precede the rate limiter; it does today, and nothing asserts it.                                                                            | Cheap, but it belongs with the API's middleware tests rather than the deploy target.                                                                         |
| 9   | **Scope `ses:SendEmail` to the sending identity** (F-E). Currently `Resource: "*"`, so a compromised function could send from any verified identity in the account.                                                      | Needs `EMAIL_FROM` known at synth, which it is not in every configuration.                                                                                   |
