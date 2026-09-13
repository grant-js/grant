/**
 * The uploads bucket.
 *
 * `STORAGE_PROVIDER=s3` on this target (`config/defaults.ts`) because a Lambda's
 * filesystem is ephemeral and per-container: a file written by one execution
 * environment is invisible to the next and gone when that one is reclaimed. The local
 * provider is not merely suboptimal on Lambda, it is incorrect.
 *
 * The bucket is **not** a CloudFront origin. Uploads are per-tenant and access is
 * authorized by the API, so objects are served through it rather than from the edge —
 * which is why nothing here grants Origin Access Control, and why public access stays
 * fully blocked. `apps/api` reaches the bucket with the task role's credentials,
 * unsigned by any static key.
 */

import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  HttpMethods,
  type IBucket,
} from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

/**
 * How long a browser may cache the upload preflight.
 *
 * Every direct upload costs an `OPTIONS` round trip before the `PUT` unless the answer
 * is still cached, and the answer does not change between uploads. An hour is long
 * enough that a user cropping several pictures pays for one preflight, and short enough
 * that a change to the allowed origin takes effect within a session.
 */
const UPLOAD_PREFLIGHT_MAX_AGE = Duration.hours(1);

export interface StorageBucketProps {
  /**
   * Existing bucket to use. Omit to create one.
   *
   * CDK does not own an imported bucket's resource policy, but nothing here needs
   * one — the grant is on the function's role, which CDK does own. So unlike the
   * docs bucket, an imported uploads bucket needs no out-of-band policy.
   *
   * It does need an out-of-band **CORS** rule. `IBucket` exposes no way to add one, so
   * an operator bringing their own bucket has to allow `PUT` from `appUrl` themselves
   * or direct uploads will fail the browser preflight. See `uploadOrigin`.
   */
  readonly bucket?: IBucket;

  /**
   * Whether teardown may destroy uploaded objects. Defaults to **false**.
   *
   * These are user files. `autoDeleteObjects` is enabled only alongside this, because
   * a non-empty bucket blocks stack deletion and CDK's remedy is a custom resource
   * that empties it — which must never be created for a bucket holding real uploads.
   */
  readonly destroyOnRemoval?: boolean;

  /**
   * Origin permitted to upload directly to this bucket, normally `appUrl`.
   *
   * A presigned `PUT` from a browser is cross-origin and `PUT` is never a simple
   * method, so the browser sends an `OPTIONS` preflight first and S3 answers it from
   * the bucket's CORS configuration — not from the signature. Without a rule here the
   * preflight fails and **no direct upload works on this target at all**, which no
   * amount of correct signing changes. ADR 0007's minting is the API's half; this is
   * the bucket's.
   *
   * Omit only where the browser never talks to the bucket.
   */
  readonly uploadOrigin?: string;
}

export class StorageBucket extends Construct {
  public readonly bucket: IBucket;

  /** True when this construct created the bucket, so teardown removes it. */
  public readonly ownsBucket: boolean;

  constructor(scope: Construct, id: string, props: StorageBucketProps = {}) {
    super(scope, id);

    this.ownsBucket = props.bucket === undefined;
    const destroy = props.destroyOnRemoval ?? false;

    this.bucket =
      props.bucket ??
      new Bucket(this, 'Bucket', {
        // S3-managed keys. A customer-managed KMS key adds a per-request charge and a
        // second thing to grant; there is no compliance requirement here asking for
        // one, and slice 3b already declined the same trade for the docs bucket.
        encryption: BucketEncryption.S3_MANAGED,
        enforceSSL: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        // Uploads are addressed by a key the API generates, so there is no case where
        // a caller needs to enumerate the bucket to find an object.
        publicReadAccess: false,
        removalPolicy: destroy ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
        autoDeleteObjects: destroy,
        // One method and one header, because that is the whole of what a minted URL
        // permits: the API signs a `PUT` whose only client-set header is `Content-Type`
        // (`Content-Length` is the browser's to set and cannot be set by hand). Reads
        // are not here — objects are served through the API, and an `<img>` load is not
        // a CORS request. `GET` in this list would widen the bucket's browser surface
        // for a case that does not exist.
        cors: props.uploadOrigin
          ? [
              {
                allowedMethods: [HttpMethods.PUT],
                allowedOrigins: [props.uploadOrigin],
                allowedHeaders: ['content-type'],
                maxAge: UPLOAD_PREFLIGHT_MAX_AGE.toSeconds(),
              },
            ]
          : undefined,
      });
  }
}
