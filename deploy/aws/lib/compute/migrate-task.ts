/**
 * The migrate one-shot.
 *
 * A Fargate task, not a Lambda, and the reason is mechanical rather than stylistic:
 * the image carries the Lambda Web Adapter as an *extension*, which probes
 * `AWS_LWA_PORT` and treats a cold start as incomplete until something is listening
 * (`AWS_LWA_READINESS_CHECK_PROTOCOL=tcp`, set in the `runner-lambda` stage of
 * `apps/api/Dockerfile`). A container whose command is `node dist/migrate.js` never
 * listens, so the invocation fails even when the migration itself succeeded.
 * ADR 0003 already establishes that one image serves Lambda and Fargate alike, and
 * `apps/api/src/migrate.ts` names "an ECS one-off task" first among its runners.
 *
 * `DB_BOOTSTRAP_ON_BOOT=false` (ADR 0001, and the AWS defaults) is what makes this
 * necessary: nothing migrates at boot, so something has to migrate at deploy. The
 * entrypoint is idempotent and takes a PostgreSQL advisory lock, so a concurrent
 * second run waits rather than corrupting anything.
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

export interface MigrateTaskProps {
  readonly vpc: IVpc;

  /** The API image. The same one the serving function runs, per ADR 0003. */
  readonly image: ContainerImage;

  /** Attached so the task may reach the RDS proxy. */
  readonly securityGroups: ISecurityGroup[];

  /** Points `SECRETS_AWS_SECRET_ID` at the env-shaped secret holding `DB_URL`. */
  readonly platformSecret: ISecret;

  /** Non-secret environment. Secrets arrive through `platformSecret`, never here. */
  readonly environment: GrantEnv;

  /** Existing cluster to run in. Omit to create one. */
  readonly cluster?: ICluster;

  readonly cpu?: number;
  readonly memoryLimitMiB?: number;
}

export class MigrateTask extends Construct {
  public readonly cluster: ICluster;
  public readonly taskDefinition: FargateTaskDefinition;
  public readonly securityGroups: ISecurityGroup[];

  /** True when this construct created the cluster, so teardown removes it. */
  public readonly ownsCluster: boolean;

  constructor(scope: Construct, id: string, props: MigrateTaskProps) {
    super(scope, id);

    this.securityGroups = props.securityGroups;
    this.ownsCluster = props.cluster === undefined;
    this.cluster = props.cluster ?? new Cluster(this, 'Cluster', { vpc: props.vpc });

    this.taskDefinition = new FargateTaskDefinition(this, 'TaskDefinition', {
      cpu: props.cpu ?? 512,
      memoryLimitMiB: props.memoryLimitMiB ?? 1024,
    });

    this.taskDefinition.addContainer('Migrate', {
      image: props.image,
      // Overrides the image's `node dist/server.js`; the entrypoint script still runs.
      command: ['node', 'dist/migrate.js'],
      environment: { ...props.environment },
      // ECS reads these from Secrets Manager at task start and injects them as
      // environment variables. That indirection is necessary, not decorative:
      // `SECRETS_AWS_SECRET_ID` is a *per-use* resolver for specific consumers
      // (ADR 0004), and nothing hydrates `process.env` from it — `migrate.ts` reads
      // `config.db.url`, which is derived from the environment at import. A DB_URL
      // that exists only inside the secret is a DB_URL the migration cannot see.
      //
      // The value still never appears in the template: the task definition holds the
      // secret's ARN and a JSON key, and the execution role fetches it at runtime.
      secrets: {
        DB_URL: EcsSecret.fromSecretsManager(props.platformSecret, 'DB_URL'),
      },
      logging: LogDriver.awsLogs({
        streamPrefix: 'migrate',
        // The migration log is the record of what a deploy did to the schema. Two
        // weeks outlives the deploy that wrote it without paying to keep it forever.
        logRetention: RetentionDays.TWO_WEEKS,
      }),
      // A failed migration must fail the task so the deploy fails, rather than
      // proceeding against an unmigrated database. migrate.ts exits 1 on failure.
      essential: true,
      stopTimeout: Duration.seconds(120),
    });

    // Read-only, and only this secret. The task never reads the cluster credentials
    // directly — it goes through the platform secret, as the application does.
    props.platformSecret.grantRead(this.taskDefinition.taskRole);
  }

  /**
   * Subnets the task runs in.
   *
   * Private-with-egress, not isolated: Fargate pulls the image from ECR over the
   * network before the container exists, so a task in an isolated subnet cannot start
   * at all without VPC endpoints. Never public.
   */
  public get subnetSelection(): SubnetSelection {
    return { subnetType: SubnetType.PRIVATE_WITH_EGRESS };
  }
}
