/**
 * Slice 5 assertions: the platform is connected.
 *
 * Until the web origin exists the docs bucket is the default and the root 404s. These
 * pin the wiring that changes that, and the reasons it is shaped differently from the
 * API — most of all that the web function can use IAM where the API could not.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { Repository } from 'aws-cdk-lib/aws-ecr';
import { DockerImageCode } from 'aws-cdk-lib/aws-lambda';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

function build({ web = true }: { web?: boolean } = {}) {
  const app = new App();
  const stack = new Stack(app, 'TestStack', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });
  new GrantPlatform(stack, 'Grant', {
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
    ...(web
      ? {
          web: {
            image: DockerImageCode.fromEcr(
              Repository.fromRepositoryName(stack, 'WebRepo', 'grant/web'),
              { tagOrDigest: 'test' }
            ),
          },
        }
      : {}),
  });
  return Template.fromStack(stack);
}

function config(template: Template) {
  const dist = Object.values(template.findResources('AWS::CloudFront::Distribution'))[0] as {
    Properties: { DistributionConfig: Record<string, never> };
  };
  return dist.Properties.DistributionConfig as unknown as {
    DefaultCacheBehavior: Record<string, unknown>;
    CacheBehaviors?: Record<string, unknown>[];
    Origins: Record<string, unknown>[];
  };
}

describe('the web app becomes the default origin', () => {
  it('serves the root from the web function, not the docs bucket', () => {
    // Without this the canonical hostname 404s at `/`, because docs content lives
    // under the `docs/` key prefix. This is the change that makes it a platform.
    const c = config(build());
    const origins = new Map(c.Origins.map((o) => [o.Id as string, JSON.stringify(o.DomainName)]));

    expect(origins.get(c.DefaultCacheBehavior.TargetOriginId as string)).toContain(
      'GrantWebFunctionFunctionUrl'
    );
  });

  it('keeps the docs bucket as default when no web app is configured', () => {
    // The docs-only deploy stays exactly as slice 3 left it.
    const c = config(build({ web: false }));
    const origins = new Map(c.Origins.map((o) => [o.Id as string, JSON.stringify(o.DomainName)]));

    expect(origins.get(c.DefaultCacheBehavior.TargetOriginId as string)).toContain(
      'GrantDocsBucket'
    );
    expect((c.CacheBehaviors ?? []).map((b) => b.PathPattern)).not.toContain('/_next/static/*');
  });

  it('serves build output from the same origin as the pages', () => {
    // Not from a separate bucket, and that is correctness rather than simplicity. The
    // bucket would be filled from a HOST build while the function serves HTML from a
    // CONTAINER build, and Next randomises its build ID per build — so the HTML would
    // reference `/_next/static/<container-build-id>/…` that the bucket never had, and
    // every asset would 404 while the page itself rendered fine.
    const c = config(build());
    const assets = (c.CacheBehaviors ?? []).find((b) => b.PathPattern === '/_next/static/*');

    expect(assets).toBeDefined();
    expect(assets?.TargetOriginId).toBe(c.DefaultCacheBehavior.TargetOriginId);
  });

  it('caches build output hard, unlike pages', () => {
    // The two share an origin and must not share a cache posture: pages are
    // per-session, assets are content-hashed and immutable.
    const c = config(build());
    const assets = (c.CacheBehaviors ?? []).find((b) => b.PathPattern === '/_next/static/*');

    expect(assets?.CachePolicyId).toBe('658327ea-f89d-4fab-a63d-7e88639e58f6');
    expect(assets?.CachePolicyId).not.toBe(c.DefaultCacheBehavior.CachePolicyId);
  });
});

describe('the web origin is IAM-authorized, unlike the API', () => {
  it('requires IAM on the web function URL', () => {
    // The asymmetry with the API is deliberate and worth pinning. OAC was ruled out
    // there because its signing mode overwrites the viewer Authorization header and
    // POST needs a viewer-supplied body hash. The web app authenticates by cookie and
    // serves GET only, so neither applies and AWS refuses before any code runs.
    //
    // The other half of the contrast — that the API URL is NONE and guarded in the
    // application instead — is pinned by `compute/api-serving.test.ts`.
    const template = build();
    const urls = Object.values(template.findResources('AWS::Lambda::Url'));

    expect(urls).toHaveLength(1);
    expect((urls[0].Properties as { AuthType: string }).AuthType).toBe('AWS_IAM');
  });

  it('reaches the web function through Origin Access Control', () => {
    // What makes IAM usable: without OAC on the origin, CloudFront sends unsigned
    // requests and every page load is refused by Lambda.
    const c = config(build());
    const def = c.Origins.find((o) => o.Id === c.DefaultCacheBehavior.TargetOriginId);

    expect(def?.OriginAccessControlId).toBeDefined();
  });

  it('restricts the default behaviour to methods without a body', () => {
    // Load-bearing, not tidiness: OAC requires the viewer to send
    // x-amz-content-sha256 for a request carrying a body, so refusing bodies at the
    // edge removes the constraint. Allowing writes here would break every page load.
    const c = config(build());

    expect(c.DefaultCacheBehavior.AllowedMethods).toEqual(['GET', 'HEAD', 'OPTIONS']);
  });

  it('does not cache pages, which are per-session', () => {
    // The app renders authenticated shells and reads the session cookie. A cached
    // document would be served to another tenant.
    const c = config(build());

    expect(c.DefaultCacheBehavior.CachePolicyId).toBe('4135ea2d-6df8-44a3-9df3-4b5a84be39ad');
  });
});

describe('the web function stays out of the VPC', () => {
  it('has no VpcConfig, so cold starts skip ENI attachment', () => {
    // It reaches the API over the public canonical URL exactly as a browser does, so
    // there is nothing inside the VPC for it to want.
    const template = build();
    const fns = Object.values(template.findResources('AWS::Lambda::Function'));
    const web = fns.filter((f) =>
      JSON.stringify((f.Properties as { Code?: unknown }).Code ?? '').includes('grant/web')
    );

    expect(web).toHaveLength(1);
    expect((web[0].Properties as { VpcConfig?: unknown }).VpcConfig).toBeUndefined();
  });
});
