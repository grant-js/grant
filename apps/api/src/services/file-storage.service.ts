import type {
  IFileStorageService,
  IFileStorageServicePort,
  StoredObjectMetadata,
  UploadUrlOptions,
  UploadUrlResult,
} from '@grantjs/core';

import { config } from '@/config';
import { BadRequestError } from '@/lib/errors';
import { loggerFactory } from '@/lib/logger';
import { StorageFactory, UploadOptions, UploadResult } from '@/lib/storage';

export class FileStorageService implements IFileStorageServicePort {
  private storageAdapter: IFileStorageService;

  constructor() {
    this.storageAdapter = StorageFactory.createStorageService(
      {
        provider: config.storage.provider,
        local:
          config.storage.provider === 'local'
            ? {
                basePath: config.storage.local.basePath,
              }
            : undefined,
        s3:
          config.storage.provider === 's3'
            ? {
                bucket: config.storage.s3.bucket,
                region: config.storage.s3.region,
                accessKeyId: config.storage.s3.accessKeyId,
                secretAccessKey: config.storage.s3.secretAccessKey,
                endpoint: config.storage.s3.endpoint,
                publicUrl: config.storage.s3.publicUrl,
              }
            : undefined,
      },
      loggerFactory
    );
  }

  public getAdapter(): IFileStorageService {
    return this.storageAdapter;
  }

  public async upload(file: Buffer, path: string, options?: UploadOptions): Promise<UploadResult> {
    return this.storageAdapter.upload(file, path, options);
  }

  public async delete(path: string): Promise<void> {
    return this.storageAdapter.delete(path);
  }

  public async getUrl(path: string): Promise<string> {
    return this.storageAdapter.getUrl(path);
  }

  public async getUploadUrl(path: string, options: UploadUrlOptions): Promise<UploadUrlResult> {
    return this.storageAdapter.getUploadUrl(path, options);
  }

  public async getMetadata(path: string): Promise<StoredObjectMetadata | null> {
    return this.storageAdapter.getMetadata(path);
  }

  public async exists(path: string): Promise<boolean> {
    return this.storageAdapter.exists(path);
  }

  public async copy(sourcePath: string, destinationPath: string): Promise<void> {
    return this.storageAdapter.copy(sourcePath, destinationPath);
  }

  public validateFileType(contentType: string): void {
    if (
      !config.storage.upload.allowedTypes.includes(
        contentType as (typeof config.storage.upload.allowedTypes)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file type. Allowed types: ${config.storage.upload.allowedTypes.join(', ')}`
      );
    }
  }

  public validateFileExtension(filename: string): void {
    const fileExtension = filename.split('.').pop()?.toLowerCase();
    if (
      !fileExtension ||
      !config.storage.upload.allowedExtensions.includes(
        fileExtension as (typeof config.storage.upload.allowedExtensions)[number]
      )
    ) {
      throw new BadRequestError(
        `Invalid file extension. Allowed extensions: ${config.storage.upload.allowedExtensions.join(', ')}`
      );
    }
  }

  public decodeBase64File(file: string): Buffer {
    try {
      const base64Data = file.replace(/^data:.*,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch {
      throw new BadRequestError('Invalid base64 file data');
    }
  }

  public validateFileSize(fileBuffer: Buffer): void {
    if (fileBuffer.length > config.storage.upload.maxFileSize) {
      throw new BadRequestError(
        `File size exceeds maximum of ${config.storage.upload.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  public sanitizeExtensionAndGeneratePath(
    filename: string,
    basePath: string,
    defaultExt: string = 'jpg'
  ): string {
    const ext = filename.split('.').pop()?.toLowerCase() || defaultExt;
    const sanitizedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : defaultExt;
    return `${basePath}.${sanitizedExt}`;
  }

  /**
   * The pre-mint half of `validateAndDecodeUpload`.
   *
   * With a direct upload the bytes never reach this process, so the checks that
   * run *after* decoding today have to run *before* a URL exists, against what
   * the client says it is about to send. Deliberately delegates to the same three
   * validators the base64 path uses — the two paths must not be able to drift on
   * what they accept, and a second copy of the rules is how they would.
   *
   * Size is the one that changes shape rather than moving: `validateFileSize`
   * measures a decoded buffer, this measures a claim. The claim is then made
   * binding by the URL, which commits to that exact length, and checked again
   * against the store at the confirm step. See ADR 0007.
   */
  public validateUploadRequest(params: {
    contentType: string;
    filename: string;
    contentLength: number;
  }): void {
    const { contentType, filename, contentLength } = params;

    this.validateFileType(contentType);
    this.validateFileExtension(filename);

    if (!Number.isInteger(contentLength) || contentLength <= 0) {
      throw new BadRequestError('File size must be a positive whole number of bytes');
    }

    if (contentLength > config.storage.upload.maxFileSize) {
      throw new BadRequestError(
        `File size exceeds maximum of ${config.storage.upload.maxFileSize / 1024 / 1024}MB`
      );
    }
  }

  /**
   * Read back what the store actually holds, and refuse anything the upload
   * policy would not have accepted.
   *
   * The confirm step's whole job. What a client claimed when it asked for the URL
   * is not evidence that it sent that; only the store is. Absent means either the
   * PUT never happened or it was refused, and both are the caller's problem to
   * retry rather than something to record against a user.
   */
  public async assertStoredWithinPolicy(path: string): Promise<StoredObjectMetadata> {
    const metadata = await this.getMetadata(path);

    if (!metadata) {
      throw new BadRequestError(
        'No uploaded file found for this request. Complete the upload before confirming it.'
      );
    }

    if (metadata.size > config.storage.upload.maxFileSize) {
      throw new BadRequestError(
        `File size exceeds maximum of ${config.storage.upload.maxFileSize / 1024 / 1024}MB`
      );
    }

    return metadata;
  }

  public validateAndDecodeUpload(params: {
    file: string;
    contentType: string;
    filename: string;
  }): Buffer {
    const { file, contentType, filename } = params;

    this.validateFileType(contentType);
    this.validateFileExtension(filename);
    const fileBuffer = this.decodeBase64File(file);
    this.validateFileSize(fileBuffer);

    return fileBuffer;
  }
}
