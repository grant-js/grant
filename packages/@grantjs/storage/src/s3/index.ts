import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  IFileStorageService,
  ILogger,
  StoredObjectMetadata,
  UploadOptions,
  UploadResult,
  UploadUrlOptions,
  UploadUrlResult,
} from '@grantjs/core';
import { GrantException } from '@grantjs/core';

import { assertUploadTarget } from '../upload-url';

export interface S3Config {
  bucket: string;
  region: string;
  /**
   * Omit both to use the SDK's default credential chain. That is the expected
   * production path: a Lambda or task role supplies credentials, and no secret
   * reaches this adapter. Matches `DynamoDBCacheAdapter`.
   */
  accessKeyId?: string;
  secretAccessKey?: string;
  endpoint?: string;
  publicUrl?: string;
  /**
   * Address the bucket as a path segment (`<endpoint>/<bucket>/<key>`) instead of
   * a subdomain. Required by S3-compatible endpoints that do not serve
   * virtual-hosted buckets — LocalStack and MinIO among them. Left unset against
   * real S3, which prefers virtual-hosted style.
   */
  forcePathStyle?: boolean;
}

/**
 * AWS S3 storage adapter for cloud deployments
 * Stores files in AWS S3 bucket with optional CloudFront CDN
 */
export class S3StorageAdapter implements IFileStorageService {
  private readonly s3Client: S3Client;

  /**
   * A second client, for presigning only.
   *
   * The default client hoists `x-amz-checksum-crc32` — computed over an *empty*
   * body, because presigning never sees the bytes — into the signed query string,
   * and a real PUT carrying actual bytes is then refused with
   * `400 InvalidRequest: Value for x-amz-checksum-crc32 header is invalid`. The
   * parameters sit inside the signed canonical query string, so they cannot be
   * stripped after the fact; `requestChecksumCalculation` is only settable at
   * construction.
   *
   * Setting it on the shared client instead would silently drop checksums from
   * `upload()`, an existing working path. Extend, do not replace. See ADR 0007.
   */
  private readonly presignClient: S3Client;

  constructor(
    private readonly config: S3Config,
    private readonly logger: ILogger
  ) {
    const clientConfig = {
      region: config.region,
      ...(config.accessKeyId &&
        config.secretAccessKey && {
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        }),
      ...(config.endpoint && { endpoint: config.endpoint }),
      ...(config.forcePathStyle && { forcePathStyle: true }),
    };

    this.s3Client = new S3Client(clientConfig);
    this.presignClient = new S3Client({
      ...clientConfig,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  async getUploadUrl(filePath: string, options: UploadUrlOptions): Promise<UploadUrlResult> {
    assertUploadTarget(filePath, options);

    const expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000);

    try {
      const url = await getSignedUrl(
        this.presignClient,
        new PutObjectCommand({
          Bucket: this.config.bucket,
          Key: filePath,
          ContentType: options.contentType,
          ContentLength: options.contentLength,
        }),
        {
          expiresIn: options.expiresInSeconds,
          // Without this, `content-type` is accepted and *not signed*: the URL would
          // appear to pin the type while accepting any. `content-length` is signed by
          // default. Verified by test in ./index.test.ts. See ADR 0007.
          signableHeaders: new Set(['content-type']),
        }
      );

      this.logger.debug({
        msg: 'Presigned S3 upload URL issued',
        path: filePath,
        bucket: this.config.bucket,
        contentLength: options.contentLength,
        expiresAt: expiresAt.toISOString(),
      });

      return {
        url,
        method: 'PUT',
        headers: { 'Content-Type': options.contentType },
        expiresAt,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to presign S3 upload URL',
        err: error,
        path: filePath,
        bucket: this.config.bucket,
      });
      throw new GrantException(
        `Failed to presign upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getMetadata(filePath: string): Promise<StoredObjectMetadata | null> {
    try {
      const head = await this.s3Client.send(
        new HeadObjectCommand({ Bucket: this.config.bucket, Key: filePath })
      );

      return {
        size: head.ContentLength ?? 0,
        ...(head.ContentType && { contentType: head.ContentType }),
        ...(head.LastModified && { lastModified: head.LastModified }),
      };
    } catch (error) {
      if (
        (error as { name?: string }).name === 'NotFound' ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
      ) {
        return null;
      }
      this.logger.error({
        msg: 'Failed to read S3 object metadata',
        err: error,
        path: filePath,
        bucket: this.config.bucket,
      });
      throw new GrantException(
        `Failed to read file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async upload(file: Buffer, filePath: string, options?: UploadOptions): Promise<UploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: filePath,
        Body: file,
        ContentType: options?.contentType,
        Metadata: options?.metadata,
        ...(options?.public && { ACL: 'public-read' }),
      });

      await this.s3Client.send(command);

      const url =
        options?.public && this.config.publicUrl
          ? `${this.config.publicUrl}/${filePath}`
          : await this.getUrl(filePath);

      this.logger.debug({
        msg: 'File uploaded to S3',
        path: filePath,
        size: file.length,
        bucket: this.config.bucket,
      });

      return {
        path: filePath,
        url,
        size: file.length,
        contentType: options?.contentType,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to upload file to S3',
        err: error,
        path: filePath,
        bucket: this.config.bucket,
      });
      throw new GrantException(
        `Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(filePath: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: filePath,
      });

      await this.s3Client.send(command);

      this.logger.debug({
        msg: 'File deleted from S3',
        path: filePath,
        bucket: this.config.bucket,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Failed to delete file from S3',
        err: error,
        path: filePath,
        bucket: this.config.bucket,
      });
      throw new GrantException(
        `Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUrl(filePath: string): Promise<string> {
    if (this.config.publicUrl) {
      return `${this.config.publicUrl}/${filePath}`;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.config.bucket,
        Key: filePath,
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      return signedUrl;
    } catch (error) {
      this.logger.error({
        msg: 'Failed to generate S3 signed URL',
        err: error,
        path: filePath,
      });
      throw new GrantException(
        `Failed to generate file URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.config.bucket,
        Key: filePath,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (
        (error as { name?: string }).name === 'NotFound' ||
        (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404
      ) {
        return false;
      }
      this.logger.error({
        msg: 'Failed to check file existence in S3',
        err: error,
        path: filePath,
      });
      throw new GrantException(
        `Failed to check file existence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.config.bucket,
        CopySource: `${this.config.bucket}/${sourcePath}`,
        Key: destinationPath,
      });

      await this.s3Client.send(command);

      this.logger.debug({
        msg: 'File copied in S3',
        source: sourcePath,
        destination: destinationPath,
        bucket: this.config.bucket,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Failed to copy file in S3',
        err: error,
        source: sourcePath,
        destination: destinationPath,
      });
      throw new GrantException(
        `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }
}
