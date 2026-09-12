---
title: AWS (serverless)
description: Deploy the Grant Platform to AWS with CDK — CloudFront, Lambda, Aurora Serverless v2, and one canonical APP_URL
---

# AWS (serverless)

This guide describes how to run the Grant Platform on **AWS** using the **CDK app** in the repository (`deploy/aws/`). It replaces the Docker Compose **gateway nginx** and the Kubernetes **Ingress** with a **CloudFront distribution** whose cache behaviours are generated from the same routing table, and it runs the API, web and jobs as **Lambda functions** rather than long-lived containers.

The same **canonical environment contract** applies as for Docker and Kubernetes: [`@grantjs/env`](https://github.com/grant-js/grant/blob/main/packages/@grantjs/env/src/schema.ts) variable names, with **`APP_URL`** and related URLs derived from a single input (`-c appUrl=…`). See [Environment setup](/deployment/environment) for how config maps to the runtime.

::: tip Which target should I use?
Use **Docker** for a single host, **Kubernetes** when you already run a cluster, and **AWS** when you want no host to patch and compute you pay for by the request. The trades are a **cold start on the first request** after an idle period and a **fixed monthly floor** you pay whether or not anyone visits — both measured below, in [Cold starts](#cold-starts) and [What it costs](#what-it-costs).
:::

## What you deploy

Two CloudFormation stacks, because CloudFront reads its certificate only from `us-east-1` while the platform itself lives in a region you choose:

| Stack                | Region      | Contents                                                      |
| -------------------- | ----------- | ------------------------------------------------------------- |
| **GrantCertificate** | `us-east-1` | ACM certificate for your hostname, DNS-validated in your zone |
| **GrantPlatform**    | your region | Everything else                                               |

Inside `GrantPlatform`:

| Component      | Resource                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------- |
| **Edge**       | CloudFront distribution, Route 53 A/AAAA alias records, two CloudFront Functions          |
| **API**        | Lambda (container image, Lambda Web Adapter) behind a Function URL, VPC-attached          |
| **Web**        | Lambda (Next.js standalone), Function URL, serves `/_next/static` from the same artifact  |
| **Jobs**       | Lambda with **no** public endpoint, driven by EventBridge rules and an SQS queue          |
| **Docs**       | VitePress output on S3 under a `docs/` key prefix, read through Origin Access Control     |
| **Database**   | Aurora Serverless v2 (PostgreSQL), isolated subnets, `minCapacity: 0`                     |
| **Cache**      | DynamoDB table (`CACHE_STRATEGY=dynamodb`) — no ElastiCache cluster to run                |
| **Storage**    | S3 bucket (`STORAGE_PROVIDER=s3`)                                                         |
| **Secrets**    | One Secrets Manager secret, read through `ISecretResolver` at use rather than at boot     |
| **Migrations** | An ECS Fargate one-shot task, run by a CDK trigger **before** the API function is created |
| **Network**    | VPC with public / private-egress / isolated subnets and one NAT gateway                   |

**Redis is not something you bring; PostgreSQL now is.** Unlike the Docker and Kubernetes targets, this one creates its own data tier by default: Aurora replaces PostgreSQL and DynamoDB replaces Redis, so a green-field deploy needs no cluster of either. You can serve against a PostgreSQL you already run — see [Bring your own PostgreSQL](#bring-your-own-postgresql) — but Redis remains configuration only. DynamoDB bills per request and genuinely costs nothing idle; Aurora is configured to scale to zero but does not reach it in the default configuration — see [Why the database does not reach zero](#why-the-database-does-not-reach-zero).

## Prerequisites

- An **AWS account** and credentials with permission to create the resources above. A deploy role with `AdministratorAccess` is the simple option; a least-privilege policy is not published.
- The **AWS CLI** and **Docker** on the machine you deploy from. Docker builds the API and web images locally and pushes them to ECR — no CI pipeline is required.
- **Node 22+** and **pnpm**, from a clone of the [Grant repo](https://github.com/grant-js/grant).
- A **registrable domain with a Route 53 hosted zone in the same account**. The certificate is DNS-validated against that zone, so it cannot be faked or skipped.
- **CDK bootstrapped** once per account and region — see below. You need it in **both** your platform region and `us-east-1`.

## Bootstrap

```bash
pnpm install
pnpm --filter grant-aws-deploy bootstrap aws://123456789012/eu-central-1
pnpm --filter grant-aws-deploy bootstrap aws://123456789012/us-east-1
```

The `bootstrap` script passes placeholder context. `cdk bootstrap` executes the CDK app even though it ignores every stack in it, so without those placeholders your **first** command would fail asking for configuration that the operation does not use.

## Configure

Copy the example file and edit it:

```bash
cp deploy/aws/.env.example deploy/aws/.env
```

`deploy/aws/.env` is this target's analogue of the Helm chart's `config:` block, and it is gitignored. Every key in it is a key of `@grantjs/env` — nothing is invented for AWS. Keys you leave blank keep their default, so **copying the file unedited changes nothing**.

Values layer, outermost last:

```
AWS_TARGET_ENV_DEFAULTS  →  deploy/aws/.env  →  values the stack computes itself
```

The defaults ([`deploy/aws/lib/config/defaults.ts`](https://github.com/grant-js/grant/blob/main/deploy/aws/lib/config/defaults.ts)) already pick the AWS-appropriate option for each key that has one — DynamoDB cache, S3 storage, EMF telemetry, Secrets Manager, `JOBS_PROVIDER=aws`, and migrations off at boot. You do not need to set any of them.

### Secrets

Two kinds of value are handled differently, and the difference is deliberate:

- **Configuration** goes in `.env` and is synthesized into the template.
- **Secrets** also go in `.env`, but are **never** written to the template. CloudFormation cannot hold a literal secret without it being readable by anyone who can describe the stack. They are written to the platform secret out of band, after the deploy, by a separate command.

`cdk deploy` prints a reminder naming the keys it did not carry.

**Credentials go to the platform secret, not to the function.** Anything not on that
list becomes a Lambda environment variable, and those are plaintext in the
CloudFormation template, in the function configuration and in `cdk.out` on disk —
Lambda has no equivalent of the ECS task's `Secrets`/`ValueFrom`, where the template
carries only an ARN. So the fifteen keys below are routed instead: put them in `.env`,
run `put-secrets`, and the API reads them through `ISecretResolver` at boot.

| Provider                          | Keys                                                              |
| --------------------------------- | ----------------------------------------------------------------- |
| GitHub OAuth                      | `GITHUB_CLIENT_SECRET`                                            |
| MFA                               | `AUTH_MFA_SECRET_ENCRYPTION_KEY`                                  |
| Mailgun                           | `MAILGUN_API_KEY`                                                 |
| Mailjet                           | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`                           |
| SMTP                              | `SMTP_PASSWORD`                                                   |
| SES (static keys)                 | `EMAIL_SES_CLIENT_SECRET`                                         |
| Redis                             | `REDIS_PASSWORD`                                                  |
| S3 / DynamoDB / SQS (static keys) | `STORAGE_S3_*`, `CACHE_DYNAMODB_*`, `JOBS_AWS_*` access-key pairs |
| API                               | `SECURITY_API_KEY`                                                |

The AWS access-key pairs are usually the wrong choice here: leave them blank and the
SDK's default credential chain uses the function's execution role, which the stack has
already granted exactly the access each function needs. Fill them in only to reach a
bucket, table or queue in an account the role cannot assume.

**Rotation works differently for these than for the origin secret.** They are resolved
once at boot and captured by the adapter that uses them, so a rotation reaches a running
function when it is **replaced**, not within `SECRETS_CACHE_TTL_SECONDS`. Rotate, then
roll the functions. `ORIGIN_VERIFY_SECRET` is the exception — the middleware resolves it
per request, so it does track the TTL.

**Four keys are still refused at synth**, each for its own reason, and the error says
which:

| Key                                | Why                                                                                                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_GRANT_ROLE_URL`                | A superuser URL read by `@grantjs/database` during a migration, outside the composition root where credentials are resolved. Run `db:grant-rls-role` out of band. |
| `POSTGRES_PASSWORD`                | It already has a safe path — `DB_URL` arrives through the platform secret. Use `-c dbUrlSecretArn=…` and drop the discrete parts.                                 |
| `E2E_DB_URL`, `E2E_REDIS_PASSWORD` | Test-only keys. Nothing outside `apps/api/tests` reads them, so a deployed stack has no use for them.                                                             |

## Deploy

```bash
pnpm docs:build   # the docs site is uploaded from docs/.vitepress/dist

pnpm --filter grant-aws-deploy exec cdk deploy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com \
  -c hostedZoneId=Z123456ABCDEFG \
  --require-approval never
```

Account and region come from your CLI credentials. Then apply the secrets:

```bash
pnpm --filter grant-aws-deploy put-secrets
```

That writes the secret-marked keys to the platform secret. The application resolves them per use, so this takes effect within the resolver's TTL — **no redeploy and no restart**, but also not instantly (see [F10](#known-limitations)).

### Throwaway environments

Add `-c ephemeral=true` to make teardown complete. Without it the database keeps deletion protection and the uploads bucket is retained — correct for user data, wrong for an environment you intend to destroy.

## Verify

A smoke test ships with the target. It covers **at least one path per CloudFront behaviour**, and its coverage is derived from the behaviour table rather than hand-listed, so a route added without a check fails the run:

```bash
pnpm --filter grant-aws-deploy smoke https://grant.example.com
```

Add `--register you@example.com` to also create an account through the REST API — the one check that writes. It needs `SMOKE_REGISTER_PASSWORD` set; the script never generates or prints a credential.

::: warning
That creates a **real, persistent account** and nothing cleans it up. Point it at a throwaway deployment, not one you care about.
:::

## How long it takes

Measured on 2026-09-05, green-field into an empty account, `eu-central-1`, deploying from a developer laptop over a domestic connection:

| Phase                                       | Time        |
| ------------------------------------------- | ----------- |
| Docker build and push, both images (cached) | ~2 min      |
| `GrantCertificate` (ACM + DNS validation)   | 44 s        |
| `GrantPlatform` (everything else)           | 10 min 08 s |
| **Total, one command**                      | **~12 min** |

The first-ever build of the two images, with no Docker layer cache, adds roughly 10 minutes on top. Subsequent deploys that change only application code are faster; a deploy that changes a **cache behaviour** pays CloudFront's propagation regardless.

## What it costs

The numbers below are **measured from Cost Explorer**, not from the pricing calculator. They are derived from a 16-hour period with the stack up, which the NAT gateway's 16.000 billed hours pins exactly.

| Item                             | Measured rate    | Per month (730 h) |
| -------------------------------- | ---------------- | ----------------- |
| NAT gateway                      | $0.05200 / h     | **$37.96**        |
| Public IPv4 address (the NAT's)  | $0.00500 / h     | **$3.65**         |
| Aurora Serverless v2, at 0.5 ACU | $0.14000 / ACU-h | **$51.10**        |
| Secrets Manager, one secret      | —                | **$0.40**         |
|                                  |                  | **≈ $93 / month** |

That is the floor **before any traffic**. Per-request costs (Lambda, CloudFront, DynamoDB, S3) were far below a cent per day at smoke-test volumes and are not what you budget for.

### Why the database does not reach zero

The cluster is configured `minCapacity: 0` with a 300-second auto-pause, so it _should_ cost nothing while idle. It does not, and the reason is worth understanding before you plan around it:

**Three scheduled jobs run every minute** — `event-relay-sweep`, `webhook-delivery` and `notification-delivery` — and each opens a database connection. The cluster therefore never sees 300 idle seconds and never pauses. Observed capacity sits at a flat **0.5 ACU**, and a full day's billing agrees: 8.605 ACU-hours over 16 hours up is a mean of **0.538 ACU**.

So Aurora is the single largest line item, and it is caused by the job schedule rather than by user traffic.

**Levers**, in the order they pay:

- **Lengthen or disable the per-minute sweeps.** `JOBS_*_SCHEDULE` keys move the EventBridge rules and the application's view of them together. Note that a 5-minute schedule is _not_ enough on its own — auto-pause needs 300 idle seconds, which a 5-minute sweep straddles.
- **Replace the NAT gateway with a NAT instance.** NAT exists because webhook delivery posts to arbitrary URLs, which VPC endpoints cannot serve. A t4g.nano NAT instance is roughly a tenth of the cost, at the price of an instance to patch.
- **Point at an existing database** if you already run one, via the construct library's props.

## Cold starts

Measured on the same deploy, from `Init Duration` in the Lambda REPORT lines:

| Function | Cold start     | Warm invocations               |
| -------- | -------------- | ------------------------------ |
| **Web**  | 526–630 ms     | n=61, min 9 ms, median 235 ms  |
| **API**  | 3,776 ms       | n=47, min 24 ms, median 132 ms |
| **Jobs** | 3,808–3,919 ms | n=364, min 7 ms, median 11 ms  |

The API's cold start is the only part of the experience that reads as slow, and it is paid once per idle execution environment, not per request. Everything after it is indistinguishable from a warm server.

## Canonical `APP_URL`

Pass **`-c appUrl=`** as the HTTPS URL users type in the browser, with no trailing path. The app derives from it:

- `APP_URL`, `SECURITY_FRONTEND_URL`, `OPENAPI_PRODUCTION_URL`
- `DOCS_URL` as `{APP_URL}/docs`
- `GITHUB_CALLBACK_URL` / `GITHUB_PROJECT_CALLBACK_URL` under `/api/auth/…`, **when** `GITHUB_CLIENT_ID` is set

This is the single-host model documented in [Environment setup](/deployment/environment), and the paths are the same ones [`deploy/gateway.conf.template`](https://github.com/grant-js/grant/blob/main/deploy/gateway.conf.template) serves on the other targets — a parity test asserts the three implementations agree.

## Routing

CloudFront cache behaviours are **generated** from the canonical routing table, not written by hand:

| Path pattern      | Origin    | Cached                                     |
| ----------------- | --------- | ------------------------------------------ |
| `/org/*`          | API       | no — widened pattern, per-tenant responses |
| `/acc/*`          | API       | no — widened pattern, per-tenant responses |
| `/.well-known/*`  | API       | short TTL                                  |
| `/api-docs*`      | API       | no                                         |
| `/graphql*`       | API       | no                                         |
| `/health*`        | API       | no                                         |
| `/docs/*`         | S3 (docs) | long TTL                                   |
| `/api/*`          | API       | no                                         |
| `/_next/static/*` | Web       | immutable                                  |
| `*` (default)     | Web       | no                                         |

**Anything reaching the API is uncached**: responses are per-tenant and per-session, and a cached authenticated response is a cross-tenant data leak.

Two CloudFront Functions close the gaps between CloudFront and nginx: one resolves directory indexes for the S3 origin (which does none under Origin Access Control), and one serves the `/docs` → `/docs/` and `/api` → `/api/` redirects that `gateway.conf.template` has.

## Security model

- **The API and web Function URLs are public endpoints.** They are protected by a shared secret CloudFront attaches to every origin request, and `SECURITY_ORIGIN_VERIFY_REQUIRED=true` means a missing secret **refuses** every request rather than admitting everyone. Reaching a function URL directly without the header gets you nothing, but the endpoint does answer.
- **The jobs function has no endpoint at all.** It is invoked only by EventBridge and the SQS event-source mapping.
- **No long-lived credential exists in the stack.** S3, SES and Secrets Manager access all go through the execution role.
- **The database is in isolated subnets** with no route to the internet, reachable only from the functions' security group.

## Client IP and rate limiting

The rate limiter keys on **`CloudFront-Viewer-Address`**, which the stack sets as
`SECURITY_TRUSTED_CLIENT_IP_HEADER`. CloudFront _overwrites_ that header, so unlike
`X-Forwarded-For` — which it _appends_ to, leaving the first entry attacker-controlled —
it cannot be supplied by the caller. Limits here are genuinely per-device.

**Measured, not assumed.** Six requests through the edge — a spoofed
`CloudFront-Viewer-Address`, duplicate and lowercase copies of it, one with no port, an
IPv6-shaped one, and an `X-Forwarded-For` — produced exactly one rate-limit key, the
real client address. CloudFront overwrites the header rather than appending to it, and
because a configured trusted header is consulted exclusively, the `X-Forwarded-For`
path it does append to is never read. `getClientIp()` additionally refuses any value
that is not an address, so the guarantee survives a change of CDN or origin request
policy.

One consequence worth knowing before you tune anything:

- **The default bites sooner than it reads.** 100 requests per 15 minutes is ~6.7 a
  minute for an entire browser, and a dashboard polling a running sync job exhausts it
  in minutes. Raise `SECURITY_RATE_LIMIT_MAX` rather than disabling the limiter: the
  Function URL answers the internet and origin verification is enforced _inside_ the
  function, so even a refused request costs an invocation. This is one of the few
  controls in front of that.

If the trusted header is ever absent, `getClientIp()` falls back to `req.ip` and those
requests share one bucket. That path is unreachable while origin verification refuses
every non-CDN request first — but the safety depends on middleware order and no test
asserts it.

## Observability

There is no Prometheus endpoint on this target. `METRICS_ENABLED` is `false` by default
and pull-scraping has no analogue on a function that is frozen between invocations.

| Signal      | Where it goes                                                                              |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Logs**    | CloudWatch, one log group per function, **14-day retention**                               |
| **Metrics** | CloudWatch **Embedded Metric Format**, namespace `Grant/API`, emitted inline with the logs |
| **Traces**  | `TRACING_SPAN_PROCESSOR=simple` — spans are exported per span, not batched                 |

EMF is chosen because it needs no SDK, no log-stream sequence token, and nothing flushed
before a freeze. The same reasoning drives the span processor: a buffered batch on a
freezing container is not delayed, it is **lost**, and the spans lost are
disproportionately those of the slowest requests — the ones worth having.

Log group names are `GrantPlatform-Grant{Api,Web,Jobs}Logs-*`. Note that they **survive
teardown** and accumulate across deploy cycles; the [Teardown](#teardown) section has the
cleanup command.

## Database connections

`DB_POOL_MAX` defaults to **2** on this target, against 10 elsewhere, and the reason is
structural rather than conservative: one execution environment serves one request at a
time, so a larger pool is never drawn on — it only reserves connections Aurora could
give to another environment.

What bounds a burst is therefore `DB_POOL_MAX × the function's concurrency`, and that
product is what to check against Aurora's `max_connections` before raising either. The
RDS proxy is **off** by default because it forfeits the cluster's ability to auto-pause;
enable it (`database.proxy`) if you expect concurrency high enough to exhaust the
cluster rather than the pool.

### Database authentication: password, or an IAM token

By default the application authenticates with a password, which lives in Secrets Manager
and reaches the process through the secret resolver ([ADR 0004](https://github.com/grant-js/grant/blob/main/decisions/0004-secret-resolution-through-a-port.md)) — never in the
template, never in an environment variable.

`DB_AUTH_MODE=iam` replaces it with an RDS IAM token signed from the caller's own role.
There is then no database password anywhere: nothing to rotate, leak, or store. The token
expires in about 15 minutes, which is fine for a pool because it is signed **per
connection** — `postgres.js` calls the password resolver during each backend's
authentication handshake, so connections opened an hour from now get a token signed then.
A connection already authenticated is unaffected by its token expiring.

**Three conditions must all hold, and only the first two are the stack's.** Any one of them
missing presents identically, as a password failure at connect time:

| #   | Condition                                                                                 | Who does it                                                                      |
| --- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | The database has IAM authentication enabled                                               | `database: { iamAuthentication: true }`                                          |
| 2   | The caller's role holds `rds-db:connect` on `arn:aws:rds-db:…:dbuser:<resourceId>/<user>` | the stack, when (1) is set                                                       |
| 3   | The Postgres user has been granted `rds_iam`                                              | **you**, with `GRANT rds_iam TO <user>` — no CloudFormation resource can do this |

That third row is why the default is off. The flag without the grant is a deployment that
cannot reach its database.

#### Which combinations work

**The token is signed for one endpoint.** A token signed for the cluster endpoint is
rejected by the proxy and vice versa, because the endpoint is part of the signature. This is
the trap worth knowing before you enable either:

| Topology                               | `DB_AUTH_MODE=iam`? | What to set                                                                                                                                               |
| -------------------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cluster this stack creates, no proxy   | yes                 | `database: { iamAuthentication: true }`; `DB_IAM_HOSTNAME` defaults from `DB_URL`, which is the cluster endpoint                                          |
| Cluster this stack creates, with proxy | yes                 | as above, **and** point `DB_IAM_HOSTNAME` at the proxy endpoint — the default derived from `DB_URL` is then wrong unless `DB_URL` already names the proxy |
| Bring-your-own PostgreSQL on RDS       | yes                 | you enable IAM auth and the `rds_iam` grant; set `DB_IAM_HOSTNAME`, `DB_IAM_USERNAME`, `DB_IAM_REGION`                                                    |
| Bring-your-own PostgreSQL not on RDS   | **no**              | RDS IAM tokens are an RDS feature. Use a password from a secret store                                                                                     |
| Any topology, `DB_AUTH_MODE=password`  | n/a                 | the default; nothing to configure                                                                                                                         |

`DB_IAM_USERNAME` defaults to the user in `DB_URL`. If you create a least-privilege
application user rather than using the generated master user, grant `rds_iam` to that user
and name it here.

### Why the proxy is still off by default

Re-decided rather than inherited, and the number is the reason it did not change. A proxy
holds a persistent pool, and **Aurora cannot auto-pause while any connection exists** — so
enabling it forfeits the `serverlessV2MinCapacity: 0` this target's cost model rests on.
Measured on a live deploy: **0.5 ACU and four held connections, flat across forty idle
minutes**, against a cluster that otherwise pauses to zero. Roughly **$58/month** to keep
connections warm for traffic a green-field deploy does not have yet.

Turn it on when concurrency is real: without pooling each warm execution environment holds
its own connections, and a burst exhausts `max_connections` rather than the pool. The trade
is cheap idle against tolerance for concurrency and cannot be had both ways.

## Bring your own infrastructure

`bin/grant.ts` is the layer you **replace**, not fork. The constructs in `deploy/aws/lib/` accept CDK resource interfaces — `IVpc`, `ICertificate`, `IBucket`, `IHostedZone` — so composing against infrastructure you already run means writing your own version of that one file while staying on upstream `lib/`. Forking the library means porting every later fix by hand. See [ADR 0005](https://github.com/grant-js/grant/blob/main/decisions/0005-aws-target-as-a-construct-library.md).

If you only need to reuse an **existing certificate**, pass `-c certificateArn=…`. It must be in `us-east-1`; the app asserts this rather than letting CloudFront reject it at deploy time.

What each resource supports today, so you can tell a supported path from a plausible-looking one:

| Resource           | How                                              | Status                                                                  |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| **VPC**            | `vpc?: IVpc`                                     | supported — prefer `fromVpcAttributes()` over a lookup                  |
| **Certificate**    | `-c certificateArn=…`, or `ICertificate`         | supported                                                               |
| **Hosted zone**    | `IHostedZone`                                    | supported                                                               |
| **Uploads bucket** | `storage.uploadsBucket?: IBucket`                | supported                                                               |
| **Cache table**    | `cache.table?: ITable`                           | supported — needs a `pk`/`sk` schema and a TTL on `expiresAt`           |
| **PostgreSQL**     | omit `database`, pass `-c dbUrlSecretArn=…`      | supported — see [Bring your own PostgreSQL](#bring-your-own-postgresql) |
| **SES identity**   | `-c sesIdentityArn=…`, or `email.sesIdentityArn` | supported — see [Sending mail](#sending-mail)                           |
| **Redis**          | `CACHE_STRATEGY=redis` plus `REDIS_*` in `env`   | config only — no network wiring is generated                            |

Redis is a weaker case than it looks: the keys are honoured by the application, but nothing in the stack opens a path to a cluster it did not create. You would be bringing the VPC, the security-group rule and the cluster yourself, and the DynamoDB table would still be created unless you also pass `cache.table`.

## Request body size

This target lowers `API_JSON_BODY_LIMIT_BYTES` to **5 MiB**, from the 10 MiB
`@grantjs/env` defaults to everywhere else. The reason is honesty rather than caution:
Lambda's invocation payload cap sits at a measured **5.32 MiB of raw CDM** for an
uncompressed body, so at 10 MiB the API advertised a ceiling AWS would not honour.
Between the two numbers a request was rejected by the runtime before any code ran —
**no `413`, no domain error, no audit entry, and nothing in the request log.** The
caller got an opaque failure from infrastructure the application never saw.

At 5 MiB the application refuses first, with the `413` it should always have returned.

### Gzip buys you more, and the limit does not know it

`body-parser` inflates `Content-Encoding: gzip` bodies **before** applying the limit. So
compression spends fewer bytes against Lambda's cap but not against this one:

| Client       | Bounded by                  | Effective ceiling                                            |
| ------------ | --------------------------- | ------------------------------------------------------------ |
| Uncompressed | `API_JSON_BODY_LIMIT_BYTES` | 5 MiB of CDM, roughly where Lambda would have refused anyway |
| Gzipped      | `API_JSON_BODY_LIMIT_BYTES` | 5 MiB of CDM — **earlier than Lambda would have refused**    |

That asymmetry is documented rather than engineered around. One number that is honest
about the worst case beats two that are each right half the time, and the alternative —
a route that requires `Content-Encoding: gzip` and applies a different ceiling — is
per-route behaviour for a problem one config value solves.

**Gzip large CDM anyway.** Measured over the CDM scale fixtures, the compression ratio
is **17.7% mean and 22.8% worst case**, so a gzipped body of 5 MiB carries roughly 22–28
MiB of raw CDM against Lambda's cap even though this limit stops it at 5 MiB decompressed.
The cap is not what you will hit; the pipe is much wider than the raw path.

| Profile         | Entities |  Raw JSON |  Gzipped | Ratio |
| --------------- | -------: | --------: | -------: | ----: |
| `department`    |    3,650 |  1.39 MiB | 0.23 MiB | 16.5% |
| `enterprise`    |   28,880 | 12.16 MiB | 2.22 MiB | 18.2% |
| `entropy-bound` |   28,880 | 16.99 MiB | 3.87 MiB | 22.8% |

`entropy-bound` is not a tenant — it is the least compressible document the CDM shape
permits, included so the worst case is a measurement rather than a guess.

### Raising it

If you have measured your own CDM and 5 MiB is wrong for you, override it like any other
setting — this is a default, not a ceiling:

```sh
# deploy/aws/.env
API_JSON_BODY_LIMIT_BYTES=8388608
```

Above ~5.32 MiB you are back to relying on Lambda to refuse, which it does silently.
Raise it only if your clients gzip, where the runtime cap is nowhere near binding.

Full numbers and method: `plans/2026-08-21-aws-lambda-runtime-measurements.md`
(`pnpm --filter grant-api measure:cdm-gzip` reproduces them).

## The alarm on direct origin requests

The API's Function URL answers the internet. It has to: CloudFront's Origin Access
Control cannot carry this API — `SigningBehavior: always` overwrites the viewer's
`Authorization` header, and `POST` through OAC requires the viewer to send
`x-amz-content-sha256`, which a browser doing GraphQL cannot. So the URL is public and
`originVerifyMiddleware` refuses anything arriving without the secret CloudFront attaches
as an origin custom header.

That is an accepted risk, and this alarm is its compensating control. Every deploy gets
it — a metric filter on the API log group counting refusals, and an alarm on the rate:

|          |                                                      |
| -------- | ---------------------------------------------------- |
| Metric   | `Grant/Edge` / `DirectOriginRequests`                |
| Fires at | 20 refusals in 5 minutes, sustained across 2 periods |
| Action   | none, unless `-c alarmEmail` is passed               |

Without `-c alarmEmail` the alarm still exists and still evaluates; it notifies nobody.
That is a control with a queryable history rather than no control. To be notified:

```sh
cdk deploy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com -c hostedZoneId=Z123456ABCDEFG \
  -c alarmEmail=oncall@example.com
```

AWS emails a confirmation link on the first deploy. **Until it is clicked the
subscription is `PendingConfirmation` and delivers nothing** — no template can take that
step for you, so check it before treating the alarm as wired.

The threshold is a starting point, not a measurement: nothing has yet counted how much
unsolicited traffic a deployed Function URL receives. Pass your own through
`observability` if 20 in five minutes is wrong for your hostname.

## Sending mail

`EMAIL_PROVIDER` defaults to `console`, and on that default **neither function is given
`ses:SendEmail` at all**. The permission appears only when the resolved environment says
`ses`, and it is scoped when it does:

- `Resource` is the identity ARN, not `*`. Without this a compromised function could
  send as any identity verified anywhere in the account.
- A `ses:FromAddress` condition pins the exact address in `EMAIL_FROM`, because a domain
  identity otherwise covers every mailbox at that domain and the application only ever
  sends as one.

```sh
cdk deploy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com -c hostedZoneId=Z123456ABCDEFG \
  -c emailFrom=no-reply@example.com
```

`-c emailFrom` sets `EMAIL_PROVIDER=ses` and `EMAIL_FROM`, and composes the ARN of the
**domain** identity — `arn:aws:ses:<stack region>:<account>:identity/example.com` — which
is what a real deployment usually verifies. If you verified the address itself, name the
identity outright and it is used as given:

```sh
  -c sesIdentityArn=arn:aws:ses:eu-central-1:123456789012:identity/no-reply@example.com
```

Synth refuses `EMAIL_PROVIDER=ses` without `EMAIL_FROM`, without an identity ARN, or with
an ARN that is not an SES identity. Each of those would otherwise deploy cleanly and fail
on the first email — a path nobody is watching. What synth cannot check is whether the
identity is _verified_, or verified **in this region**: SES verifies per region, and an
unverified identity fails at send time whatever the policy says.

## Bring your own PostgreSQL

Omit the `database` prop and point the stack at a database you already run. Everything
else is unchanged: the API, the web app, the docs site, the cache table, the uploads
bucket, the job queue and all six scheduled jobs are created exactly as they are on a
green-field deploy. Nothing downstream can tell which database it reached.

Both shapes below were deployed, migrated, smoke-tested and destroyed before this was
written — the numbers come from `plans/2026-09-05-byo-database-measurements.md`.

### The connection string goes in Secrets Manager, not in `.env`

`DB_URL` is **refused** from the env file, and the refusal is deliberate. Every key in
that file becomes a Lambda environment variable, which is plaintext in the
CloudFormation template, in the function configuration, and in `cdk.out` on disk. A
connection string carries a password.

So put the URL in Secrets Manager and pass the ARN:

```bash
aws secretsmanager create-secret \
  --name grant/db-url \
  --secret-string 'postgresql://user:password@db.example.com:5432/grant_db?sslmode=require'
```

The secret must be **in the same account and region as the stack** — a cross-account
secret needs a resource policy and a KMS grant the reference app does not compose — and
must hold a bare, percent-encoded connection string. No quotes, no backslashes, no
trailing newline: the value is substituted into a JSON document at deploy time and
those characters break it.

The stack renders the ARN as a <span v-pre>`{{resolve:secretsmanager:…}}`</span> dynamic reference inside
the platform secret, so the password is present at deploy time and **absent from the
template**.

Your URL is used exactly as written, `sslmode` included. The stack never rewrites it.

### Two shapes, and the one you pick decides how you migrate

|                    | In your VPC                                                                                | No VPC                                   |
| ------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| Context flags      | `-c dbUrlSecretArn` `-c vpcId` `-c vpcAzs` `-c vpcPrivateSubnetIds` `-c dbSecurityGroupId` | `-c dbUrlSecretArn`                      |
| Functions          | inside your VPC                                                                            | outside any VPC                          |
| NAT gateway        | yours                                                                                      | **none**                                 |
| Migration          | Fargate one-shot, during `cdk deploy`                                                      | `pnpm --filter grant-aws-deploy migrate` |
| Deployed resources | 79                                                                                         | 61                                       |

Green-field is 112 resources and one NAT gateway for comparison.

#### In your VPC

```bash
pnpm --filter grant-aws-deploy exec cdk deploy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com -c hostedZoneId=Z123456ABCDEFG \
  -c dbUrlSecretArn=arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf \
  -c vpcId=vpc-0123456789abcdef0 \
  -c vpcAzs=eu-central-1a,eu-central-1b \
  -c vpcPrivateSubnetIds=subnet-0aaa,subnet-0bbb \
  -c dbSecurityGroupId=sg-0123456789abcdef0
```

**The private subnets need a route out.** A Lambda ENI gets no public IP, so functions
in a subnet whose only route is an internet gateway have no egress at all — they cannot
reach Secrets Manager or ECR, and the failure looks like a database problem when it is a
routing one. Private subnets with a NAT gateway, or the interface endpoints equivalent
to it.

`-c dbSecurityGroupId` opens your database's security group to the stack's client group
on port 5432 (`network.databasePort` if yours differs). The rule is written by identity
— source is the Grant client security group, not a CIDR — so it does not widen as
subnets are added. Import the group **mutable**; `SecurityGroup.fromSecurityGroupId(…,
{ mutable: false })` makes CDK drop the call silently and you get no rule at all.

The migration is the same Fargate one-shot a green-field deploy runs, and it converges
during the first `cdk deploy`. Measured: bootstrap complete 5 minutes into a 7½-minute
deploy, against a database that had never been touched.

#### No VPC

```bash
pnpm --filter grant-aws-deploy exec cdk deploy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com -c hostedZoneId=Z123456ABCDEFG \
  -c dbUrlSecretArn=arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf
```

For a managed PostgreSQL reachable from the internet. The functions run outside a VPC,
which removes the NAT gateway — **the largest fixed cost in this target**, about
\$32/month in hourly charges alone, billed whether or not a request is served.

The trade is stated plainly: your database is reachable from the internet, and because
the functions have no fixed egress address you cannot restrict it to them by IP.
Restrict by credentials and TLS, and prefer the VPC shape if your provider supports
private networking.

A Fargate task needs subnets, so there is no deploy-time migration here. Run it
yourself, against the same secret, using the same entrypoint the Fargate task would
have run:

```bash
pnpm --filter grant-aws-deploy migrate \
  -c dbUrlSecretArn=arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf
```

It is idempotent and holds an advisory lock, so it is safe to run again and safe to run
from CI. Setting `migration.enabled: true` with no VPC is **refused at synth** rather
than silently skipped, so nobody is left believing a schema was applied.

### Your database must let the migration create a role

`migrate` runs migrations, a row-level-security role grant and the core seed in one
pass. The grant needs a login that may `CREATE ROLE`. On RDS the master user qualifies —
`rolcreaterole = t`, `rolsuper = f` — and no extra configuration is needed.

A managed PostgreSQL that withholds `CREATEROLE` fails at that step, and **on this
target the fix is to run the grant yourself, not to configure one**. `DB_GRANT_ROLE_URL`
is a superuser connection string that the application reads from the process environment
rather than through the secret resolver, so there is nowhere safe to put it here: the
env file refuses it, `props.env` refuses it, and `migrate` does not forward it to the
container. Run the grant from a session that already holds the privilege — a psql
session against your own database, using the statements in
`packages/@grantjs/database/src/grant-rls-login-role.lib.ts` — and then run `migrate`,
which is idempotent and will skip what already exists.

Nothing at synth can check this. The connection string is a `SecretValue` and opaque by
construction, so the first thing that finds out is the migration — which fails loudly
and names the database.

### Rotating the password

**A dynamic reference is copied, not linked, and `cdk deploy` will not refresh it.**
CloudFormation reads the referenced secret only while creating or updating the resource
that holds it. Rotating your secret changes nothing in the template, so there is no
update, so there is no re-resolution.

Measured: after rotating the upstream secret, `cdk deploy` with identical context
reported `GrantPlatform (no changes)` in 0 s and the platform secret still held the old
URL. A deploy after a rotation **succeeds and keeps the old credential** — which is the
failure worth knowing about, because it looks like it worked.

To rotate, write `DB_URL` into the platform secret directly (its name is the
`DatabaseSecretName` stack output); the application resolves secrets per use and picks
the new value up within `SECRETS_CACHE_TTL_SECONDS`, with no deploy. Note this has not
been measured end to end, and that a later stack update which does modify the platform
secret will overwrite the value with whatever the reference resolves to.

### What is not created

No Aurora cluster, no RDS Proxy, and no database credentials of the stack's own. The
`DatabaseSecretName` output still names the platform secret — the flat `ENV_NAME: value`
document the application resolves — which exists on every serving topology. The name is
kept for compatibility with `put-secrets`; it does not imply a database.

## Teardown

```bash
pnpm --filter grant-aws-deploy exec cdk destroy --all \
  -c appUrl=https://grant.example.com \
  -c zoneName=example.com \
  -c hostedZoneId=Z123456ABCDEFG
```

Two things survive it, both by design elsewhere rather than by defect here:

- **The ACM validation CNAME.** ACM writes it, not CloudFormation, so CloudFormation cannot remove it. It is reused per domain, so it does not accumulate across cycles. Delete it by hand from the hosted zone if you are done with the domain.
- **CloudWatch log groups.** CDK retains them by default, and unlike the CNAME this grows by one per function per deploy cycle. To clear them:

```bash
# Two prefixes, because the stack's own groups and CDK's custom-resource groups
# are named differently: GrantPlatform-… and /aws/lambda/GrantPlatform-….
aws logs describe-log-groups \
  --query 'logGroups[?contains(logGroupName, `GrantPlatform`)].logGroupName' \
  --output text | tr '\t' '\n' \
  | xargs -n1 aws logs delete-log-group --log-group-name
```

## Known limitations

Each of these was found by deploying, not by reading the code. None is a blocker; all of them are cheaper to know in advance.

| #   | Limitation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `cdk destroy` strands the **ACM validation CNAME**. ACM owns it, not CloudFormation. Idempotent per domain, so it does not accumulate.                                                                                                                                                                                                                                                                                                                                                                                            |
| F2  | Unknown paths under `/docs/` **diverge from nginx**: CloudFront returns a real 404, nginx serves the docs homepage with 200. CloudFront's is arguably the better behaviour, but it is a difference between targets.                                                                                                                                                                                                                                                                                                               |
| F5  | A failed **scheduled** run is not retried — under the Web Adapter a 500 still completes the invocation successfully. Queued work _is_ retried three times, then dead-lettered.                                                                                                                                                                                                                                                                                                                                                    |
| F7  | **Log groups survive teardown** and grow by one per function per deploy cycle. Cleanup command above.                                                                                                                                                                                                                                                                                                                                                                                                                             |
| F8  | The **jobs function can overrun Lambda's 10-second init ceiling on the very first cold starts after a deploy** — observed twice at 9,999 ms, then 4,196 ms, and not again on a later cycle where the function is created after the migration. Lambda retries init, so the effect is a slow first scheduled run rather than a failure. Consistent with contention against a resuming Aurora cluster and the migrate task, but one deploy cannot separate those causes, so treat it as a symptom to expect rather than a diagnosis. |
| F10 | A destroy/redeploy cycle **drops the out-of-band secrets** — the platform secret is recreated empty. Re-run `put-secrets`, then allow up to `SECRETS_CACHE_TTL_SECONDS` (default 300 s) for warm containers to see it. Testing inside that window looks exactly like a failure.                                                                                                                                                                                                                                                   |
| —   | **Uploads are capped at ~6 MB**, Lambda's request payload limit. The nginx gateway allows 100 MB. Presigned-PUT uploads are tracked as separate work and would lift the cap on every target.                                                                                                                                                                                                                                                                                                                                      |
| —   | **The Function URLs answer the internet.** They are guarded by the origin-verify shared secret rather than by IAM — see [Security model](#security-model).                                                                                                                                                                                                                                                                                                                                                                        |

## Related

- [Deployment overview](/deployment/self-hosting)
- [Docker deployment](/deployment/docker) — Compose, images, and demo stack
- [Kubernetes (Helm)](/deployment/kubernetes) — the same images on a cluster
- [Environment setup](/deployment/environment)
