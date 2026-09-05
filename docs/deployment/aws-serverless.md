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

**PostgreSQL and Redis are not something you bring.** Unlike the Docker and Kubernetes targets, this one creates its own data tier: Aurora replaces PostgreSQL and DynamoDB replaces Redis, so a green-field deploy needs no cluster of either. DynamoDB bills per request and genuinely costs nothing idle; Aurora is configured to scale to zero but does not reach it in the default configuration — see [Why the database does not reach zero](#why-the-database-does-not-reach-zero).

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
- **Secrets** — `GITHUB_CLIENT_SECRET` and `AUTH_MFA_SECRET_ENCRYPTION_KEY` — also go in `.env`, but are **never** written to the template. CloudFormation cannot hold a literal secret without it being readable by anyone who can describe the stack. They are written to the platform secret out of band, after the deploy, by a separate command.

`cdk deploy` prints a reminder naming the keys it did not carry.

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

Add `--register you@example.com` to also create an account through the REST API — the one check that writes.

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

## Bring your own VPC, certificate or zone

`bin/grant.ts` is the layer you **replace**, not fork. The constructs in `deploy/aws/lib/` accept CDK resource interfaces — `IVpc`, `ICertificate`, `IBucket`, `IHostedZone` — so composing against infrastructure you already run means writing your own version of that one file while staying on upstream `lib/`. Forking the library means porting every later fix by hand. See [ADR 0005](https://github.com/grant-js/grant/blob/main/decisions/0005-aws-target-as-a-construct-library.md).

If you only need to reuse an **existing certificate**, pass `-c certificateArn=…`. It must be in `us-east-1`; the app asserts this rather than letting CloudFront reject it at deploy time.

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

| #   | Limitation                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | `cdk destroy` strands the **ACM validation CNAME**. ACM owns it, not CloudFormation. Idempotent per domain, so it does not accumulate.                                                                                                                                          |
| F2  | Unknown paths under `/docs/` **diverge from nginx**: CloudFront returns a real 404, nginx serves the docs homepage with 200. CloudFront's is arguably the better behaviour, but it is a difference between targets.                                                             |
| F5  | A failed **scheduled** run is not retried — under the Web Adapter a 500 still completes the invocation successfully. Queued work _is_ retried three times, then dead-lettered.                                                                                                  |
| F7  | **Log groups survive teardown** and grow by one per function per deploy cycle. Cleanup command above.                                                                                                                                                                           |
| F10 | A destroy/redeploy cycle **drops the out-of-band secrets** — the platform secret is recreated empty. Re-run `put-secrets`, then allow up to `SECRETS_CACHE_TTL_SECONDS` (default 300 s) for warm containers to see it. Testing inside that window looks exactly like a failure. |
| —   | **Uploads are capped at ~6 MB**, Lambda's request payload limit. The nginx gateway allows 100 MB. Presigned-PUT uploads are tracked as separate work and would lift the cap on every target.                                                                                    |
| —   | **Client IP collapses to loopback.** The API sees `127.0.0.1` rather than the viewer address, so rate limiting keys on a single bucket. Do not rely on per-IP limits on this target yet.                                                                                        |
| —   | **The Function URLs answer the internet.** They are guarded by the origin-verify shared secret rather than by IAM — see [Security model](#security-model).                                                                                                                      |

## Related

- [Deployment overview](/deployment/self-hosting)
- [Docker deployment](/deployment/docker) — Compose, images, and demo stack
- [Kubernetes (Helm)](/deployment/kubernetes) — the same images on a cluster
- [Environment setup](/deployment/environment)
