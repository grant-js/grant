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

import type { Duration } from 'aws-cdk-lib';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
import type { ContainerImage, ICluster } from 'aws-cdk-lib/aws-ecs';
import type { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import type { IHostedZone } from 'aws-cdk-lib/aws-route53';
import type { IBucket } from 'aws-cdk-lib/aws-s3';

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

/** The database. Omit entirely to bring your own via `DB_URL` in `env`. */
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
   * Create the data tier. Omit to bring your own Postgres, in which case supply
   * `DB_URL` through `env` — the shape the Helm chart has always used.
   */
  readonly database?: DatabaseProps;

  /** Deploy-time migration. Ignored when this stack does not own the database. */
  readonly migration?: MigrationProps;

  /** Passed through to the API container. */
  readonly env?: GrantEnv;
}
