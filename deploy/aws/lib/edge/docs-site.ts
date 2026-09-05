/**
 * The documentation site: a private S3 bucket fronted by CloudFront.
 *
 * The key-layout decision is the load-bearing part. VitePress builds with
 * `base: '/docs/'` (`docs/.vitepress/config.ts:16`), so every asset in the built
 * HTML is referenced as `/docs/assets/…`. The nginx gateway strips that prefix
 * before proxying (`deploy/gateway.conf.template:144`) and serves from the origin's
 * root.
 *
 * Rather than reproduce that strip at the edge, the content is uploaded **under a
 * `docs/` key prefix**, so the URL path and the S3 key line up and no rewrite is
 * needed anywhere. The alternative — an origin path plus a rewrite — reintroduces
 * exactly the prefix-stripping the Kubernetes target needs a Traefik middleware for.
 */

import { existsSync } from 'node:fs';

import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, type IBucket } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, CacheControl, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

import { ConfigurationError } from '../config/errors';

export interface DocsSiteProps {
  /**
   * Built VitePress output — `docs/.vitepress/dist`.
   *
   * Required, so a deploy cannot silently produce an empty site. Run
   * `pnpm --filter grant-docs build` first; CI builds it before synth.
   */
  readonly distPath: string;

  /**
   * Existing bucket to publish into. Omit to create one.
   *
   * An imported bucket's resource policy is not owned by CDK, so the stack cannot
   * grant it Origin Access Control — the distribution emits the required policy as
   * an output instead of appearing to have applied it.
   */
  readonly bucket?: IBucket;
}

/** The S3 key prefix the content is published under; matches VitePress's `base`. */
const DOCS_KEY_PREFIX = 'docs';

export class DocsSite extends Construct {
  public readonly bucket: IBucket;

  /** True when this construct owns the bucket and can therefore grant it OAC. */
  public readonly ownsBucket: boolean;

  constructor(scope: Construct, id: string, props: DocsSiteProps) {
    super(scope, id);

    if (!existsSync(props.distPath)) {
      // CDK's own error here is «CannotFindAsset» with a bare path, which does not
      // tell an adopter what to do. Requiring the build rather than silently
      // publishing an empty site is deliberate.
      throw new ConfigurationError(
        `Built documentation not found at ${props.distPath}\n` +
          'Run `pnpm --filter grant-docs build` before synthesizing or deploying.'
      );
    }

    this.ownsBucket = props.bucket === undefined;
    this.bucket =
      props.bucket ??
      new Bucket(this, 'Bucket', {
        // Private. CloudFront reaches it through Origin Access Control, so the
        // bucket never needs public access — and S3 website hosting, which would
        // require public access, is what forces the index-rewrite Function instead.
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        // Documentation is a build artifact, reproducible from the repo. Destroying
        // it with the stack is correct and keeps `cdk destroy` from stranding
        // resources — which the stack plan makes a per-slice check.
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
      });

    new BucketDeployment(this, 'Content', {
      sources: [Source.asset(props.distPath)],
      destinationBucket: this.bucket,
      // The prefix that makes `base: '/docs/'` work with no rewrite at the edge.
      destinationKeyPrefix: DOCS_KEY_PREFIX,
      // Leave anything outside this prefix alone: later slices publish the web app's
      // static assets, and a pruning deployment would delete them on every docs push.
      prune: false,
      // Measured in slice 3b: without this, objects land with no Cache-Control at
      // all, so a browser revalidates every asset on every page load even though
      // VitePress content-hashes their filenames. CloudFront still cached at the
      // edge; only the browser leg was uncached.
      //
      // One hour rather than a year: the same policy applies to `.html` pages, whose
      // names are *not* content-hashed, so a long TTL would pin a stale page in every
      // visitor's browser until it expired. An hour bounds that while removing the
      // revalidation round-trip. Splitting hashed assets from HTML would need two
      // deployments; not worth it until measurements say otherwise.
      cacheControl: [CacheControl.setPublic(), CacheControl.maxAge(Duration.hours(1))],
    });
  }
}
