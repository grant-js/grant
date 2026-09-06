/**
 * The construct library's configuration surface.
 *
 * Governed by [ADR 0005](../../../../decisions/0005-aws-target-as-a-construct-library.md):
 * props accept CDK **resource interfaces**, never identifier strings. Every one of
 * `IVpc`, `ICertificate`, `IBucket`, `IHostedZone` has both a `new Thing(...)`
 * producer and a `Thing.from*(...)` importer, so an adopter references existing
 * infrastructure by passing an imported handle — no `createX: boolean`, no validation
 * branch, and no need to predict which import style they need.
 *
 * The reference app (`bin/grant.ts`) is where scalars live. That split is the point:
 * an evaluator configures strings, an adopter composes handles, and neither reads
 * the other's layer.
 *
 * **This file is an API.** Adding a required prop to an exported interface is a
 * breaking change for anyone who replaced `bin/` — which is the designed extension
 * path — and is reviewed as one.
 */

import type { Duration, SecretValue } from 'aws-cdk-lib';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type { ContainerImage, ICluster } from 'aws-cdk-lib/aws-ecs';
import type { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import type { IHostedZone } from 'aws-cdk-lib/aws-route53';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import type { IQueue } from 'aws-cdk-lib/aws-sqs';

/**
 * Application environment passed through to the API container.
 *
 * Deliberately a loose record rather than a typed mirror of `@grantjs/env`. That
 * schema has ~150 keys, all optional with defaults, and duplicating it here would
 * create a second source of truth that silently rots — the failure this story's
 * slice 1 exists to prevent, one layer up. `@grantjs/env` validates at boot and is
 * the authority; the stack only has to deliver the values.
 *
 * Bring-your-own Postgres, Redis, secret and uploads bucket all arrive here rather
 * than as infrastructure props, because CDK never creates them: `DB_URL`, `REDIS_*`,
 * `SECRETS_AWS_SECRET_ID` and `STORAGE_S3_BUCKET` are configuration, not resources.
 */
export type GrantEnv = Readonly<Record<string, string>>;

/** Existing network to attach the API to. Omit to have the stack create one. */
interface NetworkProps {
  /**
   * Prefer `Vpc.fromVpcAttributes()` over `Vpc.fromLookup()`. A lookup resolves at
   * synth time against live account state and caches into `cdk.context.json`, which
   * makes the committed synth output a function of whichever account last ran it —
   * defeating the acceptance criterion that the template be reviewable evidence.
   */
  readonly vpc?: IVpc;

  /**
   * NAT gateways when the stack creates the VPC. Defaults to 1 rather than CDK's
   * one-per-AZ, which would double the largest fixed cost in the target.
   */
  readonly natGateways?: number;
}

/**
 * Deploy-time database migration.
 *
 * Runs `node dist/migrate.js` as a Fargate one-shot and waits for it, because
 * `DB_BOOTSTRAP_ON_BOOT` is false on this target (ADR 0001) — nothing migrates at
 * boot, so something has to migrate at deploy.
 */
interface MigrationProps {
  /**
   * Whether to run migrations during deploy. Defaults to **true** whenever this stack
   * owns the database.
   *
   * Set false when a pipeline runs migrations itself, or when the deploying principal
   * should not be able to alter the schema.
   */
  readonly enabled?: boolean;

  /** Ceiling for the migration. Lambda's hard limit caps this at 15 minutes. */
  readonly timeout?: Duration;

  /** Existing ECS cluster to run the task in. Omit to create one. */
  readonly cluster?: ICluster;

  /**
   * Pre-published image to migrate with, e.g. `ContainerImage.fromEcrRepository(...)`.
   *
   * Omit and the stack builds from source at deploy time. An adopter consuming this
   * as a library has no API source on disk and should pass one.
   */
  readonly image?: ContainerImage;

  /**
   * Identity of a caller-supplied `image`, used to decide whether to migrate again.
   *
   * The trigger re-runs when this changes. A built-from-source image supplies its own
   * content hash; a pre-published one cannot, because a tag may be mutable — pushing
   * a new image to `:latest` changes nothing CloudFormation can see. Pass the digest,
   * or any value that changes when the image does. Left unset, migrations run once
   * and are not repeated on later deploys.
   */
  readonly imageIdentifier?: string;
}

/**
 * Connection pooling in front of the cluster.
 *
 * **Off by default, on a measurement rather than a preference.** RDS Proxy holds a
 * persistent pool to the database, and Aurora Serverless v2 cannot auto-pause while
 * any connection exists — so enabling it forfeits the `minCapacity: 0` this target's
 * cost model rests on. A live deploy measured 0.5 ACU and four held connections, flat
 * across forty idle minutes, where the cluster otherwise pauses to zero: roughly
 * $58/month to keep connections warm.
 *
 * Enable it when Lambda concurrency is real. Without pooling every warm execution
 * environment holds its own connections and a burst exhausts `max_connections`. Cheap
 * idle and warm connections are mutually exclusive; this is where you choose.
 */
interface DatabaseProxyProps {
  readonly enabled?: boolean;

  /**
   * Require TLS between client and proxy. Defaults to true.
   *
   * Note this is TLS to the *proxy*; `sslmode=require` in the composed `DB_URL`
   * encrypts without verifying the server certificate, because the image carries no
   * RDS CA bundle.
   */
  readonly requireTls?: boolean;
}

/** The database this stack creates. Omit it and pass `databaseUrl` to bring your own. */
interface DatabaseProps {
  /** Minimum Aurora capacity units. `0` auto-pauses an idle cluster to no cost. */
  readonly minCapacity?: number;
  readonly maxCapacity?: number;

  /**
   * Allow teardown to destroy the data. Default false.
   *
   * Set true for throwaway environments — and note this construct sets the removal
   * policy explicitly either way, because CDK's `SNAPSHOT` default retains a
   * storage-billed snapshot that survives `cdk destroy` unnoticed.
   */
  readonly destroyOnRemoval?: boolean;

  /** Connection pooling. Off by default — see `DatabaseProxyProps`. */
  readonly proxy?: DatabaseProxyProps;
}

/** DNS. Always referenced, never created — a zone needs nameserver re-delegation CDK cannot perform. */
interface DnsProps {
  readonly hostedZone: IHostedZone;
  /**
   * Certificate for the canonical hostname. Omit to have the stack create one and
   * validate it against `hostedZone`.
   *
   * **Must be in `us-east-1`** whatever region the stack targets — a CloudFront
   * constraint. `Certificate.fromCertificateArn()` returns a token and validates
   * nothing, so the reference app asserts the region lexically from the ARN.
   */
  readonly certificate?: ICertificate;
}

/**
 * The web app.
 *
 * A Next.js standalone server behind the Lambda Web Adapter, not OpenNext. OpenNext
 * exists for ISR cache persistence and image optimization on serverless, and this app
 * uses neither — so it would add a build toolchain and a Next-16 support risk to buy
 * features nothing consumes. Recorded in the stack plan; revisit if ISR is adopted.
 */
interface WebProps {
  /**
   * Pre-published image, e.g. `DockerImageCode.fromEcr(repository, { tagOrDigest })`.
   * Omit and the stack builds from source at deploy time.
   */
  readonly image?: DockerImageCode;

  readonly memorySize?: number;
  readonly timeout?: Duration;

  /** Passed through to the Next server. The web app reads no secrets. */
  readonly env?: GrantEnv;
}

/** The documentation site. */
interface DocsProps {
  /**
   * Built VitePress output. Defaults to the repo's `docs/.vitepress/dist`.
   *
   * Required at synth time, so a deploy cannot silently produce an empty site —
   * run `pnpm --filter grant-docs build` first.
   */
  readonly distPath?: string;

  /** Existing bucket to publish into. Omit to create one. */
  readonly bucket?: IBucket;
}

interface StorageProps {
  /**
   * Uploads bucket. Omit to have the stack create one.
   *
   * Unlike the docs bucket this is never a CloudFront origin — uploads are
   * per-tenant and the API authorizes each read — so an imported bucket needs no
   * out-of-band resource policy. The grant is on the function's role, which CDK owns
   * whether or not it owns the bucket.
   */
  readonly uploadsBucket?: IBucket;

  /**
   * Whether teardown may destroy uploaded objects. Default false.
   *
   * Enabling this also enables `autoDeleteObjects`, because a non-empty bucket blocks
   * stack deletion. Both are off for a bucket holding real uploads.
   */
  readonly destroyOnRemoval?: boolean;
}

/** The cache and session store. */
interface CacheProps {
  /**
   * Existing DynamoDB table to use. Omit to have the stack create one.
   *
   * Must carry a `pk`/`sk` string key schema and a TTL on `expiresAt` — the contract
   * `DynamoDBCacheAdapter` writes against. Nothing here can verify that about an
   * imported table.
   */
  readonly table?: ITable;

  /**
   * Whether teardown may destroy the table. Defaults to **true**, unlike the
   * database: every item here is a cache entry, a session or a rate-limit counter,
   * all reconstructible and all TTL'd. Retaining it leaves a billed table nobody
   * reads again.
   */
  readonly destroyOnRemoval?: boolean;
}

/** The serving function. */
interface ApiProps {
  /**
   * Pre-published image to serve from, e.g.
   * `DockerImageCode.fromEcr(repository, { tagOrDigest })`.
   *
   * Omit and the stack builds from source at deploy time, sharing the asset with the
   * migration so both run the identical artifact (ADR 0003). An adopter consuming
   * this as a library has no API source on disk and should pass one.
   */
  readonly image?: DockerImageCode;

  /**
   * Memory, which on Lambda also sets the CPU share. Defaults to **1024 MB**.
   *
   * Not the obvious choice, and measured rather than reasoned. 1,769 MB is where a
   * function gets one full vCPU, so it should boot faster — on this workload it does
   * the opposite. A/B on a live deploy with the image fixed: at 1769 the init phase
   * hits Lambda's 10 s ceiling and is re-run inside the invocation (13,811 ms billed);
   * at 1024 it completes in 7,634 ms.
   *
   * Raising this is reasonable to try, but verify `INIT_REPORT` afterwards rather than
   * assuming more CPU means a faster cold start.
   */
  readonly memorySize?: number;

  /**
   * Per-request ceiling. Defaults to 30 seconds, matching CloudFront's origin
   * response timeout — beyond it the edge returns 504 while Lambda keeps billing.
   */
  readonly timeout?: Duration;

  /**
   * Ceiling on concurrent execution environments. Defaults to 20.
   *
   * This guards the **database**, not the bill. With pooling off (the default, since
   * a proxy forfeits Aurora's auto-pause) each warm environment holds its own
   * connections. An account's default Lambda concurrency limit is 1000, which times
   * `DB_POOL_MAX=2` is 2000 connections against the roughly 900 Aurora allows at the
   * default `maxCapacity: 4`. 20 times 2 is 40.
   *
   * Pass `0` to leave concurrency unbounded — appropriate once the proxy is enabled.
   */
  readonly reservedConcurrency?: number;
}

/**
 * Background jobs.
 *
 * Created only when the data tier is, because every job opens a database connection.
 * It provisions three things that only make sense together: the function that runs
 * the work, the six EventBridge rules that drive the schedules, and the queue that
 * carries one-off jobs. `JOBS_PROVIDER=aws` is what makes the application expect all
 * three — its `schedule()` registers a handler and creates no timer.
 */
interface JobsProps {
  /**
   * Whether to provision job execution. Defaults to **true** whenever this stack owns
   * the database.
   *
   * Turning it off leaves the application registering handlers that nothing triggers:
   * sweeps stop, and enqueued work is accepted and never run. Set it false only when
   * something outside this stack drives the same queue.
   */
  readonly enabled?: boolean;

  /**
   * Pre-published image, as for the API. Omit and the stack shares the API's asset —
   * one artifact runs the request path, the migration and the jobs (ADR 0003).
   */
  readonly image?: DockerImageCode;

  /** Existing queue for one-off jobs. Omit to create one with a dead-letter queue. */
  readonly queue?: IQueue;

  readonly memorySize?: number;

  /**
   * Ceiling on one job run. Defaults to **15 minutes**, Lambda's maximum.
   *
   * The sweeps yield well inside it; `project-sync` is what needs the room, and an
   * import larger than this needs the container runtime ADR 0002 describes rather than
   * a longer timeout that does not exist.
   */
  readonly timeout?: Duration;

  /**
   * Concurrent job executions. Defaults to 10 — `DB_POOL_MAX=2` each, so twenty
   * connections against the roughly 900 Aurora allows at `maxCapacity: 4`.
   *
   * Pass `0` to leave concurrency unbounded.
   */
  readonly reservedConcurrency?: number;
}

/** Top-level props for the whole platform. */
export interface GrantPlatformProps {
  /**
   * The single canonical public URL, e.g. `https://grant.example.com`. Every app is
   * served from this one origin and the path selects which — see `lib/routing.ts`.
   *
   * Mirrors the Helm chart's `global.appUrl`, which is the chart's only required
   * value. This is the parity bar: one required setting plus a hosted zone should
   * produce a working deploy.
   */
  readonly appUrl: string;

  readonly dns: DnsProps;

  /** Omit to have the stack create a VPC. */
  readonly network?: NetworkProps;

  readonly storage?: StorageProps;

  readonly cache?: CacheProps;

  /** The serving function. Created only when the data tier is. */
  readonly api?: ApiProps;

  /**
   * The web app. Omit and the docs bucket stays the default origin — the docs-only
   * deploy, where the root path 404s because content lives under `docs/`.
   */
  readonly web?: WebProps;

  readonly docs?: DocsProps;

  /**
   * Create the data tier — an Aurora cluster this stack owns and tears down with
   * itself. Omit it and pass `databaseUrl` to serve against a database you already
   * run; the two are mutually exclusive.
   */
  readonly database?: DatabaseProps;

  /**
   * `DB_URL` for a database this stack does not create, and the whole of what it
   * needs to know about one. Everything downstream reads the key out of the platform
   * secret and cannot tell which topology produced it.
   *
   * Not settable from the env file. A key there becomes a Lambda environment
   * variable, which is plaintext in the CloudFormation template and in the function
   * configuration, so `DB_URL` is refused there and supplied here instead.
   *
   * **`SecretValue`, not `string`, and the type is the warning** — the same choice
   * `secrets` carries, for the same reason:
   *
   *   - `SecretValue.secretsManager(arn)` renders a `{{resolve:secretsmanager:…}}`
   *     dynamic reference that CloudFormation resolves during create or update. The
   *     password is present at deploy time and absent from the template. **This is
   *     the one to use.**
   *   - `SecretValue.unsafePlainText('postgresql://…')` puts the connection string,
   *     password included, into the template. `unsafe` is not decoration.
   *
   * **A dynamic reference is copied, not linked, and `cdk deploy` is not enough to
   * refresh it.** CloudFormation retrieves the value only while creating or updating
   * the resource that holds the reference — and rotating the upstream secret changes
   * nothing in this template, so there is no update to make. A deploy after a
   * rotation reports success and leaves the old URL in place. The same property is
   * recorded for `ORIGIN_VERIFY_SECRET` in `PlatformSecret`.
   *
   * To rotate, write `DB_URL` into the platform secret directly; the application's
   * resolver picks it up within `SECRETS_CACHE_TTL_SECONDS` with no deploy at all.
   * Note that a later stack update which *does* modify the platform secret will
   * overwrite that value with whatever this reference resolves to.
   *
   * The URL is used exactly as written, including its `sslmode`; the stack never
   * rewrites it. It must be a bare, percent-encoded connection string: the value is
   * substituted into a JSON document at deploy time, so a quote, backslash or
   * newline in it breaks that document. Supplied literals are checked at synth;
   * a referenced secret's contents are not visible there.
   */
  readonly databaseUrl?: SecretValue;

  /**
   * Deploy-time migration. Runs on the bring-your-own path too — the task reads
   * `DB_URL` from the platform secret and does not care which topology filled it.
   * Ignored only on the docs-only deploy, where there is no database at all.
   */
  readonly migration?: MigrationProps;

  /** Background jobs. Ignored only on the docs-only deploy. */
  readonly jobs?: JobsProps;

  /** Passed through to the API container. */
  readonly env?: GrantEnv;

  /**
   * Secret `ENV_NAME: value` pairs, merged into the platform secret rather than into
   * the container's environment.
   *
   * For anything the application resolves through `ISecretResolver` —
   * `GITHUB_CLIENT_SECRET`, `AUTH_MFA_SECRET_ENCRYPTION_KEY`. Unlike `env`, these never
   * become Lambda environment variables, and a rotation is picked up within the
   * resolver's TTL rather than at the next redeploy.
   *
   * **`SecretValue`, not `string`, and the type is the warning.** CloudFormation cannot
   * place a literal secret into a resource without that literal being in the template,
   * so the shape forces the choice to be deliberate:
   *
   *   - `SecretValue.secretsManager('my/existing/secret')` renders a
   *     `{{resolve:secretsmanager:…}}` reference. The plaintext never enters the
   *     template. **This is the one to use for real credentials.**
   *   - `SecretValue.unsafePlainText('…')` puts the literal in the template, readable
   *     by anyone who can describe the stack. `unsafe` is not decoration.
   *
   * A value with no upstream secret to reference is better added to the platform secret
   * out of band after deploy — the resolver picks it up without a stack update, which
   * is the property ADR 0004 bought.
   *
   * Meaningful on every serving topology. The platform secret is created whenever a
   * database is reachable, whether this stack made one or `databaseUrl` named one.
   */
  readonly secrets?: Readonly<Record<string, SecretValue>>;
}
