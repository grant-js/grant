import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { GrantException } from '@grantjs/core';

import type { IFileStorageService, ILogger, UploadOptions, UploadResult } from '@grantjs/core';

export interface S3Config {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string;
  publicUrl?: string;
}

/**
 * AWS S3 storage adapter for cloud deployments
 * Stores files in AWS S3 bucket with optional CloudFront CDN
 */
export class S3StorageAdapter implements IFileStorageService {
  private readonly s3Client: S3Client;

  constructor(
    private readonly config: S3Config,
    private readonly logger: ILogger
  ) {
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      ...(config.endpoint && { endpoint: config.endpoint }),
    });
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
