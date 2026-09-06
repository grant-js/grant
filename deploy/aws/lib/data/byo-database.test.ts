/**
 * The bring-your-own topology, asserted as an inventory.
 *
 * The story's first acceptance criterion is that omitting `database` produces a
 * *complete* deployment rather than a docs-only one, so the test that matters is a
 * census: every serving resource present, and no cluster. Asserting only "the API
 * function exists" would pass on a graph missing the queue, the bucket or half the
 * schedules — which is exactly the failure this slice is repairing, one condition
 * further along.
 */
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import type { GrantPlatformProps } from '../config/props';
import { GrantPlatform } from '../grant-platform';

const BYO_ARN = 'arn:aws:secretsmanager:eu-central-1:123456789012:secret:grant/db-url-AbCdEf';

/**
 * Every image is caller-supplied, for the reason `api-serving.test.ts` records:
 * constructing a `DockerImageAsset` fingerprints the whole build context, measured at
 * 282 s in one slice 4b run. This file builds a platform seven times, so building
 * from source here times the suite out on CI rather than merely slowing it — which is
 * exactly what happened on the first push of this slice.
 *
 * Nothing under test is lost. The inventory below is about which constructs exist and
 * how they are wired, not about how an image was produced, and the built-from-source
 * path is exercised on every build by `synth:check` against the real asset.
 */
function build(overrides: Partial<GrantPlatformProps> = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  const image = DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
    tagOrDigest: 'test',
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
    api: { image },
    web: { image },
    // The migration has its own suite, and its shape is not what the old
    // `if (props.database)` condition gated.
    migration: { enabled: false },
    ...overrides,
  });
  return { template: Template.fromStack(stack), platform };
}

describe('serving against a database this stack did not create', () => {
  it('creates no cluster, and no credentials for one', () => {
    const { template, platform } = build();

    template.resourceCountIs('AWS::RDS::DBCluster', 0);
    template.resourceCountIs('AWS::RDS::DBInstance', 0);
    template.resourceCountIs('AWS::RDS::DBProxy', 0);
    expect(platform.database).toBeUndefined();
    expect(platform.proxy).toBeUndefined();
  });

  it('creates the whole serving inventory anyway', () => {
    const { template, platform } = build();

    // Two Lambdas with a Function URL each — API and web — plus the jobs function,
    // which has none.
    expect(platform.api).toBeDefined();
    expect(platform.web).toBeDefined();
    expect(platform.jobsFunction).toBeDefined();
    template.resourceCountIs('AWS::Lambda::Url', 2);

    expect(platform.cacheTable).toBeDefined();
    // `GlobalTable`, not `Table`: CacheTable builds a TableV2.
    template.resourceCountIs('AWS::DynamoDB::GlobalTable', 1);

    expect(platform.uploads).toBeDefined();
    expect(platform.jobQueue).toBeDefined();
    template.resourceCountIs('AWS::SQS::Queue', 2); // queue and its dead-letter queue

    expect(platform.platformSecret).toBeDefined();
    expect(platform.docs).toBeDefined();

    // Six rules, from the same declaration the parity test holds against
    // `apps/api/src/jobs` — so the BYO path runs the same recurring work, not a
    // subset of it.
    expect(platform.jobSchedules).toBeDefined();
    template.resourceCountIs('AWS::Events::Rule', 6);
  });

  it('routes the API through CloudFront rather than leaving the origin unreferenced', () => {
    // The failure this replaces was not a missing function — it was a distribution
    // with no API origin, serving only docs.
    const { template } = build();

    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        Origins: Match.arrayWith([Match.objectLike({ CustomOriginConfig: Match.anyValue() })]),
      },
    });
  });

  it('gives the API no database credential in its environment', () => {
    // The whole point of the platform secret: DB_URL is resolved per use through
    // ISecretResolver (ADR 0004), never handed to the function as configuration.
    const { template } = build();
    const functions = template.findResources('AWS::Lambda::Function');

    for (const fn of Object.values(functions)) {
      const environment = fn.Properties?.Environment?.Variables ?? {};
      expect(Object.keys(environment)).not.toContain('DB_URL');
    }

    expect(JSON.stringify(template.toJSON())).not.toMatch(/postgres(ql)?:\/\//);
  });
});

describe('the docs-only deploy is unchanged', () => {
  it('creates no VPC, no cluster and no serving function when neither prop is set', () => {
    // Topology E. `servesApi` is false, so this must behave exactly as it did when
    // one condition gated everything.
    const { template, platform } = build({ databaseUrl: undefined, web: undefined });

    template.resourceCountIs('AWS::EC2::VPC', 0);
    template.resourceCountIs('AWS::RDS::DBCluster', 0);
    template.resourceCountIs('AWS::DynamoDB::GlobalTable', 0);
    template.resourceCountIs('AWS::SQS::Queue', 0);
    template.resourceCountIs('AWS::Events::Rule', 0);
    expect(platform.api).toBeUndefined();
    expect(platform.network).toBeUndefined();
    expect(platform.platformSecret).toBeUndefined();
  });
});

describe('exactly one database, refused at synth', () => {
  it('refuses both props at once', () => {
    // Topology F. No default resolves this, and guessing means the API may write to
    // a cluster the adopter is paying for while their real data sits elsewhere.
    expect(() => build({ database: {} })).toThrow(/Pick one database/);
  });

  it('refuses DB_URL smuggled through env', () => {
    // ADR 0005 invites an adopter to replace bin/ and build these props directly,
    // which reaches the plaintext Lambda variable without touching the env file that
    // `classifyConfig` guards.
    expect(() => build({ env: { DB_URL: 'postgresql://u:p@h:5432/d' } })).toThrow(
      /cannot be passed through/
    );
  });
});
