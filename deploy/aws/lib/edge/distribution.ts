/**
 * The CloudFront distribution — the single canonical URL.
 *
 * Behaviours come from `toCloudFrontBehaviours()`, which derives them from the same
 * declaration the gateway and the dev rewrites are checked against. Nothing in this
 * file re-states a path pattern; if it did, the third witness would be a fourth copy.
 *
 * Slice 3 wires only the origins that exist so far — the docs bucket. Behaviours
 * whose origin arrives later are deliberately not created, so the synthesized
 * template never claims a route works before it does.
 */

import { Duration } from 'aws-cdk-lib';
import type { ICertificate } from 'aws-cdk-lib/aws-certificatemanager';
import {
  AllowedMethods,
  type BehaviorOptions,
  CachePolicy,
  Distribution,
  Function as CloudFrontFunction,
  FunctionCode,
  FunctionEventType,
  HttpVersion,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { toCloudFrontBehaviours } from '../behaviours';
import { INDEX_REWRITE_FUNCTION, TRAILING_SLASH_REDIRECT_FUNCTION } from './viewer-request';

export interface EdgeDistributionProps {
  /** Canonical hostname; the distribution's only alias. */
  readonly hostname: string;
  readonly certificate: ICertificate;
  readonly docsBucket: IBucket;
}

export class EdgeDistribution extends Construct {
  public readonly distribution: Distribution;

  constructor(scope: Construct, id: string, props: EdgeDistributionProps) {
    super(scope, id);

    const indexRewrite = new CloudFrontFunction(this, 'IndexRewrite', {
      code: FunctionCode.fromInline(INDEX_REWRITE_FUNCTION),
      comment: 'Resolves directory indexes; S3 REST origins behind OAC do not.',
    });

    const trailingSlashRedirect = new CloudFrontFunction(this, 'TrailingSlashRedirect', {
      code: FunctionCode.fromInline(TRAILING_SLASH_REDIRECT_FUNCTION),
      comment: 'Serves the /docs and /api redirects nginx does today.',
    });

    // S3BucketOrigin.withOriginAccessControl sets the bucket policy for us, which is
    // only possible because the bucket is CDK-owned. An imported bucket would need
    // the policy applied out of band — the stack cannot silently do it.
    const docsOrigin = S3BucketOrigin.withOriginAccessControl(props.docsBucket);

    const docsBehaviour: BehaviorOptions = {
      origin: docsOrigin,
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      functionAssociations: [
        { function: indexRewrite, eventType: FunctionEventType.VIEWER_REQUEST },
      ],
    };

    const derived = toCloudFrontBehaviours();
    const docsPattern = derived.find((behaviour) => behaviour.origin === 'docs-bucket');
    if (!docsPattern) {
      // The derivation lost the docs route. Failing loudly beats silently shipping a
      // distribution that cannot serve documentation.
      throw new Error('No docs behaviour was derived from the canonical routing table');
    }

    this.distribution = new Distribution(this, 'Distribution', {
      domainNames: [props.hostname],
      certificate: props.certificate,
      httpVersion: HttpVersion.HTTP2_AND_3,
      // Cheapest tier that still covers NA/EU. An adopter overrides this by
      // composing the construct themselves; it is not worth a prop until asked for.
      priceClass: PriceClass.PRICE_CLASS_100,
      // Until the web origin lands, the docs bucket is the default origin. The root
      // path therefore 404s — content lives under the `docs/` key prefix — which is
      // correct for this slice and replaced when the web app arrives.
      defaultBehavior: {
        ...docsBehaviour,
        functionAssociations: [
          { function: trailingSlashRedirect, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      additionalBehaviors: {
        [docsPattern.pathPattern]: docsBehaviour,
      },
      errorResponses: [
        {
          // S3 returns 403 for a missing key when the caller cannot list the bucket,
          // which is every request behind OAC. Surfacing it as 404 keeps a mistyped
          // docs URL from looking like a permissions failure.
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/docs/404.html',
          ttl: Duration.minutes(5),
        },
      ],
    });
  }
}
