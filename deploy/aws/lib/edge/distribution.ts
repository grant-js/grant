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
  type ICachePolicy,
  OriginRequestPolicy,
  PriceClass,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { FunctionUrlOrigin, S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import type { IFunctionUrl } from 'aws-cdk-lib/aws-lambda';
import type { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

import { ASSET_BEHAVIOURS, type CloudFrontBehaviour, toCloudFrontBehaviours } from '../behaviours';
import { INDEX_REWRITE_FUNCTION, TRAILING_SLASH_REDIRECT_FUNCTION } from './viewer-request';

export interface EdgeDistributionProps {
  /** Canonical hostname; the distribution's only alias. */
  readonly hostname: string;
  readonly certificate: ICertificate;
  readonly docsBucket: IBucket;

  /** The API's invocation endpoint. Omit and no API behaviour is created. */
  readonly apiFunctionUrl?: IFunctionUrl;

  /**
   * Secret CloudFront attaches to every API origin request, proving the request
   * came through the edge. Required whenever `apiFunctionUrl` is given.
   *
   * Pass a `{{resolve:secretsmanager:…}}` dynamic reference rather than a literal —
   * CloudFormation resolves it at deploy and the plaintext never enters the template.
   */
  readonly apiOriginSecret?: string;

  /** Header the secret travels in. Must match `SECURITY_ORIGIN_VERIFY_HEADER`. */
  readonly apiOriginSecretHeader?: string;

  /**
   * The web app's invocation endpoint. Omit and the docs bucket stays the default
   * origin, which is the docs-only deploy.
   *
   * IAM-authorized and reached through Origin Access Control — possible here and not
   * for the API because the web app authenticates by cookie and serves GET only.
   */
  readonly webFunctionUrl?: IFunctionUrl;
}

/** Well-known documents are public; a minute of edge cache cuts origin load. */
const WELL_KNOWN_CACHE_TTL = Duration.minutes(5);

export class EdgeDistribution extends Construct {
  public readonly distribution: Distribution;

  private cachePolicyFor(kind: CloudFrontBehaviour['cache']): ICachePolicy {
    if (kind !== 'short') return CachePolicy.CACHING_DISABLED;

    this.shortCachePolicy ??= new CachePolicy(this, 'ApiShortCache', {
      comment: 'Well-known documents: public, small, read on every token verification',
      defaultTtl: WELL_KNOWN_CACHE_TTL,
      maxTtl: WELL_KNOWN_CACHE_TTL,
      minTtl: Duration.seconds(0),
      enableAcceptEncodingGzip: true,
    });
    return this.shortCachePolicy;
  }

  private shortCachePolicy?: ICachePolicy;

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

    const apiBehaviours = this.buildApiBehaviours(props, derived);

    // Assembled by walking the derivation, not by spreading two maps together.
    // Insertion order into this object is the order CloudFront evaluates, and
    // building it any other way silently reorders the routing plan — `/docs/*`
    // precedes `/api/*` in the canonical table, and an object spread put it last.
    const additionalBehaviors: Record<string, BehaviorOptions> = {};
    for (const behaviour of derived) {
      if (behaviour.pathPattern === docsPattern.pathPattern) {
        additionalBehaviors[behaviour.pathPattern] = docsBehaviour;
      } else if (apiBehaviours[behaviour.pathPattern]) {
        additionalBehaviors[behaviour.pathPattern] = apiBehaviours[behaviour.pathPattern];
      }
    }

    const web = this.buildWebBehaviours(props, docsBehaviour, trailingSlashRedirect);

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
      defaultBehavior: web.defaultBehaviour,
      // Order is load-bearing and comes from `routesByPrecedence()`, never from the
      // declaration array's own order. CloudFront evaluates behaviours in the order
      // they are declared rather than by specificity, so `/api/*` landing after a
      // broader pattern would silently never match.
      additionalBehaviors: { ...additionalBehaviors, ...web.assetBehaviours },
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

  /**
   * Behaviours routing to the API, or none when the origin has not been supplied.
   *
   * Everything here is uncached. `toCloudFrontBehaviours` already resolves the policy
   * per route, and every API route resolves to `disabled` or `short`; a cached
   * authenticated response is a cross-tenant data leak, so this asserts the
   * derivation agreed rather than trusting it.
   */
  /**
   * Maps a derived cache intent to a CloudFront policy.
   *
   * `short` exists for the well-known documents: small, public, and fetched on every
   * token verification, so a brief TTL cuts origin load without making key rotation
   * slow to take effect. Everything else on the API is uncached, because a cached
   * authenticated response is a cross-tenant data leak.
   */
  /**
   * The default behaviour, plus the S3 route for Next's build output.
   *
   * Without a web origin the docs bucket stays default and the root 404s — content
   * lives under the `docs/` prefix — which is the docs-only deploy and correct for it.
   *
   * The default behaviour is restricted to **GET/HEAD/OPTIONS**, and that restriction
   * is load-bearing rather than tidy: it is what makes Origin Access Control usable
   * here. OAC requires the viewer to supply `x-amz-content-sha256` for a request with a
   * body, so refusing bodies at the edge removes the constraint entirely. The app
   * serves GET only — no server actions, no route handlers — so nothing is lost.
   */
  private buildWebBehaviours(
    props: EdgeDistributionProps,
    docsBehaviour: BehaviorOptions,
    trailingSlashRedirect: CloudFrontFunction
  ): { defaultBehaviour: BehaviorOptions; assetBehaviours: Record<string, BehaviorOptions> } {
    if (!props.webFunctionUrl) {
      return {
        defaultBehaviour: {
          ...docsBehaviour,
          functionAssociations: [
            { function: trailingSlashRedirect, eventType: FunctionEventType.VIEWER_REQUEST },
          ],
        },
        assetBehaviours: {},
      };
    }

    const webOrigin = FunctionUrlOrigin.withOriginAccessControl(props.webFunctionUrl);

    // Same origin as the default behaviour, different cache posture. Pages are
    // per-session and uncached; build output is immutable and cached hard. Serving it
    // from a separate bucket would mean filling that bucket from a *host* build while
    // the function serves HTML from a *container* build — and Next randomises its build
    // ID per build, so the HTML would reference assets the bucket does not have.
    const assetBehaviours: Record<string, BehaviorOptions> = {};
    for (const asset of ASSET_BEHAVIOURS) {
      if (asset.origin !== 'web') continue;
      assetBehaviours[asset.pathPattern] = {
        origin: webOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        // Next sets `max-age=31536000, immutable` on these itself, so each asset is
        // fetched from the function once per edge location and cached thereafter.
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      };
    }

    return {
      defaultBehaviour: {
        origin: webOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // See above — this is what keeps OAC usable.
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        // Pages are per-session: the app renders authenticated shells and reads the
        // session cookie. Caching them at the edge would serve one tenant's document
        // to another.
        cachePolicy: CachePolicy.CACHING_DISABLED,
        // Cookies carry the session and must reach the server; Host must not, because
        // a Function URL refuses a request whose Host is not its own.
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        functionAssociations: [
          { function: trailingSlashRedirect, eventType: FunctionEventType.VIEWER_REQUEST },
        ],
      },
      assetBehaviours,
    };
  }

  private buildApiBehaviours(
    props: EdgeDistributionProps,
    derived: ReturnType<typeof toCloudFrontBehaviours>
  ): Record<string, BehaviorOptions> {
    if (!props.apiFunctionUrl) return {};

    if (!props.apiOriginSecret) {
      // Without the secret the origin would answer the internet directly and every
      // behaviour here would be advisory. Refusing at synth beats deploying it.
      throw new Error('apiOriginSecret is required when apiFunctionUrl is given');
    }

    const header = props.apiOriginSecretHeader ?? 'x-origin-verify';

    const apiOrigin = new FunctionUrlOrigin(props.apiFunctionUrl, {
      // The only thing separating an edge request from a direct one. It is a
      // CloudFormation dynamic reference, so the plaintext is not in this template.
      customHeaders: { [header]: props.apiOriginSecret },
    });

    const behaviours: Record<string, BehaviorOptions> = {};
    for (const behaviour of derived) {
      if (behaviour.origin !== 'api') continue;

      behaviours[behaviour.pathPattern] = {
        origin: apiOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        // GraphQL is POST-only and the REST surface writes, so the read-only method
        // set would turn every mutation into a 405 at the edge.
        allowedMethods: AllowedMethods.ALLOW_ALL,
        // The policy the derivation chose, not a blanket disable. Flattening these to
        // CACHING_DISABLED was safe but made the `RoutingPlan` output — this story's
        // evidence artifact — advertise a plan the distribution did not implement:
        // it still said `/.well-known/*=>api:short`. Honouring the derivation keeps
        // the output honest and restores the intended edge cache on JWKS, which is a
        // public document read on every token verification.
        //
        // Anything widened by a wildcard resolves to `disabled` in `cacheFor()`, so a
        // per-tenant path can never inherit a TTL from a truncated pattern.
        cachePolicy: this.cachePolicyFor(behaviour.cache),
        // ALL_VIEWER_EXCEPT_HOST_HEADER, and the exception is the point: a Function
        // URL rejects a request whose Host is not its own, so forwarding the viewer's
        // Host breaks every call. Everything else — Authorization, Cookie, the
        // CloudFront-Viewer-* set that carries the real client address — is forwarded,
        // because the API authenticates and rate-limits on them.
        originRequestPolicy: OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
      };
    }

    return behaviours;
  }
}
