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

import { RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketEncryption, type IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageBucketProps {
  /**
   * Existing bucket to use. Omit to create one.
   *
   * CDK does not own an imported bucket's resource policy, but nothing here needs
   * one — the grant is on the function's role, which CDK does own. So unlike the
   * docs bucket, an imported uploads bucket needs no out-of-band policy.
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
      });
  }
}
