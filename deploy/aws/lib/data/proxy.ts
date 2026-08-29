/**
 * RDS Proxy in front of the Aurora cluster.
 *
 * Lambda's concurrency model and Postgres' connection model disagree: every warm
 * execution environment holds its own pool, so concurrency that CloudFront can
 * produce in a second exhausts `max_connections` on a database sized for the cost
 * floor this target exists to keep. The proxy multiplexes them onto a small pool and
 * absorbs the burst.
 *
 * It is created only when this stack owns the database. An adopter passing `DB_URL`
 * for their own Postgres already decided how connections are pooled, and inserting a
 * proxy in front of a database we did not create is not ours to do.
 */

import { Duration } from 'aws-cdk-lib';
import { type IVpc, Port, SecurityGroup, SubnetType } from 'aws-cdk-lib/aws-ec2';
import { type DatabaseCluster, DatabaseProxy, ProxyTarget } from 'aws-cdk-lib/aws-rds';
import type { ISecret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface DatabaseProxyProps {
  readonly vpc: IVpc;
  readonly cluster: DatabaseCluster;

  /** The cluster's generated credentials. The proxy authenticates with these. */
  readonly secret: ISecret;

  /**
   * Require TLS between client and proxy.
   *
   * Defaults to **true**. The hop is inside the VPC, but "inside the VPC" is a
   * network boundary rather than an authorization one, and the cost of TLS here is
   * a handshake per pooled connection rather than per request.
   */
  readonly requireTls?: boolean;
}

export class DatabaseConnectionProxy extends Construct {
  public readonly proxy: DatabaseProxy;

  /** Attach this to anything that should be allowed to reach the proxy. */
  public readonly clientSecurityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: DatabaseProxyProps) {
    super(scope, id);

    // A dedicated group with no ingress rules of its own: it exists to be a *source*
    // the proxy's group can name. That keeps the allowance tied to identity — "things
    // wearing this group" — rather than to a CIDR that widens as subnets are added.
    this.clientSecurityGroup = new SecurityGroup(this, 'ClientSecurityGroup', {
      vpc: props.vpc,
      description: 'Clients permitted to reach the RDS proxy',
      allowAllOutbound: true,
    });

    const proxySecurityGroup = new SecurityGroup(this, 'ProxySecurityGroup', {
      vpc: props.vpc,
      description: 'RDS proxy',
      allowAllOutbound: true,
    });

    this.proxy = new DatabaseProxy(this, 'Proxy', {
      proxyTarget: ProxyTarget.fromCluster(props.cluster),
      secrets: [props.secret],
      vpc: props.vpc,
      // The proxy sits with the database, not with the internet-facing tier.
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      securityGroups: [proxySecurityGroup],
      requireTLS: props.requireTls ?? true,
      // Borrowing longer than this means the pool is exhausted; failing fast surfaces
      // that as an error rather than as latency that looks like a slow database.
      borrowTimeout: Duration.seconds(30),
      // Connections idle this long are returned to the pool. Aurora Serverless v2
      // scaling to zero is only reachable if nothing holds a connection open.
      idleClientTimeout: Duration.minutes(30),
    });

    proxySecurityGroup.addIngressRule(
      this.clientSecurityGroup,
      Port.tcp(props.cluster.clusterEndpoint.port),
      'Grant clients reach the proxy'
    );

    // The proxy is itself a client of the cluster.
    props.cluster.connections.allowDefaultPortFrom(proxySecurityGroup, 'RDS proxy');
  }
}
