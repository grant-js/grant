/**
 * The `project-sync` runtime, for imports Lambda cannot finish.
 *
 * ADR 0002's escape hatch, and the measurement that made it necessary:
 * a 28,880-entity CDM import takes **62.3 minutes** against Lambda's hard 15-minute
 * ceiling, and the ceiling is crossed near **10,700 entities**
 * (`plans/2026-09-09-aws-followups-closeout-measurements.md` § ADR 0002). The import runs
 * in a single transaction and cannot be chunked — a partially-applied permission model is
 * a security outcome, not an inconvenience — so the work moves to a runtime without a
 * wall instead of being split to fit one.
 *
 * A Fargate task for the same mechanical reason `MigrateTask` is one: the image carries
 * the Lambda Web Adapter as an extension that treats a cold start as incomplete until
 * something listens on `AWS_LWA_PORT`, and `node dist/run-sync-job.js` never listens.
 * ADR 0003 already has one image serving Lambda and Fargate alike.
 *
 * **Not a service, and not scheduled.** One task per dispatched job, started by the jobs
 * function on receiving a sync message and gone when the import commits. Fargate bills
 * per task-second, which ADR 0002 records as the cost of this decision — a task that runs
 * only when a sync is enqueued is not idle compute.
 *
 * **No timeout is set here, and that is the point.** The task runs until the import
 * finishes. What bounds it is the tenant's document, which is exactly the property ADR
 * 0002 declined to cap.
 */

import { Duration } from 'aws-cdk-lib';
import {
  type ISecurityGroup,
  type IVpc,
  type SubnetSelection,
  SubnetType,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  type ContainerImage,
  FargateTaskDefinition,
  type ICluster,
  LogDriver,
  Secret as EcsSecret,
} from 'aws-cdk-lib/aws-ecs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

import type { GrantEnv } from '../config/props';

/** The container the dispatcher targets with environment overrides. Must match config. */
export const SYNC_CONTAINER_NAME = 'Sync';

export interface SyncTaskProps {
  readonly vpc: IVpc;

  /** The API image. The same one the serving function runs, per ADR 0003. */
  readonly image: ContainerImage;

  /** Attached so the task may reach the database. */
  readonly securityGroups: ISecurityGroup[];

  /** Points `SECRETS_AWS_SECRET_ID` at the env-shaped secret holding `DB_URL`. */
  readonly platformSecret: ISecret;

  /** Non-secret environment. Secrets arrive through `platformSecret`, never here. */
  readonly environment: GrantEnv;

  /** Existing cluster to run in. Omit to create one — shared with the migrate task. */
  readonly cluster?: ICluster;

  /**
   * Larger than the migrate task's by default, and for a measured reason: the import
   * holds one transaction open across ~1.4 M statements for a large document, and the
   * CDM document itself is up to 17 MiB of parsed JSON in memory alongside it.
   */
  readonly cpu?: number;
  readonly memoryLimitMiB?: number;
}

export class SyncTask extends Construct {
  public readonly cluster: ICluster;
  public readonly taskDefinition: FargateTaskDefinition;
  public readonly securityGroups: ISecurityGroup[];

  /** True when this construct created the cluster, so teardown removes it. */
  public readonly ownsCluster: boolean;

  constructor(scope: Construct, id: string, props: SyncTaskProps) {
    super(scope, id);

    this.securityGroups = props.securityGroups;
    this.ownsCluster = props.cluster === undefined;
    this.cluster = props.cluster ?? new Cluster(this, 'Cluster', { vpc: props.vpc });

    this.taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: props.cpu ?? 1024,
      memoryLimitMiB: props.memoryLimitMiB ?? 2048,
    });

    this.taskDefinition.addContainer(SYNC_CONTAINER_NAME, {
      image: props.image,
      // Overrides the image's `node dist/server.js`; the entrypoint script still runs.
      command: ['node', 'dist/run-sync-job.js'],
      // `GRANT_SYNC_JOB_ID` and `GRANT_SYNC_JOB_SCOPE` are deliberately absent: they are
      // per-execution and arrive as `RunTask` container overrides. Baking a job id into a
      // task definition would make every task apply the same row.
      environment: { ...props.environment },
      secrets: {
        // Same indirection as the migrate task, for the same reason: nothing hydrates
        // `process.env` from `SECRETS_AWS_SECRET_ID`, and `run-sync-job.ts` resolves the
        // connection string through `config`. ECS fetches this at task start, so the
        // value is in the task definition as an ARN and a key, never as a secret.
        DB_URL: EcsSecret.fromSecretsManager(props.platformSecret, 'DB_URL'),
      },
      logging: LogDriver.awsLogs({
        streamPrefix: 'sync',
        // Longer than the migrate task's two weeks. This log is the only record of what
        // an import did to a tenant's permission model when the job row says only
        // "failed", and a tenant asking why their roles changed is not a two-week
        // question.
        logRetention: RetentionDays.ONE_MONTH,
      }),
      // A failed import must fail the task, so a dispatched job that dies surfaces as a
      // stopped task with a non-zero exit rather than as a job row stuck in RUNNING.
      essential: true,
      // Longer than the migrate task's 120 s: a stop signal arriving mid-import has a
      // transaction to roll back, and rolling back 1.4 M statements is not instant.
      stopTimeout: Duration.seconds(300),
    });

    props.platformSecret.grantRead(this.taskDefinition.taskRole);
  }

  /**
   * Subnets the task runs in.
   *
   * Private-with-egress, not isolated: Fargate pulls the image from ECR over the network
   * before the container exists, so a task in an isolated subnet cannot start at all
   * without VPC endpoints. Never public — this container holds database credentials and
   * serves nothing.
   */
  public get subnetSelection(): SubnetSelection {
    return { subnetType: SubnetType.PRIVATE_WITH_EGRESS };
  }
}
