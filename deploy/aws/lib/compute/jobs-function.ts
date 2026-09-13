/**
 * The function that runs background work.
 *
 * The same image the API and the migration run (ADR 0003), with one difference that
 * is the whole security argument for the slice: **it has no Function URL**. Nothing
 * outside the account can reach it, and `lambda:InvokeFunction` — enforced by AWS
 * before any code runs — is what EventBridge and the queue's event-source mapping
 * hold. That is the IAM boundary the API could not have, because CloudFront's Origin
 * Access Control cannot carry an API that uses bearer tokens and POSTs bodies.
 *
 * It matters because dispatch has to bypass origin verification. The Lambda Web
 * Adapter forwards a non-HTTP event by POSTing it to `AWS_LWA_PASS_THROUGH_PATH`, and
 * no AWS event source can attach the secret CloudFront sends — so the route is mounted
 * ahead of that middleware. On a publicly reachable origin that would be an
 * unauthenticated job trigger, which is the `/health` exposure slice 4c deleted. Here
 * it is unreachable by construction.
 *
 * Running jobs here rather than on the API function also stops sweeps competing with
 * request traffic for the API's reserved concurrency, and lifts the ceiling on a run:
 * the API's 30-second timeout exists to match CloudFront's origin response timeout,
 * which nothing in this path has.
 */

import { Duration } from 'aws-cdk-lib';
import type { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { type ISecurityGroup, type IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { type DockerImageCode, DockerImageFunction } from 'aws-cdk-lib/aws-lambda';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import type { IQueue } from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

import type { GrantEnv, SesSendGrant } from '../config/props';

/**
 * Where the Lambda Web Adapter delivers a non-HTTP event, and where the application
 * listens for one. Two settings that must agree, so they are one constant: the
 * adapter reads `AWS_LWA_PASS_THROUGH_PATH` and `apps/api` reads
 * `JOBS_EVENT_DISPATCH_PATH`, and a mismatch produces a 404 the event source records
 * as a success.
 */
export const EVENT_DISPATCH_PATH = '/events';

/**
 * Lambda's ceiling, deliberately.
 *
 * The scheduled sweeps are bounded by `maxBatches` and yield long before this. What
 * needs the room is `project-sync`, which applies a whole CDM document in one database
 * transaction and cannot be split (ADR 0002). Fifteen minutes does not make it
 * unbounded — an import larger than this still needs the container runtime that ADR
 * names — but it is the most this runtime can offer, and it is thirty times what the
 * request path allowed.
 */
export const DEFAULT_JOB_TIMEOUT = Duration.minutes(15);

/**
 * Concurrent job executions.
 *
 * A database guard, like the API's, and the same arithmetic: `DB_POOL_MAX=2` per warm
 * environment, so ten of these hold twenty connections against Aurora's ~900 at
 * `maxCapacity: 4`. Ten is generous for six sweeps that mostly finish in milliseconds,
 * and it is a ceiling on a minute-by-minute schedule that could otherwise overlap
 * itself indefinitely if a sweep started running long.
 */
const DEFAULT_RESERVED_CONCURRENCY = 10;

export interface JobsFunctionProps {
  /**
   * Network placement, optional for the reason `ApiFunction` records: the
   * bring-your-own topology with no `network` prop creates no VPC and this function
   * runs outside one. Nothing here needs the inside of a VPC — webhook delivery and
   * SES are both public destinations, and the database is reached over whatever route
   * `DB_URL` names.
   */
  readonly vpc?: IVpc;

  /** The API image. Same one, per ADR 0003 — no second artifact to keep in step. */
  readonly code: DockerImageCode;

  /** Attached so the function may open database connections. Ignored without `vpc`. */
  readonly securityGroups?: ISecurityGroup[];
  readonly platformSecret: ISecret;
  readonly cacheTable: ITable;
  readonly uploadsBucket: IBucket;

  /** One-off jobs arrive here; the event-source mapping is created below. */
  readonly queue: IQueue;

  /** Non-secret environment, as for the API. Nothing credential-bearing belongs here. */
  readonly environment: GrantEnv;

  readonly memorySize?: number;
  readonly timeout?: Duration;

  /** See `DEFAULT_RESERVED_CONCURRENCY`. Pass `0` to leave concurrency unbounded. */
  readonly reservedConcurrency?: number;

  /**
   * The SES identity and From address this function may send as. Omit — the default,
   * and the case for every deployment on `EMAIL_PROVIDER=console` — and no SES
   * statement is attached to the role. Notification delivery is what uses it.
   */
  readonly ses?: SesSendGrant;
}

export class JobsFunction extends Construct {
  public readonly function: DockerImageFunction;

  /** The timeout in force, which the queue's visibility window is derived from. */
  public readonly timeout: Duration;

  constructor(scope: Construct, id: string, props: JobsFunctionProps) {
    super(scope, id);

    const reserved = props.reservedConcurrency ?? DEFAULT_RESERVED_CONCURRENCY;
    this.timeout = props.timeout ?? DEFAULT_JOB_TIMEOUT;

    this.function = new DockerImageFunction(this, 'Function', {
      code: props.code,
      ...(props.vpc
        ? {
            vpc: props.vpc,
            // Private-with-egress, as the API is: webhook delivery POSTs to arbitrary
            // customer URLs and notification delivery calls SES.
            vpcSubnets: { subnetType: SubnetType.PRIVATE_WITH_EGRESS },
            ...(props.securityGroups ? { securityGroups: props.securityGroups } : {}),
          }
        : {}),
      // Matches the API, and for the measured reason rather than for symmetry: 1769 MB
      // reproducibly overran Lambda's 10-second init ceiling on this image while 1024
      // finished with room. See `compute/api-function.ts`.
      memorySize: props.memorySize ?? 1024,
      timeout: this.timeout,
      environment: {
        ...props.environment,
        // The adapter's half of the contract; `JOBS_EVENT_DISPATCH_PATH` is the app's.
        AWS_LWA_PASS_THROUGH_PATH: EVENT_DISPATCH_PATH,
      },
      ...(reserved > 0 ? { reservedConcurrentExecutions: reserved } : {}),
      logGroup: new LogGroup(this, 'Logs', {
        retention: RetentionDays.TWO_WEEKS,
      }),
    });

    // The same grants the API holds, because it is the same application: a sweep reads
    // the platform secret for `DB_URL`, touches the cache, and a CDM export writes the
    // uploads bucket.
    props.platformSecret.grantRead(this.function);
    props.cacheTable.grantReadWriteData(this.function);
    props.uploadsBucket.grantReadWrite(this.function);

    // Notification delivery is the job that sends mail, so this role needs SES more
    // plainly than the API's does. Send-only, and no static keys anywhere.
    //
    // Granted only where mail is actually sent. `EMAIL_PROVIDER` defaults to `console`
    // (`@grantjs/env/src/schema.ts:256-259`), so the common deployment used to hold a
    // send-as-anyone permission for a function that never calls SES at all.
    //
    // Scoped two ways, because SES narrows two different things and supports each for
    // `SendEmail`/`SendRawEmail` (SES developer guide, "Identity and access management
    // in Amazon SES", checked 2026-09-09):
    //
    //   - `Resource` set to identity ARNs, which the guide gives as the alternative to
    //     `*` in as many words: "To restrict the identities that a user is allowed to
    //     send from, set Resource to the ARNs of the identities". **The comment that
    //     used to stand here said the opposite** — that these actions "do not support
    //     resource-level permissions in the classic API" — and that was simply wrong.
    //   - `ses:FromAddress`, which bounds the address within that identity. A domain
    //     identity otherwise permits every mailbox at the domain, and the adapter only
    //     ever sends as one address. SES parses `Source`, matching a display name
    //     against the separate `ses:FromDisplayName` key, so `"Grant" <a@b.com>` is
    //     compared here as `a@b.com`.
    if (props.ses) {
      this.function.addToRolePolicy(
        new PolicyStatement({
          actions: ['ses:SendEmail', 'ses:SendRawEmail'],
          resources: [props.ses.identityArn],
          conditions: { StringEquals: { 'ses:FromAddress': props.ses.fromAddress } },
        })
      );
    }

    // A job may enqueue another job — the event relay's on-demand path does exactly
    // that after a transaction commits — so this function both consumes and sends.
    props.queue.grantSendMessages(this.function);

    this.function.addEventSource(
      new SqsEventSource(props.queue, {
        // One message per invocation. A batch would put unrelated tenants' work under
        // one timeout, and `project-sync` is the job least able to share one.
        batchSize: 1,
        // The consumer answers with `batchItemFailures`, so a failed message is
        // redelivered without redelivering the ones that succeeded beside it.
        reportBatchItemFailures: true,
      })
    );
  }
}
