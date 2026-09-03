# Stack plan — AWS edge and infrastructure

## Metadata

- **Slug**: `aws-edge-infra`
- **Story brief**: [`2026-08-21-aws-edge-infra-brief.md`](./2026-08-21-aws-edge-infra-brief.md) — approved 2026-08-27, Ale Heredia
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md) — phase **C** of three
- **Status**: `draft` — awaiting gate 2
- **Story trunk**: `feat/aws-edge-infra`
- **Base**: `main` at `440c322f`
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

| #     | Branch                          | Base    | Concern                                                     | Owner             | Review bar        | PR                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ----- | ------------------------------- | ------- | ----------------------------------------------------------- | ----------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | `feat/aws-edge-infra-routing`   | trunk   | **Routing oracle.** One declaration + three-way parity test | **QA**            | light             | [#347](https://github.com/grant-js/grant/pull/347)                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2     | `feat/aws-edge-infra-library`   | slice 1 | Construct library skeleton, props, validation, synth        | Backend + Arch    | light             | [#349](https://github.com/grant-js/grant/pull/349)                                                                                                                                                                                                                                                                                                                                                                                                    |
| 3     | `feat/aws-edge-infra-docs-site` | slice 2 | Docs on S3, CloudFront, cert, zone, Function                | Backend           | light             | [#351](https://github.com/grant-js/grant/pull/351) · [#352](https://github.com/grant-js/grant/pull/352) · [#353](https://github.com/grant-js/grant/pull/353)                                                                                                                                                                                                                                                                                          |
| 4     | `feat/aws-edge-infra-api`       | slice 3 | Network, data tier, API Lambda, migrate one-shot            | Backend + **Sec** | **security-full** | 4a [#354](https://github.com/grant-js/grant/pull/354) · [#355](https://github.com/grant-js/grant/pull/355) · [#356](https://github.com/grant-js/grant/pull/356) — 4b [#357](https://github.com/grant-js/grant/pull/357) — 4c [#360](https://github.com/grant-js/grant/pull/360) — 4d [#364](https://github.com/grant-js/grant/pull/364) · [#365](https://github.com/grant-js/grant/pull/365) — sec [#366](https://github.com/grant-js/grant/pull/366) |
| 5     | `feat/aws-edge-infra-web`       | slice 4 | OpenNext, `_next/static` from S3                            | **Frontend**      | light             | in review                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6     | `feat/aws-edge-infra-jobs`      | slice 5 | EventBridge rules generated from the job source             | Backend           | light             |                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7     | `feat/aws-edge-infra-guide`     | slice 6 | Smoke test, deployment guide, measured figures              | **QA**            | light             |                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| final | `feat/aws-edge-infra`           | `main`  | integration                                                 | Principal         | **deep**          |                                                                                                                                                                                                                                                                                                                                                                                                                                                       |

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

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                 | Disposition                                                                                                                                                                                                                                                                                                                                                                                                                                      | Owner slice     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| F1  | `cdk destroy` strands the ACM DNS-validation CNAME. ACM writes it via `DomainValidationOptions.HostedZoneId`, so CloudFormation never owns it and cannot delete it (`GrantCertificate` contains no `AWS::Route53::RecordSet`).                                                                                                                                                                                          | **Document + assert.** The deployment guide states it and gives the cleanup command; the smoke test asserts the zone returns to its baseline record count, converting an invisible leak into a test failure. Making CloudFormation own the record means abandoning the L2 `Certificate`/`fromDns` path for a custom resource — disproportionate for one inert CNAME per deploy cycle.                                                            | 7               |
| F2  | Unknown paths diverge from nginx. CloudFront returns **404** with the VitePress 404 page; nginx's `try_files $uri $uri/ /index.html` serves the **homepage with 200**.                                                                                                                                                                                                                                                  | **Document as a deliberate difference.** CloudFront is the more correct of the two — a truthful status code and a real 404 page rather than a soft-404. Changing it would make the AWS target worse to match a quirk.                                                                                                                                                                                                                            | 7               |
| F3  | S3 objects carried no `Cache-Control`.                                                                                                                                                                                                                                                                                                                                                                                  | **Fixed** in slice 3d.                                                                                                                                                                                                                                                                                                                                                                                                                           | —               |
| F4  | `cdk bootstrap` executes the app and fails on missing context for an operation that ignores it.                                                                                                                                                                                                                                                                                                                         | **Fixed** in slice 3d via `pnpm bootstrap`.                                                                                                                                                                                                                                                                                                                                                                                                      | —               |
| F5  | A scheduled job that fails is not retried. Under the Web Adapter the invocation returns the route's HTTP response, so a 500 still completes the invocation successfully and EventBridge sees nothing to retry.                                                                                                                                                                                                          | **Accept and document.** The minute-by-minute sweeps retry by definition — the next tick claims the same rows. Only `data-retention-cleanup` (daily) and the key rotation (monthly) wait a full period, and both are idempotent. Making this retryable means failing the invocation from inside the app, which the adapter gives no way to express. Queued jobs are unaffected: they report `batchItemFailures`.                                 | 7 (guide)       |
| F6  | `project-sync` now runs on the jobs function, under Lambda's 15-minute ceiling. ADR 0002 routes imports past that ceiling to a container runtime, and phase C was to wire it.                                                                                                                                                                                                                                           | **Deferred, and stated as an improvement rather than a fix.** It was previously worse — inline in the API request, under a 30-second timeout — so this slice raises the ceiling thirtyfold without reaching ADR 0002's answer. The measurement that ADR asks for (how long a 28,880-entity import takes against RDS) is still owed and still governs whether the Fargate path is needed.                                                         | follow-on story |
| F7  | **`cdk destroy` strands every log group the stack created.** Measured after slice 6's teardown: 12 stack-owned groups (7 `GrantApiLogs`, 2 `GrantWebLogs`, 1 `GrantJobsLogs`) plus 38 CDK custom-resource groups. CDK's `LogGroup` defaults to `RETAIN`, and unlike F1 this grows by one group per function per deploy cycle.                                                                                           | **Document + cleanup command, not a drive-by fix.** Deleting logs on teardown is a policy an operator may not want, and the three groups belong to slices 4, 5 and 6 — changing all of them from a jobs slice would be an unreviewed decision about log retention. Slice 7's guide gets the cleanup command, as it does for the ACM CNAME. Storage is trivial (~26 KB per group here) but the group count is not self-limiting.                  | 7               |
| F8  | The jobs function's **first two cold starts hit Lambda's 10-second init ceiling** (`INIT_REPORT … Status: timeout`), then settled at 4,196 ms. Both timeouts were during the deploy, while Aurora was resuming from zero capacity and the migration was still running.                                                                                                                                                  | **Recorded, not diagnosed.** The plausible mechanism — `createApp()` opening a connection to a cluster resuming from 0 ACU, pushing boot past the ceiling — is untested, and one deploy cannot separate it from contention with the API function and the migrate task starting at the same moment. The steady-state figure matches the API's post-bundling ~4.1 s, and the cost is one init re-run inside the invocation. Measure before tuning. | 7 (guide)       |
| F9  | **A failed queue message waits 90 minutes for redelivery.** The visibility timeout is AWS's recommended six times the consumer timeout, and the consumer may run for Lambda's full 15 minutes — so three receives to reach the dead-letter queue takes ~4.5 hours.                                                                                                                                                      | **Accept.** The alternative is a visibility window shorter than a job that legitimately runs 14 minutes, which means delivering the same database-mutating work twice. The two enqueue-only jobs tolerate the latency: `event-relay`'s durability guarantee is the every-minute sweep, not the queue, and `project-sync` records its own failure state. Revisit with a measurement of real import durations, which ADR 0002 already owes.        | follow-on story |
| F10 | **A destroy/redeploy cycle silently drops the out-of-band secrets.** The platform secret is recreated empty, so `GITHUB_CLIENT_SECRET` and `AUTH_MFA_SECRET_ENCRYPTION_KEY` are gone until `put-secrets` runs again. Hit during slice 6's second deploy: `/api/auth/github` answered **500** (`GitHub OAuth is not configured`) while every GitHub value in the template — client id, both callback URLs — was correct. | **Document in the guide, prominently.** The failure is well-behaved (a `ConfigurationError`, not a wrong-credentials 401) but the place an operator looks first — the Lambda environment — shows nothing wrong, because by design the secret was never there. Recovery is one `put-secrets` run plus up to `SECRETS_CACHE_TTL_SECONDS` (300s default) for warm containers to see it; testing inside that window looks like the fix failed.       | 7 (guide)       |

## Human gates

- [ ] Gate 2: Stack plan approved — no implementation until a human confirms.
- [x] Gate 3: Stack PRs merged into trunk (light, except slice 4 security-full).
      Slices 1–4 merged. Slice 4's `security-full` review ran and its findings are
      closed by #366 — **but the reviewer was the slice author**, so the plan's
      "independent of the slice author" condition is _not_ met. Recorded rather than
      quietly ticked; an independent pass is still owed before gate 4.
- [ ] Gate 4: Story → `main` deep review complete.

## Cleanup

- [ ] Scratch account torn down; final `cdk destroy` recorded
- [ ] `git worktree remove` (if one was created)
- [ ] Local slice branches deleted
- [ ] Stack plan status → `merged-to-main`
- [ ] Program brief updated: phase C outcome, blockers 3 and 9 closed
