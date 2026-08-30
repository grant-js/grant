/**
 * Slice 4d assertions: the edge routes to the API without becoming a bypass.
 *
 * The cases here are the ones a template review would not catch, because each is a
 * contract with CloudFront's own behaviour — evaluation order, which headers survive
 * the hop, and what a Function URL does with a Host it does not recognise.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { toCloudFrontBehaviours } from '../behaviours';
import { GrantPlatform } from '../grant-platform';

function build(options: { database?: boolean } = {}) {
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
    ...(options.database === false
      ? {}
      : {
          database: {},
          migration: {
            image: ContainerImage.fromRegistry('grant/api:test'),
            imageIdentifier: 'test-image',
          },
          api: {
            image: DockerImageCode.fromEcr(
              Repository.fromRepositoryName(stack, 'Repo', 'grant/api'),
              { tagOrDigest: 'test' }
            ),
          },
        }),
  });
  return { template: Template.fromStack(stack), platform };
}

function distributionConfig(template: Template): {
  CacheBehaviors?: Record<string, unknown>[];
  Origins: Record<string, unknown>[];
} {
  const dist = Object.values(template.findResources('AWS::CloudFront::Distribution'))[0] as {
    Properties: { DistributionConfig: { CacheBehaviors?: []; Origins: [] } };
  };
  return dist.Properties.DistributionConfig;
}

describe('every API route reaches the API', () => {
  it('creates a behaviour for each derived API route, and no others', () => {
    // The derivation is the single source of routing truth; this asserts the
    // distribution consumed all of it rather than a hand-maintained subset.
    const expected = toCloudFrontBehaviours()
      .filter((b) => b.origin === 'api')
      .map((b) => b.pathPattern);
    const actual = (distributionConfig(build().template).CacheBehaviors ?? [])
      .map((b) => b.PathPattern as string)
      .filter((p) => p !== '/docs/*');

    expect(expected.length).toBeGreaterThan(0);
    expect(actual).toEqual(expected);
  });

  it('keeps them in the derivation precedence order', () => {
    // CloudFront matches behaviours in declaration order, not by specificity, so a
    // reordering here silently changes which app answers a path.
    const expected = toCloudFrontBehaviours().map((b) => b.pathPattern);
    const actual = (distributionConfig(build().template).CacheBehaviors ?? []).map(
      (b) => b.PathPattern as string
    );

    expect(actual).toEqual(expected);
  });

  it('allows write methods, or every mutation 405s at the edge', () => {
    // GraphQL is POST-only and the REST surface writes. The read-only method set is
    // CloudFront's default for a new behaviour, so this is easy to lose.
    const behaviours = distributionConfig(build().template).CacheBehaviors ?? [];
    const api = behaviours.filter((b) => b.PathPattern !== '/docs/*');

    for (const behaviour of api) {
      expect(behaviour.AllowedMethods).toEqual(
        expect.arrayContaining(['POST', 'PUT', 'PATCH', 'DELETE'])
      );
    }
  });

  it('caches nothing on the API', () => {
    // A cached authenticated response is a cross-tenant data leak. CachePolicyId must
    // be the managed CachingDisabled policy on every API behaviour.
    const behaviours = distributionConfig(build().template).CacheBehaviors ?? [];
    const api = behaviours.filter((b) => b.PathPattern !== '/docs/*');
    const policies = new Set(api.map((b) => b.CachePolicyId as string));

    expect(policies.size).toBe(1);
    // 4135ea2d-6df8-44a3-9df3-4b5a84be39ad is AWS's managed CachingDisabled.
    expect([...policies][0]).toBe('4135ea2d-6df8-44a3-9df3-4b5a84be39ad');
  });
});

describe('the origin secret is what keeps the URL from being a bypass', () => {
  it('attaches the header to the API origin only', () => {
    const origins = distributionConfig(build().template).Origins;
    const withHeaders = origins.filter(
      (o) => ((o.OriginCustomHeaders as unknown[]) ?? []).length > 0
    );

    expect(withHeaders).toHaveLength(1);
    expect((withHeaders[0].OriginCustomHeaders as { HeaderName: string }[])[0].HeaderName).toBe(
      'x-origin-verify'
    );
  });

  it('passes it as a dynamic reference, never as plaintext', () => {
    // The secret is generated by Secrets Manager and referenced. A literal would put
    // it in the template, the synth output and every review that reads either.
    const rendered = JSON.stringify(distributionConfig(build().template));

    expect(rendered).toMatch(/\{\{resolve:secretsmanager:/);
    expect(rendered).not.toMatch(/"[A-Za-z0-9]{64}"/);
  });

  it('refuses at synth to route to the API without a secret', async () => {
    // Deploying that would answer the internet directly and make every behaviour
    // above advisory, so it must fail before it reaches an account rather than
    // produce a distribution that quietly forwards to an open origin.
    const { EdgeDistribution } = await import('./distribution');
    const app = new App();
    const stack = new Stack(app, 'NoSecret', {
      env: { account: '123456789012', region: 'eu-central-1' },
    });
    const { Function: LambdaFunction, Code, Runtime } = await import('aws-cdk-lib/aws-lambda');
    const { Bucket } = await import('aws-cdk-lib/aws-s3');
    const fn = new LambdaFunction(stack, 'Fn', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => {};'),
    });

    expect(
      () =>
        new EdgeDistribution(stack, 'Edge', {
          hostname: 'grant.example.com',
          certificate: Certificate.fromCertificateArn(
            stack,
            'C',
            'arn:aws:acm:us-east-1:123456789012:certificate/abc-123'
          ),
          docsBucket: new Bucket(stack, 'Docs'),
          apiFunctionUrl: fn.addFunctionUrl(),
        })
    ).toThrow(/apiOriginSecret is required/);
  });
});

describe('header forwarding', () => {
  it('forwards everything except Host', () => {
    // A Function URL refuses a request whose Host is not its own, so forwarding the
    // viewer's Host breaks every call. Everything else must survive: Authorization
    // and Cookie carry auth, and CloudFront-Viewer-Address carries the client IP the
    // rate limiter keys on.
    const behaviours = distributionConfig(build().template).CacheBehaviors ?? [];
    const api = behaviours.filter((b) => b.PathPattern !== '/docs/*');
    const policies = new Set(api.map((b) => b.OriginRequestPolicyId as string));

    expect(policies.size).toBe(1);
    // b689b0a8-53d0-40ab-baf2-68738e2966ac is AllViewerExceptHostHeader.
    expect([...policies][0]).toBe('b689b0a8-53d0-40ab-baf2-68738e2966ac');
  });
});

describe('without a data tier', () => {
  it('creates no API behaviours at all', () => {
    // The docs-only deploy. A behaviour pointing at an origin that does not exist
    // would claim a route works before it does.
    const behaviours = distributionConfig(build({ database: false }).template).CacheBehaviors ?? [];

    expect(behaviours.map((b) => b.PathPattern)).toEqual(['/docs/*']);
  });
});
