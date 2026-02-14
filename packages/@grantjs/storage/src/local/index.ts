import * as fs from 'fs/promises';
import * as path from 'path';

import { GrantException } from '@grantjs/core';

import type { IFileStorageService, ILogger, UploadOptions, UploadResult } from '@grantjs/core';

export interface LocalConfig {
  basePath: string;
}

/**
 * Local filesystem storage adapter
 * Stores files on the filesystem (works for bare metal, Docker volumes, or any mounted filesystem)
 * The basePath can be configured to point to any filesystem location
 */
export class LocalStorageAdapter implements IFileStorageService {
  constructor(
    private readonly config: LocalConfig,
    private readonly logger: ILogger
  ) {
    this.ensureDirectoryExists(this.config.basePath);
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
      this.logger.info({ msg: 'Created storage directory', path: dirPath });
    }
  }

  async upload(file: Buffer, filePath: string, options?: UploadOptions): Promise<UploadResult> {
    const fullPath = path.join(this.config.basePath, filePath);
    const dirPath = path.dirname(fullPath);

    await this.ensureDirectoryExists(dirPath);

    try {
      await fs.writeFile(fullPath, file);
      const stats = await fs.stat(fullPath);

      const url = `/storage/${filePath}`;

      this.logger.debug({
        msg: 'File uploaded to local storage',
        path: filePath,
        size: stats.size,
      });

      return {
        path: filePath,
        url,
        size: stats.size,
        contentType: options?.contentType,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to upload file to local storage',
        err: error,
        path: filePath,
      });
      throw new GrantException(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.config.basePath, filePath);

    try {
      await fs.unlink(fullPath);
      this.logger.debug({ msg: 'File deleted from local storage', path: filePath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn({ msg: 'File not found for deletion', path: filePath });
        return;
      }
      this.logger.error({
        msg: 'Failed to delete file from local storage',
        err: error,
        path: filePath,
      });
      throw new GrantException(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  async getUrl(filePath: string): Promise<string> {
    return `/storage/${filePath}`;
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = path.join(this.config.basePath, filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceFullPath = path.join(this.config.basePath, sourcePath);
    const destinationFullPath = path.join(this.config.basePath, destinationPath);
    const destinationDir = path.dirname(destinationFullPath);

    await this.ensureDirectoryExists(destinationDir);

    try {
      await fs.copyFile(sourceFullPath, destinationFullPath);
      this.logger.debug({
        msg: 'File copied in local storage',
        source: sourcePath,
        destination: destinationPath,
      });
    } catch (error) {
      this.logger.error({
        msg: 'Failed to copy file in local storage',
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
