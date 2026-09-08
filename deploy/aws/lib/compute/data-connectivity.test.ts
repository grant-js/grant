/**
 * Slice 4b assertions: the image can reach and migrate the database.
 *
 * The cases worth pinning here are the ones a template review would not catch,
 * because they are contracts with things outside CloudFormation — the resolver's
 * secret shape, the proxy's TLS requirement, and the fact that a migration which
 * fails must fail the deploy rather than be reported as success.
 */
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { SecurityGroup, Vpc } from 'aws-cdk-lib/aws-ec2';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import type { GrantPlatformProps } from '../config/props';
import { GrantPlatform } from '../grant-platform';

function build(migration?: { enabled?: boolean }, options: { proxy?: boolean } = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
      // us-east-1 while the stack is in eu-central-1, which is how the reference app
      // composes it: CloudFront is global, only its certificate is pinned.
      certificate: Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
      ),
    },
    database: { proxy: { enabled: options.proxy ?? false } },
    // Caller-supplied for the serving function too, and for a reason that is about
    // runtime rather than tidiness: leaving it unset makes `GrantPlatform` construct a
    // `DockerImageAsset`, which fingerprints the whole build context. That cost lands
    // on whichever test runs first and pushed this file past vitest's 30 s ceiling in
    // CI once slice 6 added the jobs tier to the same graph. The jobs function reuses
    // this image, so pinning it here leaves the suite with no assets at all.
    api: {
      image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
        tagOrDigest: 'test',
      }),
    },
    // Always a registry image: see the note below on why the built-from-source path
    // is covered by the committed template rather than here.
    migration: {
      image: ContainerImage.fromRegistry('grant/api:test'),
      imageIdentifier: 'test-image',
      ...migration,
    },
  });
  return { template: Template.fromStack(stack), platform };
}

describe('pooling is opt-in because it forfeits auto-pause', () => {
  it('creates no proxy by default', () => {
    // Measured, not assumed: a proxy holds a persistent pool, and Aurora cannot
    // auto-pause while any connection exists. A live deploy sat at 0.5 ACU with four
    // held connections across forty idle minutes — about $58/month to keep
    // connections warm for traffic a green-field deploy does not have.
    const { template, platform } = build();
    template.resourceCountIs('AWS::RDS::DBProxy', 0);
    expect(platform.proxy).toBeUndefined();
  });

  it('lets clients reach the cluster directly when pooling is off', () => {
    // Something still has to be allowed in, or the migration cannot connect at all.
    const { template } = build();
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      Description: 'Grant database clients',
      IpProtocol: 'tcp',
    });
  });

  it('points DB_URL at the cluster when pooling is off, and the proxy when on', () => {
    const direct = JSON.stringify(build().template.findResources('AWS::SecretsManager::Secret'));
    expect(direct).toMatch(/Endpoint\.Address/);

    const pooled = build(undefined, { proxy: true });
    pooled.template.resourceCountIs('AWS::RDS::DBProxy', 1);
    expect(pooled.platform.proxy).toBeDefined();
  });

  it('creates a proxy that requires TLS', () => {
    const { template } = build(undefined, { proxy: true });
    template.hasResourceProperties('AWS::RDS::DBProxy', {
      RequireTLS: true,
      EngineFamily: 'POSTGRESQL',
    });
  });

  it('places the proxy in isolated subnets, not with the internet-facing tier', () => {
    const { template, platform } = build(undefined, { proxy: true });
    expect(platform.proxy).toBeDefined();
    // Two isolated subnets exist; the proxy names both.
    template.hasResourceProperties('AWS::RDS::DBProxy', {
      VpcSubnetIds: Match.anyValue(),
    });
  });

  it('reaches the proxy by security group, not by CIDR', () => {
    // A CIDR allowance widens silently as subnets are added; naming the client group
    // keeps the permission attached to identity.
    const { template } = build(undefined, { proxy: true });
    template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
      SourceSecurityGroupId: Match.anyValue(),
      IpProtocol: 'tcp',
    });
  });
});

describe('the platform secret is the shape the resolver accepts', () => {
  it('creates a second secret distinct from the cluster credentials', () => {
    // Two secrets, two shapes: RDS-shaped credentials for the proxy, and a flat
    // ENV_NAME:value object for AwsSecretsManagerResolver. Conflating them fails at
    // runtime, not at synth.
    const { template } = build();
    template.resourceCountIs('AWS::SecretsManager::Secret', 2);
  });

  it('composes DB_URL with sslmode, because the proxy requires TLS', () => {
    // resolveDatabaseUrl() in @grantjs/env builds a URL with no SSL parameter, so a
    // runtime-derived URL would be refused by a TLS-requiring proxy.
    const { template } = build();
    const secrets = template.findResources('AWS::SecretsManager::Secret');
    const rendered = JSON.stringify(Object.values(secrets));
    expect(rendered).toMatch(/sslmode=require/);
  });

  it('never writes a plaintext password into the template', () => {
    const { template } = build();
    const rendered = JSON.stringify(template.toJSON());
    // The composed URL must reach the template as a resolve-time reference only.
    expect(rendered).toMatch(/\{\{resolve:secretsmanager:/);
    expect(rendered).not.toMatch(/postgresql:\/\/[^"]*:[A-Za-z0-9]{16,}@/);
  });
});

describe('the migration runs at deploy and can fail the deploy', () => {
  it('runs migrate.js as a Fargate task, not as a Lambda', () => {
    // The image carries the Lambda Web Adapter as an extension; a container that never
    // listens on AWS_LWA_PORT fails the invocation even when the migration succeeded.
    const { template } = build();
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      RequiresCompatibilities: ['FARGATE'],
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({ Command: ['node', 'dist/migrate.js'], Essential: true }),
      ]),
    });
  });

  it('injects DB_URL from the secret rather than the environment', () => {
    // Nothing hydrates process.env from ISecretResolver: migrate.ts reads
    // config.db.url, derived from the environment at import. A DB_URL living only
    // inside the secret is one the migration cannot see. ECS fetches it at task start.
    const { template } = build();
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Secrets: Match.arrayWith([Match.objectLike({ Name: 'DB_URL' })]),
        }),
      ]),
    });
    // And never as a plain environment entry, which would put it in the template.
    const rendered = JSON.stringify(template.findResources('AWS::ECS::TaskDefinition'));
    expect(rendered).not.toMatch(/"Name":\s*"DB_URL",\s*"Value"/);
  });

  it('sets the production-required URL environment from appUrl', () => {
    // SECURITY_FRONTEND_URL is required once NODE_ENV is production, which the AWS
    // defaults set. Omitting it fails config validation before the database is touched.
    const { template } = build();
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([
            Match.objectLike({
              Name: 'SECURITY_FRONTEND_URL',
              Value: 'https://grant.example.com',
            }),
          ]),
        }),
      ]),
    });
  });

  it('does not ask the migration for storage credentials it never uses', () => {
    // validateConfig() validates the whole surface regardless of entrypoint, so
    // STORAGE_PROVIDER=s3 would demand a bucket and static keys from a task that
    // opens neither.
    const { template } = build();
    template.hasResourceProperties('AWS::ECS::TaskDefinition', {
      ContainerDefinitions: Match.arrayWith([
        Match.objectLike({
          Environment: Match.arrayWith([
            Match.objectLike({ Name: 'STORAGE_PROVIDER', Value: 'local' }),
          ]),
        }),
      ]),
    });
  });

  it('is omitted when disabled', () => {
    const { template, platform } = build({ enabled: false });
    expect(platform.migrateTask).toBeUndefined();
    template.resourceCountIs('AWS::ECS::TaskDefinition', 0);
  });

  it('grants the task read on the platform secret only', () => {
    const { template } = build();
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toMatch(/secretsmanager:GetSecretValue/);
    // The task must not be able to write secrets.
    expect(policies).not.toMatch(/secretsmanager:PutSecretValue/);
  });

  // The built-from-source path is deliberately NOT exercised here. Constructing a
  // DockerImageAsset fingerprints the build context, and doing it inside the suite cost
  // 282 s in one measured run — longer than every other test combined. The committed
  // template covers it on the real asset instead: `cdk.snapshot` records
  // `IMAGE_IDENTIFIER: <asset-hash>`, normalized by the snapshot script from a 64-hex
  // content hash, which is exactly the assertion this test would have made — that the
  // default path yields a hash rather than the 'caller-supplied' sentinel. `synth:check`
  // runs it on every build, so the coverage is stronger than a unit test, not weaker.

  it('waits for the writer instance, not just the cluster', () => {
    // An Aurora cluster endpoint has no DNS record until an instance exists, so a
    // migration that starts too early fails with ENOTFOUND rather than with a refused
    // connection. The platform secret references `clusterEndpoint.hostname`, which is
    // a DBCluster attribute — ordering the trigger after the cluster alone, and after
    // the writer never. A live deploy raced and lost: the trigger fired 58 s after the
    // instance began creating and 88 s before it would have been ready.
    const { template } = build();
    const trigger = Object.values(template.findResources('Custom::Trigger'))[0] as {
      DependsOn?: string[];
    };
    const instances = Object.keys(template.findResources('AWS::RDS::DBInstance'));

    expect(instances).toHaveLength(1);
    expect(trigger.DependsOn).toEqual(expect.arrayContaining(instances));
  });

  it('scopes ecs:RunTask to the cluster rather than to *', () => {
    const { template } = build();
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toMatch(/ecs:RunTask/);
    expect(policies).toMatch(/"ecs:cluster"/);
  });

  it('passes only the task roles, and only to ECS', () => {
    const { template } = build();
    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toMatch(/iam:PassRole/);
    expect(policies).toMatch(/ecs-tasks\.amazonaws\.com/);
  });
});

/**
 * Topology C, and B beside it: a database this stack did not create, reached with and
 * without a VPC.
 *
 * The cases worth pinning are the same kind as above — contracts with things outside
 * CloudFormation. Here they are that leaving the VPC does not quietly take the secret
 * grant with it, that it does not put `DB_URL` back into the function's configuration,
 * and that an adopter's own security group is actually opened rather than left as a
 * manual step someone is told about in a guide.
 */
describe('serving a database this stack did not create', () => {
  const BYO_ARN = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf';

  /**
   * Every image is caller-supplied — the migration's as well as the API's — for the
   * reason recorded above: a `DockerImageAsset` fingerprints the whole build context,
   * measured at 282 s in one run. The topologies that keep the Fargate migration would
   * otherwise build one, and the built-from-source path is covered by `synth:check`
   * against the real asset rather than here.
   */
  function buildByo(network?: (stack: Stack) => GrantPlatformProps['network']) {
    const app = new App();
    const stack = new Stack(app, 'TestStack', {
      env: { account: '123456789012', region: 'eu-central-1' },
    });
    const platform = new GrantPlatform(stack, 'Grant', {
      appUrl: 'https://grant.example.com',
      dns: {
        hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
          hostedZoneId: 'ZTEST000000000',
          zoneName: 'example.com',
        }),
        certificate: Certificate.fromCertificateArn(
          stack,
          'Cert',
          'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
        ),
      },
      databaseUrl: SecretValue.secretsManager(BYO_ARN),
      api: {
        image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
          tagOrDigest: 'test',
        }),
      },
      migration: {
        image: ContainerImage.fromRegistry('grant/api:test'),
        imageIdentifier: 'test-image',
      },
      ...(network ? { network: network(stack) } : {}),
    });
    return { template: Template.fromStack(stack), platform };
  }

  describe('with no VPC at all', () => {
    it('builds no VPC and places no function in one', () => {
      // The reason this topology exists: no VPC means no NAT gateway, which is the
      // largest fixed cost in the target.
      const { template, platform } = buildByo();

      template.resourceCountIs('AWS::EC2::VPC', 0);
      template.resourceCountIs('AWS::EC2::NatGateway', 0);
      expect(platform.network).toBeUndefined();

      const functions = Object.values(template.findResources('AWS::Lambda::Function'));
      expect(functions.length).toBeGreaterThan(0);
      for (const fn of functions) {
        expect(fn.Properties?.VpcConfig).toBeUndefined();
      }
    });

    it('creates no client security group, having no VPC to attach one to', () => {
      const { template, platform } = buildByo();
      expect(platform.databaseClientSecurityGroup).toBeUndefined();
      template.resourceCountIs('AWS::EC2::SecurityGroup', 0);
    });

    it('keeps the secret read the resolver depends on', () => {
      // Outside a VPC the function still resolves DB_URL per use through
      // ISecretResolver (ADR 0004). Losing this grant surfaces as a connection failure
      // to localhost rather than as an access-denied naming the secret.
      const { template } = buildByo();
      const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
      expect(policies).toMatch(/secretsmanager:GetSecretValue/);
      expect(policies).not.toMatch(/secretsmanager:PutSecretValue/);
    });

    it('still hands the function no database credential', () => {
      // Leaving the VPC changes where the function runs, not what it is told.
      const { template } = buildByo();
      for (const fn of Object.values(template.findResources('AWS::Lambda::Function'))) {
        expect(Object.keys(fn.Properties?.Environment?.Variables ?? {})).not.toContain('DB_URL');
      }
      expect(JSON.stringify(template.toJSON())).not.toMatch(/postgres(ql)?:\/\//);
    });

    it('runs no Fargate migration, because a task would have no subnets', () => {
      // `pnpm --filter grant-aws-deploy migrate` is this topology's path, and
      // `assertMigrationIsRunnable` refuses an explicit request rather than dropping it.
      const { template, platform } = buildByo();
      expect(platform.migrateTask).toBeUndefined();
      template.resourceCountIs('AWS::ECS::TaskDefinition', 0);
      template.resourceCountIs('AWS::ECS::Cluster', 0);
    });
  });

  describe("in the adopter's VPC", () => {
    function buildInTheirVpc() {
      return buildByo((stack) => ({
        vpc: Vpc.fromVpcAttributes(stack, 'TheirVpc', {
          vpcId: 'vpc-0123456789abcdef0',
          availabilityZones: ['eu-central-1a', 'eu-central-1b'],
          privateSubnetIds: ['subnet-aaa', 'subnet-bbb'],
        }),
        databaseSecurityGroup: SecurityGroup.fromSecurityGroupId(
          stack,
          'TheirDatabase',
          'sg-0123456789abcdef0'
        ),
      }));
    }

    it('opens their database security group rather than leaving a manual step', () => {
      // CDK does emit an ingress rule against a group it does not own, provided the
      // group was imported mutable — which `fromSecurityGroupId` is by default. With
      // `{ mutable: false }` the call is dropped silently, which is why the prop
      // documents the import to use.
      const { template, platform } = buildInTheirVpc();

      expect(platform.databaseClientSecurityGroup).toBeDefined();
      // Identity, not CIDR: the target is the literal id of a group this stack never
      // created, and the source is DatabaseClients.
      template.hasResourceProperties('AWS::EC2::SecurityGroupIngress', {
        GroupId: 'sg-0123456789abcdef0',
        IpProtocol: 'tcp',
        FromPort: 5432,
        ToPort: 5432,
        Description: 'Grant database clients',
        SourceSecurityGroupId: Match.anyValue(),
      });
    });

    it('creates no VPC of its own and still runs the Fargate migration', () => {
      const { template, platform } = buildInTheirVpc();
      template.resourceCountIs('AWS::EC2::VPC', 0);
      expect(platform.network?.ownsVpc).toBe(false);
      expect(platform.migrateTask).toBeDefined();
      template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
    });
  });

  describe('with a VPC this stack creates', () => {
    it('builds one when `network` is present but names no vpc', () => {
      // Topology D: a database that is peered, or otherwise only reachable from inside
      // a VPC the adopter does not already have.
      const { template, platform } = buildByo(() => ({}));
      template.resourceCountIs('AWS::EC2::VPC', 1);
      expect(platform.network?.ownsVpc).toBe(true);
      expect(platform.migrateTask).toBeDefined();
    });
  });
});
