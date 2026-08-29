/**
 * The Postgres cluster.
 *
 * Aurora Serverless v2 rather than a provisioned instance, because the whole reason
 * for this deployment target is that idle capacity should not be paid for. On engine
 * versions supporting auto-pause the cluster scales to **zero** ACUs when idle, which
 * is the difference between a database that costs money overnight and one that does
 * not.
 *
 * Nothing here is created when an adopter already has a database: they pass `DB_URL`
 * through the environment instead and never instantiate this construct. That is the
 * same shape the Helm chart uses — `Chart.yaml` declares no dependencies, so the
 * chart has never created Postgres either.
 */

import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { type IVpc, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
  AuroraPostgresEngineVersion,
  ClusterInstance,
  Credentials,
  DatabaseCluster,
  DatabaseClusterEngine,
} from 'aws-cdk-lib/aws-rds';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseProps {
  readonly vpc: IVpc;

  /** Logical database created with the cluster. */
  readonly databaseName?: string;

  /**
   * Minimum Aurora capacity units.
   *
   * `0` enables auto-pause on engine versions that support it, so an idle cluster
   * costs nothing. Raise it if cold-start latency after a pause matters more than
   * idle cost.
   */
  readonly minCapacity?: number;

  readonly maxCapacity?: number;

  /**
   * Whether teardown may destroy the data.
   *
   * Defaults to **false**, which is the safe default for anything holding real data
   * — but note what CDK's own default does: `DatabaseCluster` defaults to
   * `RemovalPolicy.SNAPSHOT`, which removes the cluster and *retains a snapshot that
   * is billed for storage indefinitely*, invisible unless you go looking. So this
   * construct always sets the policy explicitly, in both directions, rather than
   * inheriting a default that quietly leaves a bill behind.
   */
  readonly destroyOnRemoval?: boolean;
}

export class Database extends Construct {
  public readonly cluster: DatabaseCluster;

  /** Generated credentials. Referenced by `SECRETS_AWS_SECRET_ID`, never inlined. */
  public readonly secret: ISecret;

  public readonly databaseName: string;

  constructor(scope: Construct, id: string, props: DatabaseProps) {
    super(scope, id);

    this.databaseName = props.databaseName ?? 'grant';
    const destroy = props.destroyOnRemoval ?? false;

    this.cluster = new DatabaseCluster(this, 'Cluster', {
      engine: DatabaseClusterEngine.auroraPostgres({
        version: AuroraPostgresEngineVersion.VER_17_5,
      }),
      vpc: props.vpc,
      // Isolated subnets: the database needs no route to the internet, and putting it
      // where one exists is a standing invitation.
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      writer: ClusterInstance.serverlessV2('Writer'),
      serverlessV2MinCapacity: props.minCapacity ?? 0,
      serverlessV2MaxCapacity: props.maxCapacity ?? 4,
      defaultDatabaseName: this.databaseName,
      // Generated into Secrets Manager, so no password is ever expressed in the
      // template, in CDK context, or in an environment variable.
      credentials: Credentials.fromGeneratedSecret('grant_admin', {
        secretName: `${id}-db-credentials`,
      }),
      storageEncrypted: true,
      backup: { retention: Duration.days(destroy ? 1 : 7) },
      // Always explicit. See destroyOnRemoval above: CDK's SNAPSHOT default is what
      // turns "I tore it down" into a recurring storage charge nobody sees.
      removalPolicy: destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
      deletionProtection: !destroy,
    });

    // Non-null: fromGeneratedSecret always attaches one, but the type is optional
    // because a cluster built from an imported secret would not have it.
    this.secret = this.cluster.secret!;
  }
}
