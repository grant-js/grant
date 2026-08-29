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

import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import type { IVpc } from 'aws-cdk-lib/aws-ec2';
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
  readonly vpc: IVpc;
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

interface StorageProps {
  /**
   * Uploads bucket. Omit to have the stack create one.
   *
   * An imported bucket's resource policy is not owned by CDK —
   * `addToResourcePolicy` silently no-ops — so the stack cannot grant it CloudFront
   * Origin Access Control. Where one is supplied, the required policy is emitted as
   * a `CfnOutput` rather than appearing to have been applied.
   */
  readonly uploadsBucket?: IBucket;
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

  /** Passed through to the API container. */
  readonly env?: GrantEnv;
}
