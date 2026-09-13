/**
 * The bucket's half of a direct upload.
 *
 * ADR 0007 made minting a presigned URL a port capability, and slices 9–11a built the
 * API that mints one and the client that uses it. None of that reaches the bucket from
 * a browser without a CORS rule: `PUT` is not a simple method, so the browser sends an
 * `OPTIONS` preflight, and S3 answers that from the bucket's CORS configuration rather
 * than from the signature. A correctly signed URL against a bucket with no rule fails
 * before the first byte, and it fails as an opaque network error.
 *
 * This is pinned here rather than left to the deploy because it cannot be observed
 * locally at all: the local provider serves its own PUT route same-origin, and
 * LocalStack community does not verify SigV4 (divergence index entry 9).
 */
import { App, Stack } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { describe, expect, it } from 'vitest';

import { GrantPlatform } from '../grant-platform';

function build(options: { uploadsBucket?: boolean } = {}) {
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
    database: {},
    migration: { enabled: false },
    ...(options.uploadsBucket
      ? { storage: { uploadsBucket: Bucket.fromBucketName(stack, 'Existing', 'byo-uploads') } }
      : {}),
  });
  return { template: Template.fromStack(stack), platform };
}

interface CorsRule {
  AllowedOrigins?: string[];
  AllowedMethods?: string[];
}

/** Every CORS rule on every bucket in the template, across all of them. */
function corsRules(template: Template): CorsRule[] {
  return Object.values(template.findResources('AWS::S3::Bucket')).flatMap(
    (bucket) => (bucket.Properties?.CorsConfiguration?.CorsRules ?? []) as CorsRule[]
  );
}

describe('the uploads bucket accepts a browser PUT', () => {
  it('allows PUT from the app origin, so the preflight is answered', () => {
    const { template } = build();

    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: Match.arrayWith([
          Match.objectLike({
            AllowedMethods: ['PUT'],
            AllowedOrigins: ['https://grant.example.com'],
          }),
        ]),
      },
    });
  });

  it('allows the one header a minted URL asks the client to set', () => {
    // `Content-Type` is signed; `Content-Length` is the browser's and cannot be set by
    // hand, which is why the port leaves it out of `UploadUrlResult.headers`. A rule
    // narrower than this refuses the preflight; a wider one is surface with no caller.
    const { template } = build();

    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: Match.arrayWith([Match.objectLike({ AllowedHeaders: ['content-type'] })]),
      },
    });
  });

  it('allows no origin but the app, and no method but PUT', () => {
    // The bucket blocks all public access and is not a CloudFront origin. A wildcard
    // origin or a GET rule here would be the one place a browser on any site could
    // start a conversation with it.
    const rules = corsRules(build().template);

    expect(rules).toHaveLength(1);
    expect(rules[0].AllowedOrigins).toEqual(['https://grant.example.com']);
    expect(rules[0].AllowedMethods).toEqual(['PUT']);
  });

  it('caches the preflight, so one OPTIONS covers a session of uploads', () => {
    const { template } = build();

    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: Match.arrayWith([Match.objectLike({ MaxAge: 3600 })]),
      },
    });
  });

  it('adds no CORS to a bucket it did not create, because CDK cannot', () => {
    // `IBucket` has no way to add a rule, so an imported bucket needs one out of band.
    // Recorded as a test so the limitation is a stated fact rather than a surprise on
    // the first bring-your-own-bucket deploy.
    const { template, platform } = build({ uploadsBucket: true });

    expect(platform.uploads?.ownsBucket).toBe(false);
    // The docs bucket is still in the template, so this counts CORS rules rather than
    // buckets: none of them may be an upload rule CDK thinks it owns.
    expect(corsRules(template)).toEqual([]);
  });
});
