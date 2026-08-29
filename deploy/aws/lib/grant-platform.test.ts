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
import { Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { describe, expect, it } from 'vitest';

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
  it('creates no AWS resources yet', () => {
    // Slice 2 is the configuration surface. AWS::CDK::Metadata is emitted by the
    // framework rather than by this construct, and only in some configurations, so
    // it is filtered rather than asserted. Anything else appearing means a later
    // slice has landed early.
    const { template } = synth('https://grant.example.com');
    const resources = Object.values(template.toJSON().Resources ?? {}) as { Type: string }[];
    const created = resources.map((r) => r.Type).filter((type) => type !== 'AWS::CDK::Metadata');
    expect(created).toEqual([]);
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
