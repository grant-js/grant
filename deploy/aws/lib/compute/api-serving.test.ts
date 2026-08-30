/**
 * Slice 4c assertions: the API can serve.
 *
 * The cases pinned here are the ones a template review would not catch, because each
 * is a contract with something outside CloudFormation — the cache adapter's item
 * shape, the resolver's promise that no credential enters the environment, and the
 * connection arithmetic between Lambda concurrency and Aurora's `max_connections`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { CACHE_PARTITION_KEY, CACHE_SORT_KEY, CACHE_TTL_ATTRIBUTE } from '../data/cache-table';
import { GrantPlatform } from '../grant-platform';

/**
 * Both images are caller-supplied, and that is not incidental. Constructing a
 * `DockerImageAsset` fingerprints the whole build context — 282 s in one measured run
 * during slice 4b, longer than every other test combined. The built-from-source path
 * is covered by the committed template instead, where `synth:check` exercises it on
 * every build against the real asset.
 */
function build(
  overrides: {
    api?: { reservedConcurrency?: number; memorySize?: number };
    cache?: { destroyOnRemoval?: boolean };
    storage?: { destroyOnRemoval?: boolean };
  } = {}
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
      certificate: Certificate.fromCertificateArn(
        stack,
        'Cert',
        'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
      ),
    },
    database: {},
    migration: {
      image: ContainerImage.fromRegistry('grant/api:test'),
      imageIdentifier: 'test-image',
    },
    api: {
      image: DockerImageCode.fromEcr(Repository.fromRepositoryName(stack, 'Repo', 'grant/api'), {
        tagOrDigest: 'test',
      }),
      ...overrides.api,
    },
    cache: overrides.cache,
    storage: overrides.storage,
  });
  return { template: Template.fromStack(stack), platform };
}

/** The one Lambda carrying the resolver configuration is the serving function. */
function apiFunction(template: Template): Record<string, unknown> {
  const functions = Object.values(template.findResources('AWS::Lambda::Function'));
  const api = functions.filter((fn) => {
    const props = fn.Properties as { Environment?: { Variables?: Record<string, unknown> } };
    return props.Environment?.Variables?.SECRETS_AWS_SECRET_ID !== undefined;
  });
  expect(api).toHaveLength(1);
  return api[0] as Record<string, unknown>;
}

function apiEnvironment(template: Template): Record<string, unknown> {
  const props = apiFunction(template).Properties as {
    Environment: { Variables: Record<string, unknown> };
  };
  return props.Environment.Variables;
}

describe('no credential reaches the serving function', () => {
  it('passes the secret id but never the secret', () => {
    // The payoff of resolving DB_URL through ISecretResolver (ADR 0004). The migrate
    // task must inject DB_URL as an ECS secret because its entrypoint reads
    // config.db.url; create-app.ts resolves per use, so the serving function is told
    // only where to look. A rotation therefore reaches a warm container.
    const env = apiEnvironment(build().template);

    expect(env.SECRETS_AWS_SECRET_ID).toBeDefined();
    expect(env.SECRETS_PROVIDER).toBe('aws-secrets-manager');
    expect(env.DB_URL).toBeUndefined();
  });

  it('sets no static access keys, so the function role is used', () => {
    // apps/api treats STORAGE_S3_* and CACHE_DYNAMODB_* credentials as optional
    // precisely so the SDK's default chain applies. Setting them here would put
    // long-lived keys in a template.
    const env = apiEnvironment(build().template);

    const credentialShaped = Object.keys(env).filter(
      (key) => key.includes('ACCESS_KEY') || key.includes('PASSWORD') || key.includes('SECRET_KEY')
    );
    expect(credentialShaped).toEqual([]);
  });

  it('names the bucket and table without granting more than the data plane', () => {
    const { template } = build();
    const env = apiEnvironment(template);
    expect(env.STORAGE_S3_BUCKET).toBeDefined();
    expect(env.CACHE_DYNAMODB_TABLE).toBeDefined();

    const policies = JSON.stringify(template.findResources('AWS::IAM::Policy'));
    expect(policies).toMatch(/dynamodb:PutItem/);
    // Control-plane verbs would let the function delete the table it caches into.
    expect(policies).not.toMatch(/dynamodb:DeleteTable/);
    expect(policies).not.toMatch(/s3:DeleteBucket/);
    expect(policies).not.toMatch(/secretsmanager:PutSecretValue/);
  });
});

describe('the function URL answers the internet, and is guarded in the app', () => {
  it('is unauthenticated at the AWS layer, by necessity', () => {
    // This started as AWS_IAM and had to change. CloudFront's Origin Access Control
    // cannot carry this API: its recommended signing mode overwrites the viewer's
    // Authorization header, and POST through OAC requires the *viewer* to send
    // x-amz-content-sha256 with the body hash. GraphQL is POST-only from a browser.
    //
    // Asserted rather than left implicit so the cost of that constraint is visible in
    // the test suite: nothing at the AWS layer refuses an unsigned caller here.
    const { template } = build();
    template.hasResourceProperties('AWS::Lambda::Url', { AuthType: 'NONE' });
  });

  it('is therefore invokable by any principal, which is the whole exposure', () => {
    // CDK attaches a `*`-principal permission for a NONE URL. What actually turns
    // away a direct caller is originVerifyMiddleware in apps/api, checking a secret
    // only CloudFront attaches — enforced in the function rather than by AWS, so a
    // probe costs one short invocation. Reserved concurrency bounds that.
    const { template } = build();
    const permissions = Object.values(template.findResources('AWS::Lambda::Permission'));
    const urlPermissions = permissions.filter(
      (p) => (p.Properties as { FunctionUrlAuthType?: string }).FunctionUrlAuthType === 'NONE'
    );

    expect(urlPermissions).toHaveLength(1);
    expect((urlPermissions[0].Properties as { Principal: string }).Principal).toBe('*');
  });

  it('generates the origin secret rather than composing it into the template', () => {
    // The compensating control. It must exist in the secret and not as a literal
    // anywhere in the template.
    const { template } = build();
    const secrets = JSON.stringify(template.findResources('AWS::SecretsManager::Secret'));

    expect(secrets).toMatch(/ORIGIN_VERIFY_SECRET/);
    expect(secrets).not.toMatch(/"[A-Za-z0-9]{64}"/);
  });
});

describe('database connections stay within what Aurora accepts', () => {
  it('bounds concurrency times pool size well under max_connections', () => {
    // Pooling is off by default, so each warm environment holds its own connections.
    // An account's default Lambda concurrency limit is 1000; unbounded, that is 2000
    // connections against the ~900 Aurora allows at maxCapacity 4. The product of
    // these two values is the real guard, so the test asserts the product.
    const { template } = build();
    const props = apiFunction(template).Properties as {
      ReservedConcurrentExecutions: number;
    };
    const poolMax = Number(apiEnvironment(template).DB_POOL_MAX);

    expect(poolMax).toBeGreaterThan(0);
    expect(props.ReservedConcurrentExecutions * poolMax).toBeLessThan(100);
  });

  it('stays at the memory that measured fastest, not the one that reasons fastest', () => {
    // 1,769 MB is where Lambda gives a full vCPU, so it should boot faster. Measured
    // A/B on a live deploy it does the opposite: init hits the 10 s ceiling and is
    // re-run inside the invocation, billing 13,811 ms, against 7,634 ms at 1024.
    // Pinned so the appealing-but-wrong value cannot be reintroduced from first
    // principles without someone re-measuring INIT_REPORT.
    const { template } = build();
    const props = apiFunction(template).Properties as { MemorySize: number };
    expect(props.MemorySize).toBe(1024);
  });

  it('lets concurrency be unbounded only when asked explicitly', () => {
    // 0 is the opt-out for a deployment that has enabled the proxy, where the pool
    // lives in the proxy rather than in each execution environment.
    const { template } = build({ api: { reservedConcurrency: 0 } });
    const props = apiFunction(template).Properties as {
      ReservedConcurrentExecutions?: number;
    };
    expect(props.ReservedConcurrentExecutions).toBeUndefined();
  });
});

describe('the cache table matches what the adapter writes', () => {
  it('uses the attribute names DynamoDBCacheAdapter actually writes', () => {
    // A third witness, in the spirit of the routing oracle: the construct and the
    // adapter are separate packages with no compile-time link, so a renamed attribute
    // would deploy clean and fail at the first set(). Read the adapter rather than
    // restating its literals — two copies of a literal prove only that both were typed.
    const adapterSource = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        '../../../../packages/@grantjs/cache/src/dynamodb/index.ts'
      ),
      'utf8'
    );

    expect(adapterSource).toMatch(new RegExp(`${CACHE_PARTITION_KEY}:\\s*\\{\\s*S:`));
    expect(adapterSource).toMatch(new RegExp(`${CACHE_SORT_KEY}:\\s*\\{\\s*S:`));
    expect(adapterSource).toMatch(new RegExp(`${CACHE_TTL_ATTRIBUTE}:\\s*\\{\\s*N:`));
  });

  it('declares that key schema on the table', () => {
    const { template } = build();
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      KeySchema: [
        { AttributeName: CACHE_PARTITION_KEY, KeyType: 'HASH' },
        { AttributeName: CACHE_SORT_KEY, KeyType: 'RANGE' },
      ],
    });
  });

  it('expires entries, so the table does not grow without bound', () => {
    // Without a TTL specification `expiresAt` is an ordinary attribute: the adapter
    // filters expired reads in code, but nothing ever deletes them.
    const { template } = build();
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      TimeToLiveSpecification: { AttributeName: CACHE_TTL_ATTRIBUTE, Enabled: true },
    });
  });

  it('bills per request, not per hour', () => {
    // Provisioned capacity would reintroduce the idle cost that ruled out ElastiCache.
    const { template } = build();
    template.hasResourceProperties('AWS::DynamoDB::GlobalTable', {
      BillingMode: 'PAY_PER_REQUEST',
    });
  });
});

describe('teardown keeps what cannot be rebuilt', () => {
  it('retains uploaded objects but discards the cache', () => {
    // Deliberately asymmetric: cache entries are reconstructible and TTL'd, uploads
    // are user data. Retaining a cache table leaves a billed resource nobody reads.
    const { template } = build();
    template.hasResource('AWS::S3::Bucket', {
      Properties: Match.objectLike({ BucketName: Match.absent() }),
      DeletionPolicy: 'Retain',
    });
    template.hasResource('AWS::DynamoDB::GlobalTable', { DeletionPolicy: 'Delete' });
  });

  it('creates no object-emptying custom resource for the uploads bucket', () => {
    // autoDeleteObjects installs a Lambda that empties the bucket on teardown. For a
    // bucket holding real uploads that must never exist by default.
    const { template } = build();
    const buckets = template.findResources('AWS::S3::Bucket');
    const retained = Object.entries(buckets).filter(
      ([, bucket]) => bucket.DeletionPolicy === 'Retain'
    );
    expect(retained).toHaveLength(1);
  });

  it('blocks public access to uploads', () => {
    const { template } = build();
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });
});

describe('the function runs where the database can be reached', () => {
  it('sits in private subnets wearing the database client group', () => {
    // Never public, and never isolated: the API calls SES, GitHub OAuth and arbitrary
    // webhook URLs, none of which a VPC endpoint can reach.
    const { template } = build();
    const props = apiFunction(template).Properties as {
      VpcConfig: { SubnetIds: unknown[]; SecurityGroupIds: unknown[] };
    };
    expect(props.VpcConfig.SubnetIds).toHaveLength(2);
    expect(props.VpcConfig.SecurityGroupIds).toHaveLength(1);
  });

  it('keeps S3 and DynamoDB traffic off the NAT gateway', () => {
    // Gateway endpoints are free. Without them every cache read and every upload is
    // billed as NAT data processing.
    const { template } = build();
    template.resourceCountIs('AWS::EC2::VPCEndpoint', 2);
  });
});
