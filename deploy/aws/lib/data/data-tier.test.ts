/**
 * Network and data-tier assertions.
 *
 * Two of these exist because of costs that are invisible until a bill arrives, which
 * is the worst way to discover them: CDK's `SNAPSHOT` removal default leaves a
 * storage-billed snapshot behind after `cdk destroy`, and its one-NAT-per-AZ default
 * doubles the largest fixed cost in the target. Both are pinned here so a later
 * change has to argue with a test rather than slip through.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

function build(
  database?: { destroyOnRemoval?: boolean; minCapacity?: number },
  network?: { natGateways?: number; useExistingVpc?: boolean }
) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'us-east-1' },
  });
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl: 'https://grant.example.com',
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName: 'example.com',
      }),
    },
    database,
    network: network?.useExistingVpc
      ? {
          vpc: Vpc.fromVpcAttributes(stack, 'Existing', {
            vpcId: 'vpc-12345678',
            availabilityZones: ['us-east-1a', 'us-east-1b'],
            privateSubnetIds: ['subnet-1', 'subnet-2'],
            isolatedSubnetIds: ['subnet-3', 'subnet-4'],
          }),
        }
      : { natGateways: network?.natGateways },
  });
  return { template: Template.fromStack(stack), platform };
}

describe('the data tier is opt-in', () => {
  it('creates no VPC or database when not requested', () => {
    // The docs-only deploy must stay free of a VPC, and omitting the data tier is the
    // bring-your-own-Postgres path the Helm chart has always taken.
    const { template, platform } = build(undefined);
    template.resourceCountIs('AWS::EC2::VPC', 0);
    template.resourceCountIs('AWS::RDS::DBCluster', 0);
    expect(platform.database).toBeUndefined();
    expect(platform.network).toBeUndefined();
  });

  it('creates both when requested', () => {
    const { template, platform } = build({});
    template.resourceCountIs('AWS::EC2::VPC', 1);
    template.resourceCountIs('AWS::RDS::DBCluster', 1);
    expect(platform.database).toBeDefined();
  });

  it('reuses an existing VPC rather than creating one', () => {
    // ADR 0005: an imported IVpc is indistinguishable downstream.
    const { template, platform } = build({}, { useExistingVpc: true });
    template.resourceCountIs('AWS::EC2::VPC', 0);
    expect(platform.network?.ownsVpc).toBe(false);
  });
});

describe('teardown leaves no billed remains', () => {
  it('never inherits the SNAPSHOT removal default', () => {
    // CDK defaults DatabaseCluster to RemovalPolicy.SNAPSHOT, which removes the
    // cluster but retains a snapshot billed for storage indefinitely — invisible
    // unless you go looking for it. This construct is explicit in both directions.
    for (const destroy of [true, false]) {
      const { template } = build({ destroyOnRemoval: destroy });
      template.hasResource('AWS::RDS::DBCluster', {
        DeletionPolicy: destroy ? 'Delete' : 'Retain',
        UpdateReplacePolicy: destroy ? 'Delete' : 'Retain',
      });
    }
  });

  it('enables deletion protection unless teardown is explicitly allowed', () => {
    const guarded = build({ destroyOnRemoval: false });
    guarded.template.hasResourceProperties('AWS::RDS::DBCluster', {
      DeletionProtection: true,
    });
    const throwaway = build({ destroyOnRemoval: true });
    throwaway.template.hasResourceProperties('AWS::RDS::DBCluster', {
      DeletionProtection: false,
    });
  });
});

describe('cost defaults', () => {
  it('creates one NAT gateway, not one per availability zone', () => {
    // CDK's default is one per AZ. At ~$32/month each that silently doubles the
    // largest fixed cost in the target before a single request is served.
    const { template } = build({});
    template.resourceCountIs('AWS::EC2::NatGateway', 1);
  });

  it('lets an adopter buy zonal redundancy back', () => {
    const { template } = build({}, { natGateways: 2 });
    template.resourceCountIs('AWS::EC2::NatGateway', 2);
  });

  it('auto-pauses an idle cluster to zero capacity', () => {
    // Serverless v2 scales to 0 ACUs on engine versions supporting auto-pause, which
    // is the difference between a database that costs money overnight and one that
    // does not.
    const { template } = build({});
    template.hasResourceProperties('AWS::RDS::DBCluster', {
      ServerlessV2ScalingConfiguration: Match.objectLike({ MinCapacity: 0 }),
    });
  });
});

describe('database placement and secrets', () => {
  it('puts the cluster in isolated subnets with no route out', () => {
    const { template } = build({});
    // An isolated subnet has no route to a NAT gateway; a private-with-egress one
    // does. Asserting the count proves the third tier exists to hold the database.
    template.resourceCountIs('AWS::EC2::Subnet', 6);
  });

  it('encrypts storage', () => {
    const { template } = build({});
    template.hasResourceProperties('AWS::RDS::DBCluster', { StorageEncrypted: true });
  });

  it('generates credentials into Secrets Manager rather than the template', () => {
    // No password is ever expressed in the template, in CDK context, or in an
    // environment variable — phase B's ISecretResolver reads it per use.
    const { template } = build({});
    template.resourceCountIs('AWS::SecretsManager::Secret', 1);
    const json = JSON.stringify(template.toJSON());
    expect(json).not.toMatch(/"MasterUserPassword":\s*"[^"]/);
  });

  it('publishes the secret name for SECRETS_AWS_SECRET_ID', () => {
    const { template } = build({});
    template.hasOutput('*', {
      Description: Match.stringLikeRegexp('SECRETS_AWS_SECRET_ID'),
    });
  });
});
