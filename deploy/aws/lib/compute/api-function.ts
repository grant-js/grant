/**
 * The API, as a Lambda function.
 *
 * The same image the migrate task runs (ADR 0003), invoked through the Lambda Web
 * Adapter: the extension in `/opt/extensions` starts the Express server, waits for
 * `/health` on `AWS_LWA_PORT`, and translates each invocation into an HTTP request.
 * `apps/api` is unmodified by this — it serves the same routes it serves under Docker.
 *
 * **No credential reaches this function's environment.** The migrate task injects
 * `DB_URL` through ECS `secrets:` because its entrypoint reads `config.db.url`, which
 * `@grantjs/env` derives at import. The serving path does not need that indirection:
 * `create-app.ts` resolves `DB_URL` through `ISecretResolver` at connection time
 * (ADR 0004), so this function is given only `SECRETS_AWS_SECRET_ID` and fetches the
 * value per use. A rotated password is therefore picked up within
 * `SECRETS_CACHE_TTL_SECONDS` on a warm container, rather than requiring a redeploy —
 * which matters far more here than for a task that lives for ninety seconds.
 *
 * S3 and DynamoDB are reached with this function's own role. `STORAGE_S3_*` and
 * `CACHE_DYNAMODB_*` static keys are left unset so the SDK's default credential chain
 * applies; `apps/api/src/config/env.config.ts` treats both as optional for exactly
 * this reason.
 */

import { Duration } from 'aws-cdk-lib';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { type ISecurityGroup, type IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
  type DockerImageCode,
  DockerImageFunction,
  FunctionUrlAuthType,
  type IFunctionUrl,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import type { GrantEnv } from '../config/props';

/**
 * Ceiling on concurrent execution environments.
 *
 * This is a database guard, not a cost guard, and the arithmetic is the reason it has
 * a default at all. Connection pooling is **off** by default on this target — a proxy
 * forfeits Aurora's auto-pause — so every warm execution environment holds its own
 * connections straight to the cluster.
 *
 * Aurora Serverless v2 derives `max_connections` from the **maximum** ACU setting, not
 * the current one, so the default `maxCapacity: 4` (8 GiB) allows roughly 900. The
 * ceiling still matters: an account's default Lambda concurrency limit is 1000, and
 * 1000 environments times `DB_POOL_MAX=2` is 2000 connections — comfortably past what
 * the cluster will accept, with the failure surfacing as a 500 on an unrelated request
 * rather than as anything naming Lambda.
 *
 * 20 times 2 is 40, which leaves the cluster almost entirely free for the migrate task
 * and any human holding a psql session. Raise both together, or enable the proxy, once
 * concurrency is real.
 */
const DEFAULT_RESERVED_CONCURRENCY = 20;

export interface ApiFunctionProps {
  readonly vpc: IVpc;

  /**
   * The image to run. `DockerImageCode` rather than a `DockerImageAsset` so an
   * adopter can pass `DockerImageCode.fromEcr(repository, { tagOrDigest })` for a
   * pre-published image — ADR 0005's interface-typed props applied to the one
   * remaining place the stack would otherwise insist on building from source.
   */
  readonly code: DockerImageCode;

  /** Attached so the function may open database connections. */
  readonly securityGroups: ISecurityGroup[];

  /** Points `SECRETS_AWS_SECRET_ID` at the env-shaped secret holding `DB_URL`. */
  readonly platformSecret: ISecret;

  readonly cacheTable: ITable;
  readonly uploadsBucket: IBucket;

  /** Non-secret environment. Nothing credential-bearing belongs here. */
  readonly environment: GrantEnv;

  readonly memorySize?: number;
  readonly timeout?: Duration;

  /** See `DEFAULT_RESERVED_CONCURRENCY`. Pass `0` to leave concurrency unbounded. */
  readonly reservedConcurrency?: number;
}

export class ApiFunction extends Construct {
  public readonly function: DockerImageFunction;

  /**
   * The invocation endpoint.
   *
   * Reachable, and guarded by a shared secret the application checks rather than by
   * IAM. See the note at its creation for why IAM is not available here.
   */
  public readonly functionUrl: IFunctionUrl;

  constructor(scope: Construct, id: string, props: ApiFunctionProps) {
    super(scope, id);

    const reserved = props.reservedConcurrency ?? DEFAULT_RESERVED_CONCURRENCY;

    this.function = new DockerImageFunction(this, 'Function', {
      code: props.code,
      vpc: props.vpc,
      // Private-with-egress, never isolated: the API calls SES, GitHub OAuth and
      // arbitrary webhook URLs, none of which a VPC endpoint can reach.
      vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: props.securityGroups,
      // A CPU dial, not a memory one, and the measurement says so: a live deploy used
      // 350 MB of the 1024 MB it had. Lambda allocates CPU in proportion to memory and
      // 1,769 MB is where a function gets one full vCPU, against roughly 0.58 at 1 GB.
      //
      // Cold start is what this buys. Boot is CPU-bound — 77% of it is loading the
      // module graph — and a measured 8.9 s init sits against Lambda's 10 s ceiling,
      // past which init is re-run inside the invocation and the caller waits for it.
      //
      // Roughly cost-neutral rather than a trade: billing is per GB-millisecond, so
      // 1.73x the rate against a proportionally shorter init, and every warm
      // invocation gets cheaper too.
      memorySize: props.memorySize ?? 1769,
      // CloudFront's origin response timeout is 30 seconds by default, so a longer
      // Lambda timeout only buys a 504 at the edge while still being billed.
      timeout: props.timeout ?? Duration.seconds(30),
      environment: { ...props.environment },
      ...(reserved > 0 ? { reservedConcurrentExecutions: reserved } : {}),
      logGroup: new LogGroup(this, 'Logs', {
        // Long enough to investigate an incident reported a week late, short of
        // paying to store request logs indefinitely.
        retention: RetentionDays.TWO_WEEKS,
      }),
    });

    // Least privilege, and each grant is the narrowest CDK offers: read on one secret,
    // data-plane read/write on one table (no CreateTable, no DeleteTable), and object
    // read/write on one bucket.
    props.platformSecret.grantRead(this.function);
    props.cacheTable.grantReadWriteData(this.function);
    props.uploadsBucket.grantReadWrite(this.function);

    this.functionUrl = this.function.addFunctionUrl({
      // `AWS_IAM` would be the better answer and is not available to this API. Slice
      // 4c shipped it, and verifying the edge in 4d established that CloudFront's
      // Origin Access Control cannot carry this application's traffic:
      //
      //   - OAC's recommended `SigningBehavior: always` overwrites the viewer's
      //     `Authorization` header with its own SigV4 signature, so bearer tokens
      //     cannot survive the hop. `no-override` does not help: it declines to sign
      //     when the viewer sends `Authorization`, and IAM then refuses the unsigned
      //     request.
      //   - `POST` and `PUT` through OAC require the *viewer* to send
      //     `x-amz-content-sha256` with the body hash, because CloudFront will not
      //     buffer the body to compute it. GraphQL is POST-only from a browser.
      //
      // So the URL answers the internet, and `originVerifyMiddleware` in `apps/api`
      // refuses anything without the secret CloudFront attaches as an origin custom
      // header. The difference from IAM is where enforcement happens: AWS turns away
      // an unsigned request before any code runs, while this costs one short
      // invocation. Reserved concurrency bounds that.
      authType: FunctionUrlAuthType.NONE,
    });
  }
}
