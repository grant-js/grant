# Story brief — AWS edge and infrastructure

## Metadata

- **Slug**: `aws-edge-infra`
- **Date**: 2026-08-21 (drafted) · **revised 2026-08-27** for gate 1 · **revised
  2026-09-05** for gate 4
- **Author**: Ale Heredia (human) / drafted with Claude
- **Status**: **merged** — phase C is on `main` as
  [#382](https://github.com/grant-js/grant/pull/382) (`798111ac`, 2026-09-05).
  Seven slices through gate 3, then an integration PR that cleared gate 4's three
  blocking flags. Acceptance met with two criteria qualified: OpenNext was not used
  (the web app runs as a Next standalone server) and bring-your-own PostgreSQL is not
  end-to-end. Phase B merged as #338 (`7a968149`, 2026-08-27).
- **Stack plan**: [`2026-08-21-aws-edge-infra-stack.md`](./2026-08-21-aws-edge-infra-stack.md)
- **Program brief**: [`2026-08-21-aws-serverless-target-brief.md`](./2026-08-21-aws-serverless-target-brief.md)
- **Depends on**: `aws-lambda-runtime` (merged)
- **Base**: `main` at `dabc7339` at gate 1. Trunk last merged `main` at `c83e30bb`
  (#348). `main` has since moved two commits ahead of the trunk (`b0b8b669` #375,
  `b9ac825f` #376) — rebase or merge before opening the integration PR.

## Objective

Deliver the deployable artifact: a CDK construct library plus a reference app that
stands up the full AWS target under a single canonical URL, with a configuration
surface at parity with the Helm chart's `values.yaml`, and a deployment guide at
parity with `docs/deployment/kubernetes.md`.

**This is the story that decides whether the AWS target is "easy to configure and
deploy" or merely "deployable by someone who reads CDK source."** The config-surface
and smoke-test criteria are what separate the two; they are not polish.

## The bar

The platform's deployment goal is to be as easy to self-host via Docker as n8n or
Umami, and as easy to deploy into an adopter's own AWS account as Databricks. Phase C
owns the second half. Concretely, that means judging every knob by what an adopter
must _know_, not by what the stack can express.

**Honest timing.** Measured 2026-09-05, green-field into a baseline account
(`eu-central-1`, `-c ephemeral=true`). The gate-1 estimates are superseded:

| Stage                                   | Gate-1 estimate | Measured (slice 7)                          |
| --------------------------------------- | --------------- | ------------------------------------------- |
| Container image build + push            | ~3–6 min        | ~2 min (cached layers); ~10 min first-ever  |
| ACM DNS validation (`GrantCertificate`) | ~2–5 min        | **44 s**                                    |
| Everything else (`GrantPlatform`)       | ~20–30 min      | **10 min 08 s**                             |
| **Total, one command**                  | ~25–40 min      | **~12 min** cached / **~22 min** first-ever |

The claim in the docs is therefore **"one command, no manual console steps, roughly
twelve minutes with a warm Docker cache — about twenty on a first-ever build"** —
not "minutes" and not "half an hour." Subsequent deploys that change a cache
behaviour still pay CloudFront propagation.

**Cost floor.** Measured from Cost Explorer over a 16-hour up window that NAT-gateway
hours pin exactly: **≈ $93 / month** before traffic. The gate-1 guess ("tens of
dollars, NAT plus a minimum-capacity database") holds as an order of magnitude, but
the split is wrong: **Aurora is the larger half ($51)** and it is caused by three
per-minute job sweeps keeping the cluster at a flat 0.5 ACU, not by
`minCapacity`. NAT is $38 + $4 IPv4. Levers, in the order they pay: lengthen or
disable the minute sweeps; NAT instance instead of NAT Gateway; bring-your-own
database (not end-to-end yet — see stack plan F13).

## Architecture

Recorded so slices do not re-derive it.

```
                    Route 53  ──►  ACM certificate (MUST be us-east-1)
                                        │
    grant.example.com ──────────► CloudFront distribution
                                        │
        ┌───────────────┬───────────────┼────────────────┬──────────────┐
        ▼               ▼               ▼                ▼              ▼
   /graphql        /docs/*        /_next/static/*     (no /storage)   * default
   /api/*          S3 docs        web image assets                    Web Lambda
   /health          [OAC]                                             (standalone + LWA)
   /.well-known/*
   /org/* /acc/*
        │
        ▼
   API Lambda (container image, Web Adapter — phase B)
        │  in-VPC
        ├──► Aurora Serverless v2            (DB_URL; RDS Proxy opt-in)
        ├──► DynamoDB                        (CACHE_STRATEGY=dynamodb)
        ├──► Secrets Manager                 (SECRETS_AWS_SECRET_ID)
        ├──► S3 uploads                      (STORAGE_S3_BUCKET)
        └──► NAT ──► internet (webhooks, SES, GitHub OAuth)

   EventBridge Scheduler ──► Jobs Lambda ×6 rules (5 production + 1 demo-gated)
                             (no Function URL; SQS consumer for enqueue-only jobs)
```

**Deviations from this drawing, recorded so gate 4 does not treat the diagram as
the shipping topology:**

- **No ElastiCache.** `CACHE_STRATEGY=dynamodb` (phase A). DynamoDB bills per request
  and costs nothing idle.
- **RDS Proxy is opt-in, default off.** Default `DB_URL` points at the cluster
  writer. A proxy pool forfeits Aurora auto-pause (F14).
- **Jobs are a second Lambda**, not rules targeting the API function (#374).
- **Web is Next standalone + LWA**, not OpenNext (#368).

**The web app never calls the API server-side.** `apps/web` declares zero
`NEXT_PUBLIC_*` variables, and `getGraphQLUrl()` returns the bare relative string
`/graphql` (`apps/web/lib/apollo-client.ts:74`) with no server branch. Combined with
the `hooks/`-only Apollo rule in AGENTS.md, all API traffic is browser → CloudFront →
API Lambda. There is no east-west path to design, no service discovery, and the Web
Lambda has no reason to be VPC-attached.

## Routing

The canonical-URL routing table **already exists twice**: `deploy/gateway.conf.template`
(K8s and docker-compose) and `apps/web/next.config.ts:22-59` (dev only, self-documented
at line 22). CloudFront behaviors would be a third copy. The draft accepted that
implicitly. Since this brief already requires EventBridge rules be _generated_ rather
than hand-maintained, the same argument applies here and is called out as an open
question below rather than decided by omission.

Behaviors, in CloudFront's evaluation order (CloudFront matches in listed order, not
by specificity — the ordering is a review concern):

| #   | Pattern           | Origin     | Cache     | Note                                  |
| --- | ----------------- | ---------- | --------- | ------------------------------------- |
| 1   | `/graphql`        | API Lambda | disabled  |                                       |
| 2   | `/api/*`          | API Lambda | disabled  |                                       |
| 3   | `/health`         | API Lambda | disabled  |                                       |
| 4   | `/.well-known/*`  | API Lambda | short     |                                       |
| 5   | `/org/*`          | API Lambda | disabled  | see below                             |
| 6   | `/acc/*`          | API Lambda | disabled  | see below                             |
| 7   | `/api-docs*`      | API Lambda | disabled  | only when `SWAGGER_ENABLED`           |
| 8   | `/docs/*`         | S3 docs    | long      |                                       |
| 9   | `/_next/static/*` | S3 web     | immutable |                                       |
| 10  | `/_next/image*`   | Web Lambda | —         |                                       |
| 11  | `*`               | Web Lambda | disabled  | includes `/` → 307 `/{defaultLocale}` |

**Behaviors 5 and 6 avoid a wildcard in the middle.** The gateway matches
`^/org/[^/]+/prj/[^/]+/\.well-known/`. Routing `/org/*` wholesale to the API is
collision-free: every web route is locale-prefixed
(`apps/web/app/[locale]/{auth,dashboard,forbidden,invitations,reset-password,verify-email}`),
locales are `en`/`de`, and no `/org` or `/acc` web route exists. A non-well-known
`/org/...` path 404s from the API instead of from the web app — equivalent outcome.

**Two gaps versus nginx**, both covered by one CloudFront Function:

- `/api` and `/docs` without a trailing slash currently receive a 302 from nginx
  (`deploy/gateway.conf.template`). Express does not reproduce that.
- S3 REST origins behind OAC do no directory-index resolution, so `/docs/` → key
  `docs/` → 404. CloudFront's default-root-object only covers `/`.

**`/storage` is dropped, not ported.** `apps/api/src/create-app.ts:157` mounts it only
when `config.storage.provider === 'local'`. It is dead on this target.

**Docs on S3: upload under a `docs/` key prefix.** VitePress builds with
`base: '/docs/'` (`docs/.vitepress/config.ts:16`) while the nginx gateway _strips_ the
prefix (`deploy/gateway.conf.template:144`). Matching the key layout to the URL means
no rewrite anywhere; the alternative reintroduces exactly the prefix-stripping that
the K8s target needs a Traefik middleware for.

## Configuration surface

Governed by [ADR 0005](../decisions/0005-aws-target-as-a-construct-library.md): a
construct library taking CDK resource interfaces, plus a reference app taking scalars.
Bring-your-own is expressed by `IVpc` / `ICertificate` / `IBucket` / `IHostedZone`,
not by `createX: boolean`.

**Parity target.** `charts/grant-platform/values.schema.json` requires exactly one
value: `global.appUrl`. That is the bar — one required setting plus a hosted zone
should produce a working deploy.

**Most bring-your-own is already configuration, not a toggle.** Four resources CDK
never creates map to keys that already exist:

| Resource               | Existing key                                             | Owner   |
| ---------------------- | -------------------------------------------------------- | ------- |
| Postgres               | `DB_URL` (`POSTGRES_*` derivation fallback)              | phase 0 |
| Redis                  | `REDIS_HOST` / `PORT` / `PASSWORD` / `DB` / `ENABLE_TLS` | phase 0 |
| Secrets Manager secret | `SECRETS_AWS_SECRET_ID`                                  | phase B |
| Uploads bucket         | `STORAGE_S3_BUCKET`                                      | phase 0 |

Note Redis has **no URL form** — it is five discrete variables
(`packages/@grantjs/env/src/schema.ts:124-130`), unlike `DB_URL`. There is also a
second database identity, `DB_GRANT_ROLE_URL`, used to grant `SECURITY_RLS_ROLE` to
the login user; it matters if the target later moves to RDS IAM authentication.

## Acceptance criteria

Outcomes as of trunk `a3d026ab` (2026-09-05). `[x]` delivered, `[~]` superseded at
execution time, `[ ]` still open and recorded as a follow-up rather than a silent miss.

- [x] A CDK **construct library** under `deploy/aws/lib/` and a **reference app** at
      `deploy/aws/bin/grant.ts`, per ADR 0005. Constructs accept CDK resource
      interfaces so an adopter composes against existing infrastructure by replacing
      `bin/`, without forking `lib/`. _(#349.)_ VPC, certificate, hosted zone, uploads
      bucket and cache table are supported; **bring-your-own Postgres is not
      end-to-end** — omitting `database` currently drops the API function with it
      (F13).
- [x] **A configuration surface at parity with `values.yaml`**: typed props, a
      defaults file, and schema validation equivalent to `values.schema.json`.
      Configuring a deployment must not require reading CDK source. One required
      setting plus a hosted zone must be sufficient for a green-field deploy.
      _(#349 props/defaults/validation; #371 `deploy/aws/.env`, the Helm `config:`
      analogue.)_ Required context is `appUrl` + `zoneName` + `hostedZoneId`.
- [x] A synth-time assertion that a supplied certificate ARN is in `us-east-1`.
      _(#349; #352 puts the certificate in its own `us-east-1` stack.)_
- [x] **EventBridge rules are generated from the same job id/schedule source the API
      reads** — no hand-maintained parallel list. A drifted cron list fails silently
      and surfaces hours later as "a sweep stopped running". _(#374.)_ Mechanism
      superseded in the same way as the routing oracle: the schedule table lives in
      `deploy/aws` with a parity test, because a CDK app cannot import the API's
      configuration graph at synth time.
- [x] `cdk synth` output is committed and reviewed. The synthesized template is the
      **evidence** that generation produced exactly **six** rules — five production
      plus one demo-gated — and no others. See the correction below. _(#374; smoke
      test re-asserts the count on a live stack, #381.)_
- [x] The standalone migrate/seed runner from phase B (`node dist/migrate.js`) is
      wired as a deploy-time one-shot. First deploy must converge with no manual step.
      _(#357.)_ **ECS Fargate task, not Lambda** — the LWA image cannot run
      `node dist/migrate.js`. Ordered after the writer instance (#362).
- [~] ~~`apps/web` deploys via OpenNext, with `/_next/static/*` served from S3.~~
  **Superseded.** Next.js standalone behind the Lambda Web Adapter — the same
  image/LWA/Function-URL pattern as the API. The app still has **no
  `middleware.ts`** and **no `NEXT_PUBLIC_*` variables**. `_next/static` is
  served from the web image artifact, not a separate S3 origin.
  _(#368; rationale in the stack plan § Slice 5.)_
- [x] `docs/` deploys as an S3 origin under a `docs/` key prefix, with a CloudFront
      Function resolving directory indexes and the two trailing-slash redirects.
      _(#351 · #352 · #353.)_
- [x] CloudFront provides gateway routing per the table above.
      `deploy/gateway.conf.template` is **unchanged** and remains the routing path for
      the K8s and docker-compose targets. _(#347 oracle; #365 API behaviours; #368
      default / web.)_
- [x] `config.storage.provider` is S3 for this target; the `local` provider,
      `storageMiddleware()`, and `pvc-api.yaml` are untouched and still work.
      _(#360; S3 default-credential-chain fix #358.)_
- [x] **A smoke test against a deployed stack** exists and runs post-deploy. It must
      cover at least one path per CloudFront behavior — the routing table is the part
      with no CI coverage anywhere. _(#381.)_ 14/14 on a green-field deploy, coverage
      derived from `toCloudFrontBehaviours()` so an uncovered behaviour fails the run.
- [x] `docs/deployment/aws-serverless.md` written, at the depth of
      `docs/deployment/kubernetes.md`, including the timing and cost figures above as
      measured rather than estimated. _(#381.)_
- [x] Helm chart values passthroughs added only where a new shared config key requires
      one; no other chart change. _No chart diff against `main`. New keys
      (`SECURITY_ORIGIN_VERIFY_*`, `JOBS_EVENT_DISPATCH_*`) default off and are
      selected by this target's env file, so they need no Helm passthrough._

## Corrections to the draft and the program brief

Carried into the acceptance criteria above; recorded here because each was wrong in a
way that would have produced wrong evidence.

1. **"exactly the seven expected rules" was wrong — there are six.**
   `apps/api/src/jobs/index.ts:14-23` registers eight jobs; six carry a schedule and
   one of those (`demo-db-refresh`) is demo-gated, so **five production rules plus one
   conditional**. `event-relay` and `project-sync` are `schedule: ''` (enqueue-only).
   Since the synthesized template is the _evidence_ for the count, an incorrect count
   proves the wrong thing.

2. **The 6 MB Lambda cap is a functional gap, not a note.** The draft addressed
   exports via presigned download, which exists
   (`packages/@grantjs/storage/src/s3/index.ts:129`). But there is **no presigned
   upload** — `PutObjectCommand` at `s3/index.ts:45` is server-side only, so uploads
   flow through the API Lambda request body. The gateway allows `100M`
   (`deploy/gateway.conf.template:17`) and `API_JSON_BODY_LIMIT_BYTES` defaults to
   10 MB (`packages/@grantjs/env/src/schema.ts:31`) — both already exceed Lambda's
   cap. Either add presigned-PUT to `IFileStorageService`, or document an upload-size
   regression on this target. **This is a decision for gate 1, not for a slice.**

3. **The container image has never been published.** Phase B slice 6b built the ECR
   publish path but it has **never executed**, and the arm64 build was never verified
   — `docker/setup-qemu-action` covers CI, but a green-field adopter on an x86 machine
   cannot build the arm64 image locally (proven during phase B: no `qemu-aarch64`
   binfmt handler → `exec format error`). Resolution: the reference app uses
   `DockerImageCode.fromImageAsset()` at host architecture so a first deploy needs
   nothing pre-published, and the production path passes `fromEcr(...)` for the
   CI-built image.

4. **Program brief, "no `values.yaml`-equivalent config surface" (blocker 9)** is
   addressed by ADR 0005 plus the parity criterion above.

## Deviations at execution (gate 3)

Carried so gate 4 reviews what shipped, not what was drawn in August.

1. **Not OpenNext.** Slice 5 runs the Next.js standalone server behind the Lambda Web
   Adapter. ISR and `next/image` are unused here; OpenNext would have added a second
   build toolchain for features nothing consumes. AC marked `[~]`.
2. **EventBridge does not invoke the API Lambda.** Dispatch is a second function with
   no URL; `JOBS_EVENT_DISPATCH_ENABLED` defaults false so every other target is
   unchanged. The schedule table is a copy plus a parity test, same argument as
   gate 1 decision 1.
3. **Config surface landed late.** Slice 4 recorded the missing `values.yaml`
   analogue; #371 added `deploy/aws/.env` between slices 5 and 6.
4. **RDS Proxy is not the default path.** See the architecture note above.

## Non-goals

- Deploying `apps/config` (the setup wizard on :3005).
- Changing the Helm chart's structure, the docs nginx image, or the docker-compose
  targets.
- Replacing GHCR publishing. ECR is additive (phase B).
- Publishing the construct library to npm (ADR 0005, alternatives).
- **A one-click console-launch template.** The Databricks-style launchable artifact is
  the eventual goal, but it requires a registry-pullable image and asset-free
  synthesis, and OpenNext's build output does not satisfy that today. Phase C must not
  _foreclose_ it — that is why the image is registry-pullable — but does not deliver
  it.

## Known constraints

- **Phase C cannot be CI-verified.** Its slices trade CI confidence for deploy-time
  confidence. Budget a scratch AWS account and accept that gate 3 here is a
  deploy-and-observe review, not a diff review. Serialize the slices so a bad deploy
  is attributable to one change. Slice 1 is the exception and is front-loaded for
  exactly that reason.
- **API Gateway vs. Function URL**: CloudFront → Lambda Function URL with OAC is
  cheaper than an API Gateway HTTP API. Grant has its own API-key/JWT system, so API
  Gateway usage plans and API keys buy nothing. Recommend Function URLs.
- **RLS is transaction-scoped** (`apps/api/src/lib/rls/rls-context.ts:96`,
  `SET LOCAL ROLE` inside a transaction), so RDS Proxy stays multiplexed. Session-level
  `SET ROLE` would pin one proxy connection per Lambda container. Any change to that
  file is a deployment-topology change.
- **Buffered Lambda responses cap at 6 MB.** CDM export artifacts are served as
  presigned S3 URLs rather than response bodies.

## Open questions — answered at gate 1

Answered 2026-08-27; the reasoning and slice consequences are recorded in the
[stack plan](./2026-08-21-aws-edge-infra-stack.md) § Gate 1 decisions.

1. **Routing source of truth** → three copies plus a parity test. Generating
   `gateway.conf.template` would modify the K8s routing path this brief pins as
   unchanged. Slice 1 declares the table once and asserts all three agree.
2. **The upload gap** → documented here; presigned-PUT becomes its own story. The
   AWS target never had the gateway's `100M`, so this is an initial limitation of a
   new target rather than a regression, and the fix benefits every target.
3. **Bring-your-own VPC** → in scope, and free. ADR 0005 already has constructs
   accept `IVpc`; the cost is only in the reference app's green-field VPC creation,
   which lands with the data tier that needs it.

## Proposed slice order

Ordered by what is independently _deployable and observable_, since diff review buys
little here.

| #   | Slice                                                          | Verifiable by                         |
| --- | -------------------------------------------------------------- | ------------------------------------- |
| 1   | Construct library skeleton, props, validation, committed synth | **CI** — no AWS calls. Front-loaded.  |
| 2   | Docs on S3 + CloudFront + cert + zone + index Function         | Deploy. Smallest end-to-end vertical. |
| 3   | API Lambda + data tier + migrate one-shot                      | Deploy.                               |
| 4   | Web via OpenNext + `_next/static`                              | Deploy.                               |
| 5   | EventBridge rules generated from the job source                | Committed synth + deploy.             |
| 6   | Smoke test + `docs/deployment/aws-serverless.md`               | Post-deploy run.                      |

Slice 2 is deliberately the first deployed slice: it exercises certificate, hosted
zone, OAC, the `docs/` key layout and the CloudFront Function while risking only a
static site.

**Executed as seven slices plus 5b**, not this six-row draft. Routing oracle was
front-loaded as slice 1; OpenNext became Next standalone; bundle + `.env` landed as
5b. Canonical PR map: [stack plan](./2026-08-21-aws-edge-infra-stack.md) § Ordered slices.

## Risk flags

- [x] Tenancy / RLS / org scoping — RDS Proxy topology
- [x] Auth / sessions — CloudFront routing of auth endpoints; rate-limit buckets keyed
      on client IP depend on correct forwarded-header handling at the edge
      (`getClientIp`, `apps/api/src/lib/headers.lib.ts:28`)
- [ ] API keys / tokens
- [ ] Permissions / RBAC
- [ ] GDPR export / deletion / PII

## Suggested active roles

PM, Principal, Senior Backend, **Senior Frontend** (OpenNext), **Architect** (ADR 0005
and the routing-source question), Senior Security (edge routing of auth paths), QA,
Verifier.

## Human gate

- [x] Gate 1: story brief approved 2026-08-27 (Ale Heredia), with all three open
      questions answered. Citations re-verified against `dabc7339` at gate 1 and
      again against `440c322f` in the stack plan after `main` moved.
- [x] Gate 3: all seven slices merged to `feat/aws-edge-infra` (2026-09-05, #381
      last). See the stack plan for the PR map and the security-independence flag.
- [ ] Gate 4: story trunk → `main` deep review. **Not started.** Flags that must be
      visible to that review are in the stack plan § Gate 4 flags.
