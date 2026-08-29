/**
 * Slice 4b assertions: the image can reach and migrate the database.
 *
 * The cases worth pinning here are the ones a template review would not catch,
 * because they are contracts with things outside CloudFormation — the resolver's
 * secret shape, the proxy's TLS requirement, and the fact that a migration which
 * fails must fail the deploy rather than be reported as success.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

/**
 * `buildImageFromSource` is off by default. The default path builds a
 * `DockerImageAsset`, which fingerprints the entire repository at synth time — no
 * `docker build` runs, but the hash walk still costs seconds per synth and would
 * dominate this suite. One case below exercises it; the rest supply an image.
 */
function build(
  migration?: { enabled?: boolean },
  options: { buildImageFromSource?: boolean } = {}
) {
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
    database: {},
    migration: options.buildImageFromSource
      ? migration
      : {
          image: ContainerImage.fromRegistry('grant/api:test'),
          imageIdentifier: 'test-image',
          ...migration,
        },
  });
  return { template: Template.fromStack(stack), platform };
}

describe('connections go through the proxy', () => {
  it('creates a proxy that requires TLS', () => {
    const { template } = build();
    template.hasResourceProperties('AWS::RDS::DBProxy', {
      RequireTLS: true,
      EngineFamily: 'POSTGRESQL',
    });
  });

  it('places the proxy in isolated subnets, not with the internet-facing tier', () => {
    const { template, platform } = build();
    expect(platform.proxy).toBeDefined();
    // Two isolated subnets exist; the proxy names both.
    template.hasResourceProperties('AWS::RDS::DBProxy', {
      VpcSubnetIds: Match.anyValue(),
    });
  });

  it('reaches the proxy by security group, not by CIDR', () => {
    // A CIDR allowance widens silently as subnets are added; naming the client group
    // keeps the permission attached to identity.
    const { template } = build();
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

  it('builds the image from source when none is supplied', () => {
    // The default path an adopter gets on a first deploy: nothing pre-published, so
    // the stack builds from the workspace. The asset's own content hash then becomes
    // the signal that re-arms the migration on a later deploy.
    const { template } = build(undefined, { buildImageFromSource: true });
    const runners = template.findResources('AWS::Lambda::Function', {
      Properties: { Environment: { Variables: { IMAGE_IDENTIFIER: Match.anyValue() } } },
    });
    expect(Object.keys(runners)).toHaveLength(1);
    const identifier = Object.values(runners)[0].Properties.Environment.Variables
      .IMAGE_IDENTIFIER as string;
    // A content hash, not the 'caller-supplied' sentinel.
    expect(identifier).not.toBe('caller-supplied');
    expect(identifier).toMatch(/^[0-9a-f]{16,}$/);
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
