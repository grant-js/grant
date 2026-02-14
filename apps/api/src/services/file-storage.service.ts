import { config } from '@/config';
import { BadRequestError } from '@/lib/errors';
import { loggerFactory } from '@/lib/logger';
import { StorageFactory, UploadOptions, UploadResult } from '@/lib/storage';

import type { IFileStorageService, IFileStorageServicePort } from '@grantjs/core';

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
