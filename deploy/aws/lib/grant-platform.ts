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
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { AaaaRecord, ARecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';

import { ASSET_BEHAVIOURS, type CloudFrontBehaviour, toCloudFrontBehaviours } from './behaviours';
import { ApiFunction } from './compute/api-function';
import { ApiImage } from './compute/api-image';
import { DEFAULT_JOB_TIMEOUT, EVENT_DISPATCH_PATH, JobsFunction } from './compute/jobs-function';
import { MigrateTask } from './compute/migrate-task';
import { MigrateTrigger } from './compute/migrate-trigger';
import { WebFunction } from './compute/web-function';
import { WebImage } from './compute/web-image';
import { AWS_TARGET_ENV_DEFAULTS } from './config/defaults';
import type { GrantEnv, GrantPlatformProps } from './config/props';
import { assertCertificateRegion, validateAppUrl, validateHostnameInZone } from './config/validate';
import { CacheTable } from './data/cache-table';
import { Database } from './data/database';
import { JobQueue } from './data/job-queue';
import { Network } from './data/network';
import { ORIGIN_VERIFY_SECRET_KEY, PlatformSecret } from './data/platform-secret';
import { DatabaseConnectionProxy } from './data/proxy';
import { StorageBucket } from './data/storage-bucket';
import { EdgeCertificate } from './edge/certificate';
import { EdgeDistribution } from './edge/distribution';
import { DocsSite } from './edge/docs-site';
import { JobSchedules } from './jobs/job-schedules';

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

  /** Present only when the web app was requested. */
  public readonly web?: WebFunction;

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

  /** Present only when the data tier was requested. */
  public readonly cacheTable?: CacheTable;
  public readonly uploads?: StorageBucket;

  /**
   * The serving function. Present only when the data tier was requested.
   *
   * Bring-your-own-Postgres does not get one yet: the function reads `DB_URL` from
   * the platform secret, which this construct only creates alongside its own cluster.
   * Serving against an external database is a follow-up, not an omission.
   */
  public readonly api?: ApiFunction;

  /** Present only when the data tier was requested and jobs are enabled. */
  public readonly jobQueue?: JobQueue;
  public readonly jobsFunction?: JobsFunction;
  public readonly jobSchedules?: JobSchedules;

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
        extraEnv: props.secrets,
      });

      // One asset, built at most once and shared by the migration and the serving
      // function — ADR 0003's "one image everywhere", enforced by construction rather
      // than by convention. Lazy, so a deploy where both images are caller-supplied
      // builds nothing.
      let builtImage: ApiImage | undefined;
      const buildImage = (): ApiImage => (builtImage ??= new ApiImage(this, 'ApiImage'));
      const builtImageCode = (): DockerImageCode => {
        const { asset } = buildImage();
        return DockerImageCode.fromEcr(asset.repository, { tagOrDigest: asset.imageTag });
      };

      // Held, because the jobs function must not exist before the schema does — see
      // where the dependency is added below.
      let migrateTrigger: MigrateTrigger | undefined;

      if (props.migration?.enabled ?? true) {
        // Built from source unless the caller supplied one. `imageIdentifier` is what
        // re-arms the migration trigger, so a caller-supplied image needs the caller
        // to say when it changed — the tag alone may be mutable.
        let image = props.migration?.image;
        let imageIdentifier = props.migration?.imageIdentifier ?? 'caller-supplied';
        if (!image) {
          const built = buildImage();
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
            // The serving function does need S3 and does not do this: the static
            // keys are now optional, so its role's default credential chain applies.
            // This stays `local` regardless, because it is the honest configuration
            // for a task that opens no object storage — not a workaround for a gap.
            STORAGE_PROVIDER: 'local',
          },
          cluster: props.migration?.cluster,
        });

        migrateTrigger = new MigrateTrigger(this, 'MigrateTrigger', {
          vpc: this.network.vpc,
          task: this.migrateTask,
          securityGroups: [this.databaseClientSecurityGroup],
          timeout: props.migration?.timeout,
          imageIdentifier,
          // Nothing may migrate before the database it connects to, the proxy it
          // connects through, and the secret it reads credentials from.
          //
          // `this.database` is load-bearing and was missing. The secret depends on
          // `cluster.clusterEndpoint.hostname`, which is an attribute of the
          // **DBCluster** — so CloudFormation ordered the trigger after the cluster
          // and never after the writer instance. An Aurora cluster endpoint has no
          // DNS record until an instance exists, so the migration resolved a
          // hostname that was not there yet and failed with ENOTFOUND rather than
          // with a refused connection.
          //
          // Slice 4b passed on scheduling luck: with a smaller resource graph the
          // writer happened to finish first. Adding the serving function changed the
          // parallel schedule and the race flipped. Naming the whole construct covers
          // the instance as well as the cluster, so the ordering no longer depends on
          // which attribute happens to be referenced.
          executeAfter: this.proxy
            ? [this.database, this.proxy, this.platformSecret]
            : [this.database, this.platformSecret],
        });
      }

      this.cacheTable = new CacheTable(this, 'Cache', {
        table: props.cache?.table,
        destroyOnRemoval: props.cache?.destroyOnRemoval,
      });

      this.uploads = new StorageBucket(this, 'Uploads', {
        bucket: props.storage?.uploadsBucket,
        destroyOnRemoval: props.storage?.destroyOnRemoval,
      });

      // Jobs are opt-out, and creating the queue before the serving function is what
      // lets the API be told where to enqueue. `JOBS_PROVIDER=aws` splits execution
      // across two processes — the API sends, the jobs function consumes — so the API
      // needs the queue URL and the queue needs its consumer's timeout.
      const jobsEnabled = props.jobs?.enabled ?? true;
      const jobTimeout = props.jobs?.timeout ?? DEFAULT_JOB_TIMEOUT;
      if (jobsEnabled) {
        this.jobQueue = new JobQueue(this, 'JobQueue', {
          queue: props.jobs?.queue,
          consumerTimeout: jobTimeout,
        });
      }

      this.api = new ApiFunction(this, 'Api', {
        vpc: this.network.vpc,
        code: props.api?.image ?? builtImageCode(),
        securityGroups: [this.databaseClientSecurityGroup],
        platformSecret: this.platformSecret.secret,
        cacheTable: this.cacheTable.table,
        uploadsBucket: this.uploads.bucket,
        environment: {
          ...this.env,
          // The resolver's own configuration, not a credential: it names *where* to
          // look, and the function's role is what permits the lookup. DB_URL itself
          // never enters this environment — create-app.ts resolves it per use
          // through ISecretResolver (ADR 0004), which is what lets a rotation reach a
          // warm container.
          SECRETS_AWS_SECRET_ID: this.platformSecret.secret.secretName,
          SECRETS_AWS_REGION: Stack.of(this).region,
          // Names only. The static STORAGE_S3_* and CACHE_DYNAMODB_* keys are left
          // unset so the SDK falls through to the function role's credentials.
          STORAGE_S3_BUCKET: this.uploads.bucket.bucketName,
          STORAGE_S3_REGION: Stack.of(this).region,
          CACHE_DYNAMODB_TABLE: this.cacheTable.table.tableName,
          CACHE_DYNAMODB_REGION: Stack.of(this).region,
          // Where `enqueue()` sends one-off work. Under `node-cron` — what this target
          // ran until now — the handler executed inline, inside the request's own
          // invocation and under its 30-second timeout; `startProjectSync` was the
          // caller that made that untenable.
          ...(this.jobQueue ? { JOBS_AWS_QUEUE_URL: this.jobQueue.queue.queueUrl } : {}),
          JOBS_AWS_REGION: Stack.of(this).region,
          // CloudFront overwrites this header, so it cannot be supplied by the caller
          // the way X-Forwarded-For can — which CloudFront *appends* to, leaving the
          // first entry attacker-controlled. The rate limiter keys on this value.
          SECURITY_TRUSTED_CLIENT_IP_HEADER: 'cloudfront-viewer-address',
        },
        memorySize: props.api?.memorySize,
        timeout: props.api?.timeout,
        reservedConcurrency: props.api?.reservedConcurrency,
      });

      if (this.jobQueue) {
        // The API may enqueue, and only enqueue: nothing on the request path consumes
        // the queue, which is the separation the whole arrangement exists for.
        this.jobQueue.queue.grantSendMessages(this.api.function);

        this.jobsFunction = new JobsFunction(this, 'Jobs', {
          vpc: this.network.vpc,
          code: props.jobs?.image ?? props.api?.image ?? builtImageCode(),
          securityGroups: [this.databaseClientSecurityGroup],
          platformSecret: this.platformSecret.secret,
          cacheTable: this.cacheTable.table,
          uploadsBucket: this.uploads.bucket,
          queue: this.jobQueue.queue,
          environment: {
            ...this.env,
            SECRETS_AWS_SECRET_ID: this.platformSecret.secret.secretName,
            SECRETS_AWS_REGION: Stack.of(this).region,
            STORAGE_S3_BUCKET: this.uploads.bucket.bucketName,
            STORAGE_S3_REGION: Stack.of(this).region,
            CACHE_DYNAMODB_TABLE: this.cacheTable.table.tableName,
            CACHE_DYNAMODB_REGION: Stack.of(this).region,
            JOBS_AWS_QUEUE_URL: this.jobQueue.queue.queueUrl,
            JOBS_AWS_REGION: Stack.of(this).region,
            // The dispatch route, mounted only here. It is deliberately ahead of
            // origin verification — no AWS event source can send CloudFront's secret —
            // which is safe because this function has no Function URL and is reachable
            // only by a principal holding `lambda:InvokeFunction`.
            JOBS_EVENT_DISPATCH_ENABLED: 'true',
            JOBS_EVENT_DISPATCH_PATH: EVENT_DISPATCH_PATH,
          },
          memorySize: props.jobs?.memorySize,
          timeout: jobTimeout,
          reservedConcurrency: props.jobs?.reservedConcurrency,
        });

        // Nothing job-shaped may exist before the migration has finished, and the
        // first deploy is what proved it necessary: the rules were armed while the
        // one-shot was still running, so the every-minute sweeps spent the first
        // ninety seconds failing with `relation "event_log" does not exist`. Harmless
        // — the next tick succeeds — but an adopter's first look at a fresh deploy
        // should not be a log full of errors from a stack that is working.
        //
        // Ordering the *function* rather than the rules covers the queue as well: the
        // event-source mapping is created with it, so neither path can deliver into an
        // unmigrated database.
        if (migrateTrigger) {
          this.jobsFunction.node.addDependency(migrateTrigger);
        }

        // Recurrence. Six rules, generated from the same declaration the parity test
        // holds against `apps/api/src/jobs`, so a job added there without a rule here
        // fails CI rather than silently never running.
        this.jobSchedules = new JobSchedules(this, 'JobSchedules', {
          target: this.jobsFunction.function,
          env: this.env,
        });

        new CfnOutput(this, 'JobQueueUrl', {
          value: this.jobQueue.queue.queueUrl,
          description: 'One-off job queue. Recurring work arrives from EventBridge instead.',
        });
      }

      new CfnOutput(this, 'ApiFunctionUrl', {
        value: this.api.functionUrl.url,
        description:
          'IAM-authorized origin endpoint. Not publicly reachable; sign requests with SigV4.',
      });

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

    if (props.web) {
      // One asset, referenced twice. Constructing WebImage inline for each of
      // `repository` and `imageTag` would create two DockerImageAssets and build the
      // image twice.
      let webCode = props.web.image;
      if (!webCode) {
        const { asset } = new WebImage(this, 'WebImage');
        webCode = DockerImageCode.fromEcr(asset.repository, { tagOrDigest: asset.imageTag });
      }

      this.web = new WebFunction(this, 'Web', {
        code: webCode,
        // Deliberately outside the VPC. The web app reaches the API over the public
        // canonical URL exactly as a browser does, so it needs nothing from inside —
        // and staying out avoids ENI attachment on every cold start.
        environment: {
          APP_URL: props.appUrl,
          ...props.web.env,
        },
        memorySize: props.web.memorySize,
        timeout: props.web.timeout,
      });
    }

    this.docs = new DocsSite(this, 'Docs', {
      distPath: props.docs?.distPath ?? DEFAULT_DOCS_DIST,
      bucket: props.docs?.bucket,
    });

    this.edge = new EdgeDistribution(this, 'Edge', {
      hostname,
      certificate,
      docsBucket: this.docs.bucket,
      apiFunctionUrl: this.api?.functionUrl,
      // A dynamic reference, not the value: CloudFormation resolves it at deploy and
      // the plaintext never reaches the template. Present only when the API is.
      apiOriginSecret: this.platformSecret?.secret
        .secretValueFromJson(ORIGIN_VERIFY_SECRET_KEY)
        .unsafeUnwrap(),
      webFunctionUrl: this.web?.functionUrl,
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
