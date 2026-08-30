/**
 * The platform, as a construct.
 *
 * A `Construct` rather than a `Stack`, and that is the shape ADR 0005 asks for: the
 * props take CDK resource interfaces, and a caller cannot produce an `IHostedZone`
 * or an `ICertificate` before a stack exists to import them into. Making this an L3
 * construct lets the reference app create the stack, import what the adopter already
 * owns, and hand the handles in — which is exactly the composition an adopter needs
 * when they replace `bin/`.
 *
 * Slice 2 establishes the configuration surface and the routing plan; it creates no
 * AWS resources. That is deliberate — the stack plan front-loads everything CI can
 * verify, because from the docs site onward the evidence is a recorded deploy rather
 * than a diff.
 *
 * What it does emit is the **resolved plan** as outputs: the canonical hostname and
 * the CloudFront behaviour order. The committed synth output is therefore reviewable
 * evidence that derivation produced the intended routing, before any distribution
 * exists to get it wrong.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { CfnOutput, Stack } from 'aws-cdk-lib';
import { SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { AaaaRecord, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import { ASSET_BEHAVIOURS, type CloudFrontBehaviour, toCloudFrontBehaviours } from './behaviours';
import { ApiImage } from './compute/api-image';
import { MigrateTask } from './compute/migrate-task';
import { MigrateTrigger } from './compute/migrate-trigger';
import { AWS_TARGET_ENV_DEFAULTS } from './config/defaults';
import type { GrantEnv, GrantPlatformProps } from './config/props';
import { assertCertificateRegion, validateAppUrl, validateHostnameInZone } from './config/validate';
import { Database } from './data/database';
import { Network } from './data/network';
import { PlatformSecret } from './data/platform-secret';
import { DatabaseConnectionProxy } from './data/proxy';
import { EdgeCertificate } from './edge/certificate';
import { EdgeDistribution } from './edge/distribution';
import { DocsSite } from './edge/docs-site';

/** Repo-relative default for the built documentation. */
const DEFAULT_DOCS_DIST = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../../docs/.vitepress/dist'
);

export class GrantPlatform extends Construct {
  /** Canonical hostname, derived from `appUrl`. */
  public readonly hostname: string;

  /** Behaviours in CloudFront evaluation order. Consumed by the distribution in slice 3. */
  public readonly behaviours: readonly CloudFrontBehaviour[];

  /** Defaults merged with the caller's overrides. Caller wins. */
  public readonly env: GrantEnv;

  public readonly docs: DocsSite;
  public readonly edge: EdgeDistribution;

  /** Present only when the data tier was requested. */
  public readonly network?: Network;
  public readonly database?: Database;
  /** Present only when pooling was explicitly enabled. See the note at its creation. */
  public readonly proxy?: DatabaseConnectionProxy;

  /** Everything permitted to open a database connection wears this. */
  public readonly databaseClientSecurityGroup?: SecurityGroup;
  public readonly platformSecret?: PlatformSecret;

  /** Present only when the data tier was requested and migration is enabled. */
  public readonly migrateTask?: MigrateTask;

  constructor(scope: Construct, id: string, props: GrantPlatformProps) {
    super(scope, id);

    // Validate first: a bad hostname should fail during synth with an actionable
    // sentence, not fifteen minutes into a deploy with an unrelated resource named.
    const { hostname } = validateAppUrl(props.appUrl);
    validateHostnameInZone(hostname, props.dns.hostedZone.zoneName);

    this.hostname = hostname;
    // Caller last: an adopter overriding a default must win over this file's opinion.
    // The URL-shaped values are derived rather than defaulted, because the defaults in
    // `@grantjs/env` are localhost and `SECURITY_FRONTEND_URL` is *required* once
    // NODE_ENV is production — which the AWS defaults set. A deploy that omitted them
    // would fail config validation before it touched anything.
    this.env = {
      ...AWS_TARGET_ENV_DEFAULTS,
      APP_URL: props.appUrl,
      SECURITY_FRONTEND_URL: props.appUrl,
      DOCS_URL: `${props.appUrl}/docs`,
      ...props.env,
    };
    this.behaviours = [...toCloudFrontBehaviours(), ...ASSET_BEHAVIOURS];

    // CloudFront is global; only the certificate it serves is pinned to us-east-1.
    // Creating one here inherits this stack's region, so composing the construct into
    // a stack elsewhere would build a distribution CloudFront rejects — guarded
    // rather than documented. The reference app avoids the case entirely by creating
    // the certificate in its own us-east-1 stack and passing it in.
    let certificate = props.dns.certificate;
    if (!certificate) {
      assertCertificateRegion(Stack.of(this).region);
      certificate = new EdgeCertificate(this, 'Certificate', {
        hostname,
        hostedZone: props.dns.hostedZone,
      }).certificate;
    }

    // The data tier is opt-in. Omitting it is the bring-your-own-Postgres path the
    // Helm chart has always taken, and it keeps the docs-only deploy free of a VPC.
    if (props.database) {
      this.network = new Network(this, 'Network', {
        vpc: props.network?.vpc,
        natGateways: props.network?.natGateways,
      });
      this.database = new Database(this, 'Database', {
        vpc: this.network.vpc,
        minCapacity: props.database.minCapacity,
        maxCapacity: props.database.maxCapacity,
        destroyOnRemoval: props.database.destroyOnRemoval,
      });

      // One group names everything allowed to open a database connection, whether it
      // reaches the cluster directly or through the proxy. Identity, not CIDR: a CIDR
      // allowance widens silently as subnets are added.
      this.databaseClientSecurityGroup = new SecurityGroup(this, 'DatabaseClients', {
        vpc: this.network.vpc,
        description: 'Permitted to open Grant database connections',
        allowAllOutbound: true,
      });

      // Off by default, and the reason is measured rather than assumed. A proxy holds
      // a persistent pool to the cluster, and Aurora cannot auto-pause while any
      // connection exists — so enabling it forfeits the `serverlessV2MinCapacity: 0`
      // that this target's cost model is built on. Measured on a live deploy: 0.5 ACU
      // and four held connections, flat across forty idle minutes, versus a cluster
      // that otherwise pauses to zero. That is roughly $58/month to keep connections
      // warm for traffic a green-field deploy does not have yet.
      //
      // Turn it on when Lambda concurrency is real: without pooling, each warm
      // execution environment holds its own connections and a burst exhausts
      // `max_connections`. The trade is cheap idle against tolerance for concurrency,
      // and it cannot be had both ways.
      if (props.database.proxy?.enabled ?? false) {
        this.proxy = new DatabaseConnectionProxy(this, 'Proxy', {
          vpc: this.network.vpc,
          cluster: this.database.cluster,
          secret: this.database.secret,
          clientSecurityGroup: this.databaseClientSecurityGroup,
          requireTls: props.database.proxy?.requireTls,
        });
      } else {
        this.database.cluster.connections.allowDefaultPortFrom(
          this.databaseClientSecurityGroup,
          'Grant database clients'
        );
      }

      // Two secrets, two shapes. The cluster's is RDS-shaped and only the proxy reads
      // it; this one is the flat ENV_NAME:value object the application's resolver
      // requires. See PlatformSecret.
      this.platformSecret = new PlatformSecret(this, 'PlatformSecret', {
        databaseCredentials: this.database.secret,
        // The proxy when there is one, the cluster writer otherwise.
        host: this.proxy?.proxy.endpoint ?? this.database.cluster.clusterEndpoint.hostname,
        port: this.database.cluster.clusterEndpoint.port,
        databaseName: this.database.databaseName,
      });

      if (props.migration?.enabled ?? true) {
        // Built from source unless the caller supplied one. `imageIdentifier` is what
        // re-arms the migration trigger, so a caller-supplied image needs the caller
        // to say when it changed — the tag alone may be mutable.
        let image = props.migration?.image;
        let imageIdentifier = props.migration?.imageIdentifier ?? 'caller-supplied';
        if (!image) {
          const built = new ApiImage(this, 'ApiImage');
          image = built.containerImage;
          imageIdentifier = built.imageIdentifier;
        }

        this.migrateTask = new MigrateTask(this, 'Migrate', {
          vpc: this.network.vpc,
          image,
          securityGroups: [this.databaseClientSecurityGroup],
          platformSecret: this.platformSecret.secret,
          environment: {
            ...this.env,
            SECRETS_AWS_SECRET_ID: this.platformSecret.secret.secretName,
            SECRETS_AWS_REGION: Stack.of(this).region,
            // A migration touches no object storage, and `validateConfig()` validates
            // the whole surface regardless of what the entrypoint uses — demanding a
            // bucket and static S3 keys for a task that opens neither. Declaring the
            // provider it actually uses is the honest configuration, not a workaround.
            //
            // The serving function in 4c does need S3, and cannot do this. It is
            // blocked on making the static keys optional so the task role's default
            // credential chain applies — which is what CACHE_DYNAMODB_* already does
            // (`apps/api/src/config/env.config.ts:270`) and what S3 does not.
            STORAGE_PROVIDER: 'local',
          },
          cluster: props.migration?.cluster,
        });

        new MigrateTrigger(this, 'MigrateTrigger', {
          vpc: this.network.vpc,
          task: this.migrateTask,
          securityGroups: [this.databaseClientSecurityGroup],
          timeout: props.migration?.timeout,
          imageIdentifier,
          // Nothing may migrate before the proxy it connects through and the secret
          // it reads credentials from both exist.
          executeAfter: this.proxy ? [this.proxy, this.platformSecret] : [this.platformSecret],
        });
      }

      new CfnOutput(this, 'DatabaseSecretName', {
        value: this.platformSecret.secret.secretName,
        description:
          'Set SECRETS_AWS_SECRET_ID to this; credentials are resolved per use, never inlined.',
      });

      if (this.proxy) {
        new CfnOutput(this, 'DatabaseProxyEndpoint', {
          value: this.proxy.proxy.endpoint,
          description: 'Pooled Postgres endpoint. Nothing should connect to the cluster directly.',
        });
      }
    }

    this.docs = new DocsSite(this, 'Docs', {
      distPath: props.docs?.distPath ?? DEFAULT_DOCS_DIST,
      bucket: props.docs?.bucket,
    });

    this.edge = new EdgeDistribution(this, 'Edge', {
      hostname,
      certificate,
      docsBucket: this.docs.bucket,
    });

    const recordTarget = RecordTarget.fromAlias(new CloudFrontTarget(this.edge.distribution));
    new ARecord(this, 'AliasIpv4', {
      zone: props.dns.hostedZone,
      recordName: hostname,
      target: recordTarget,
    });
    // CloudFront answers on IPv6 by default; without the AAAA record, IPv6-only
    // clients cannot resolve the canonical name at all.
    new AaaaRecord(this, 'AliasIpv6', {
      zone: props.dns.hostedZone,
      recordName: hostname,
      target: recordTarget,
    });

    if (!this.docs.ownsBucket) {
      // CDK does not own an imported bucket's resource policy — addToResourcePolicy
      // silently no-ops — so the OAC grant must be applied out of band. Say so
      // rather than appear to have done it.
      new CfnOutput(this, 'DocsBucketPolicyRequired', {
        value: this.docs.bucket.bucketName,
        description:
          'Imported docs bucket: grant cloudfront.amazonaws.com s3:GetObject with an AWS:SourceArn condition on this distribution. CDK cannot apply it.',
      });
    }

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.edge.distribution.distributionDomainName,
      description: 'CloudFront domain; the canonical hostname aliases to this.',
    });

    new CfnOutput(this, 'CanonicalHostname', {
      value: this.hostname,
      description: 'The single public hostname; the path selects which app answers.',
    });

    new CfnOutput(this, 'RoutingPlan', {
      // Order matters and is the reviewable part: CloudFront evaluates behaviours in
      // declaration order, so this output is the routing decision, in the template.
      value: this.behaviours.map((b) => `${b.pathPattern}=>${b.origin}:${b.cache}`).join(' '),
      description: 'CloudFront behaviours in evaluation order, derived from lib/routing.ts.',
    });
  }
}
