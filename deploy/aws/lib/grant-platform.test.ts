/**
 * Synth-level assertions.
 *
 * `behaviours.test.ts` checks the derivation in isolation; this checks that a real
 * `App` carrying the construct produces the intended template — the artifact CI
 * commits and a reviewer reads.
 *
 * Slice 2 creates no AWS resources, so these are mostly about the configuration
 * surface failing usefully. From slice 3 on, this file grows resource assertions.
 */
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

import { toCloudFrontBehaviours } from './behaviours';
import { ConfigurationError } from './config/errors';
import { GrantPlatform } from './grant-platform';

function synth(appUrl: string, zoneName = 'example.com') {
  const app = new App();
  const stack = new Stack(app, 'TestStack');
  const platform = new GrantPlatform(stack, 'Grant', {
    appUrl,
    dns: {
      hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
        hostedZoneId: 'ZTEST000000000',
        zoneName,
      }),
    },
  });
  return { template: Template.fromStack(stack), platform };
}

describe('GrantPlatform', () => {
  it('creates no API, database or network resources yet', () => {
    // Slice 3 is the docs site and the edge. Anything from a later slice appearing
    // here has landed early — the assertion slice 2 made about *all* resources,
    // narrowed as each slice legitimately adds its own.
    const { template } = synth('https://grant.example.com');
    const resources = Object.values(template.toJSON().Resources ?? {}) as { Type: string }[];
    const premature = resources
      .map((r) => r.Type)
      .filter((type) =>
        ['AWS::RDS::', 'AWS::EC2::VPC', 'AWS::Events::Rule', 'AWS::ElastiCache::'].some((p) =>
          type.startsWith(p)
        )
      );
    expect(premature).toEqual([]);
  });

  it('publishes the canonical hostname', () => {
    const { template, platform } = synth('https://grant.example.com');
    expect(platform.hostname).toBe('grant.example.com');
    template.hasOutput('*', { Value: 'grant.example.com' });
  });

  it('publishes the routing plan in evaluation order', () => {
    // The plan in the template is the reviewable evidence that derivation produced
    // the intended routing, before a distribution exists to get it wrong.
    const { platform } = synth('https://grant.example.com');
    expect(platform.behaviours.map((b) => b.pathPattern)).toEqual([
      '/org/*',
      '/acc/*',
      '/.well-known/*',
      '/api-docs*',
      '/graphql*',
      '/health*',
      '/docs/*',
      '/api/*',
      '/_next/static/*',
    ]);
  });

  it('caches nothing that reaches the API except the platform well-known documents', () => {
    const { platform } = synth('https://grant.example.com');
    const cachedApi = platform.behaviours.filter(
      (b) => b.origin === 'api' && b.cache !== 'disabled'
    );
    expect(cachedApi.map((b) => b.pathPattern)).toEqual(['/.well-known/*']);
  });

  describe('environment', () => {
    it('applies the AWS-target defaults', () => {
      const { platform } = synth('https://grant.example.com');
      expect(platform.env).toMatchObject({
        DB_BOOTSTRAP_ON_BOOT: 'false',
        STORAGE_PROVIDER: 's3',
        TELEMETRY_PROVIDER: 'emf',
        SECRETS_PROVIDER: 'aws-secrets-manager',
        TRACING_SPAN_PROCESSOR: 'simple',
      });
    });

    it('lets the caller override any default', () => {
      // An adopter with an existing ElastiCache cluster must win over this package's
      // opinion, or the defaults become a ceiling rather than a starting point.
      const app = new App();
      const stack = new Stack(app, 'TestStack');
      const platform = new GrantPlatform(stack, 'Grant', {
        appUrl: 'https://grant.example.com',
        dns: {
          hostedZone: HostedZone.fromHostedZoneAttributes(stack, 'Zone', {
            hostedZoneId: 'ZTEST000000000',
            zoneName: 'example.com',
          }),
        },
        env: { CACHE_STRATEGY: 'redis', REDIS_HOST: 'cache.internal' },
      });

      expect(platform.env.CACHE_STRATEGY).toBe('redis');
      expect(platform.env.REDIS_HOST).toBe('cache.internal');
      // Untouched defaults survive the override.
      expect(platform.env.STORAGE_PROVIDER).toBe('s3');
    });
  });

  describe('validation runs at synth', () => {
    it('rejects a non-https appUrl', () => {
      expect(() => synth('http://grant.example.com')).toThrow(ConfigurationError);
    });

    it('rejects an appUrl with a path', () => {
      expect(() => synth('https://grant.example.com/app')).toThrow(/no path/);
    });

    it('rejects a hostname outside the hosted zone', () => {
      // Synthesizes fine without this check, then deploys a record nothing resolves.
      expect(() => synth('https://grant.example.com', 'other.com')).toThrow(
        /not inside hosted zone/
      );
    });
  });
});

describe('docs site', () => {
  const { template } = synth('https://grant.example.com');

  it('publishes content under the docs/ key prefix', () => {
    // VitePress builds with base: '/docs/', so matching the S3 key layout to the URL
    // means no rewrite is needed at the edge — the alternative reintroduces the
    // prefix-stripping the K8s target needs a Traefik middleware for.
    template.hasResourceProperties('Custom::CDKBucketDeployment', {
      DestinationBucketKeyPrefix: 'docs',
    });
  });

  it('does not prune keys outside its prefix', () => {
    // Later slices publish the web app's static assets into the same bucket space; a
    // pruning deployment would delete them on every docs push.
    template.hasResourceProperties('Custom::CDKBucketDeployment', { Prune: false });
  });

  it('keeps the bucket private and encrypted', () => {
    // CloudFront reaches it through OAC, so it never needs public access. S3 website
    // hosting would require public access — and is what forces the index-rewrite
    // Function instead.
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

describe('edge distribution', () => {
  const { template } = synth('https://grant.example.com');

  it('aliases the canonical hostname', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: { Aliases: ['grant.example.com'] },
    });
  });

  it('reaches S3 through Origin Access Control', () => {
    // The bucket is CDK-owned, so the stack can set its policy. An imported bucket
    // could not be granted this and gets a CfnOutput instead.
    template.resourceCountIs('AWS::CloudFront::OriginAccessControl', 1);
  });

  it('attaches both viewer-request functions', () => {
    // Index resolution for the S3 origin, and the two trailing-slash redirects nginx
    // serves today. Neither is observable before a distribution exists.
    template.resourceCountIs('AWS::CloudFront::Function', 2);
  });

  it('serves docs on the pattern derived from the routing table', () => {
    // Not a literal: if the canonical table changes, this follows it or fails.
    const docsPattern = toCloudFrontBehaviours().find(
      (b) => b.origin === 'docs-bucket'
    )?.pathPattern;
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        CacheBehaviors: Match.arrayWith([Match.objectLike({ PathPattern: docsPattern })]),
      },
    });
  });

  it('redirects viewers to https', () => {
    template.hasResourceProperties('AWS::CloudFront::Distribution', {
      DistributionConfig: {
        DefaultCacheBehavior: { ViewerProtocolPolicy: 'redirect-to-https' },
      },
    });
  });
});

describe('dns', () => {
  const { template } = synth('https://grant.example.com');

  it('creates both an A and an AAAA alias', () => {
    // CloudFront answers on IPv6 by default; without the AAAA record an IPv6-only
    // client cannot resolve the canonical name at all.
    template.resourceCountIs('AWS::Route53::RecordSet', 2);
    template.hasResourceProperties('AWS::Route53::RecordSet', { Type: 'A' });
    template.hasResourceProperties('AWS::Route53::RecordSet', { Type: 'AAAA' });
  });

  it('requests a DNS-validated certificate when none is supplied', () => {
    template.hasResourceProperties('AWS::CertificateManager::Certificate', {
      DomainName: 'grant.example.com',
      ValidationMethod: 'DNS',
    });
  });
});
