import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type {
  IFileStorageService,
  ILogger,
  StoredObjectMetadata,
  UploadOptions,
  UploadResult,
  UploadUrlOptions,
  UploadUrlResult,
} from '@grantjs/core';
import { AuthorizationError, GrantException, ValidationError } from '@grantjs/core';
import * as fs from 'fs/promises';
import * as path from 'path';

import { assertUploadPath, assertUploadTarget } from '../upload-url';

export interface LocalConfig {
  basePath: string;

  /**
   * Prefix the application mounts the storage routes under. Must match the mount
   * point in `create-app.ts`, because `getUrl()` and `getUploadUrl()` both build
   * URLs the application has to be able to route.
   */
  urlPrefix?: string;

  /**
   * Overrides the key file. Supply it when replicas do not share `basePath`;
   * otherwise the adapter manages `<basePath>/.grant-upload-key` itself.
   */
  uploadSigningSecret?: string;
}

const DEFAULT_URL_PREFIX = '/storage';

/**
 * Dot-prefixed on purpose: `express.static` is configured `dotfiles: 'deny'`
 * (`apps/api/src/middleware/storage.middleware.ts`), which is what keeps this
 * unreadable over the same mount that serves the files beside it. Writing it is
 * blocked separately, by `assertUploadPath` refusing dot-prefixed segments.
 */
const UPLOAD_KEY_FILENAME = '.grant-upload-key';

/**
 * Local filesystem storage adapter
 * Stores files on the filesystem (works for bare metal, Docker volumes, or any mounted filesystem)
 * The basePath can be configured to point to any filesystem location
 */
export class LocalStorageAdapter implements IFileStorageService {
  /**
   * Resolved once and reused. Two concurrent first-mints would otherwise race to
   * create the key file and the loser would sign with a key nobody can verify.
   */
  private uploadKey?: Promise<Buffer>;

  constructor(
    private readonly config: LocalConfig,
    private readonly logger: ILogger
  ) {
    this.ensureDirectoryExists(this.config.basePath);
  }

  private get urlPrefix(): string {
    return this.config.urlPrefix ?? DEFAULT_URL_PREFIX;
  }

  private resolveUnderBase(filePath: string): string {
    assertUploadPath(filePath);
    const root = path.resolve(this.config.basePath);
    const fullPath = path.resolve(root, filePath);
    if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
      throw new ValidationError(`Storage path escapes the storage root: ${filePath}`);
    }
    return fullPath;
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
    const fullPath = this.resolveUnderBase(filePath);
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
    const fullPath = this.resolveUnderBase(filePath);

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
    return `${this.urlPrefix}/${filePath}`;
  }

  async getMetadata(filePath: string): Promise<StoredObjectMetadata | null> {
    const fullPath = this.resolveUnderBase(filePath);

    try {
      const stats = await fs.stat(fullPath);
      // No `contentType`: the filesystem does not record one, and guessing from the
      // extension would be a fact the store cannot back. Documented divergence.
      return { size: stats.size, lastModified: stats.mtime };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      this.logger.error({
        msg: 'Failed to read local file metadata',
        err: error,
        path: filePath,
      });
      throw new GrantException(
        `Failed to read file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STORAGE_ERROR',
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * The signing key for upload URLs.
   *
   * Deliberately a file under `basePath` and not an env key: the key's failure
   * domain is then identical to the data's. Replicas that share the volume share
   * the key; replicas that do not already cannot serve each other's files. An env
   * key has no safe default — empty would mean either an open write endpoint or a
   * required method that throws `ConfigurationError`, and a per-process random one
   * fails intermittently across replicas. See ADR 0007.
   */
  private loadUploadKey(): Promise<Buffer> {
    this.uploadKey ??= (async () => {
      if (this.config.uploadSigningSecret) {
        return Buffer.from(this.config.uploadSigningSecret, 'utf8');
      }

      const keyPath = path.join(this.config.basePath, UPLOAD_KEY_FILENAME);
      await this.ensureDirectoryExists(this.config.basePath);

      try {
        return await fs.readFile(keyPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      }

      const key = randomBytes(32);
      // `wx` so a concurrent creator loses the race visibly rather than silently
      // overwriting a key other URLs were already signed with.
      try {
        await fs.writeFile(keyPath, key, { mode: 0o600, flag: 'wx' });
        this.logger.info({ msg: 'Created local upload signing key', path: keyPath });
        return key;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
          return fs.readFile(keyPath);
        }
        throw error;
      }
    })();

    return this.uploadKey;
  }

  private async sign(
    filePath: string,
    contentType: string,
    contentLength: number,
    expiresAtSeconds: number
  ): Promise<string> {
    const key = await this.loadUploadKey();
    return createHmac('sha256', key)
      .update(`PUT\n${filePath}\n${contentType}\n${contentLength}\n${expiresAtSeconds}`)
      .digest('base64url');
  }

  async getUploadUrl(filePath: string, options: UploadUrlOptions): Promise<UploadUrlResult> {
    assertUploadTarget(filePath, options);

    const expiresAt = new Date(Date.now() + options.expiresInSeconds * 1000);
    const expiresAtSeconds = Math.floor(expiresAt.getTime() / 1000);
    const signature = await this.sign(
      filePath,
      options.contentType,
      options.contentLength,
      expiresAtSeconds
    );

    const query = new URLSearchParams({
      exp: String(expiresAtSeconds),
      len: String(options.contentLength),
      ct: options.contentType,
      sig: signature,
    });

    this.logger.debug({
      msg: 'Signed local upload URL issued',
      path: filePath,
      contentLength: options.contentLength,
      expiresAt: expiresAt.toISOString(),
    });

    return {
      url: `${this.urlPrefix}/${filePath}?${query.toString()}`,
      method: 'PUT',
      headers: { 'Content-Type': options.contentType },
      expiresAt,
    };
  }

  /**
   * Verify a URL this adapter minted, and check what arrived against what it
   * committed to.
   *
   * Not on `IFileStorageService`: S3 verifies its own signatures at the edge, so a
   * `verifyUploadUrl` on the port would be a method one adapter exists to answer.
   * The application's PUT route calls this directly. See ADR 0007.
   *
   * `observed` is what the request actually carried. It is checked here rather than
   * by the caller so that every caller — the Express route, and the conformance
   * suite's throwaway server — enforces identically. A route that did its own
   * comparison would be testing its own copy of the rule.
   *
   * @throws ValidationError when the query string is malformed
   * @throws AuthorizationError when the signature does not match, has expired, or
   *   the request does not carry what the URL committed to
   */
  async verifyUploadUrl(
    filePath: string,
    params: { exp?: string; len?: string; ct?: string; sig?: string },
    observed?: { contentType?: string; contentLength?: number }
  ): Promise<{ contentLength: number; contentType: string }> {
    assertUploadPath(filePath);

    const { exp, len, ct, sig } = params;
    if (!exp || !len || !ct || !sig) {
      throw new ValidationError('Upload URL is missing its signature parameters');
    }

    const expiresAtSeconds = Number(exp);
    const contentLength = Number(len);
    if (!Number.isInteger(expiresAtSeconds) || !Number.isInteger(contentLength)) {
      throw new ValidationError('Upload URL has malformed signature parameters');
    }

    const expected = await this.sign(filePath, ct, contentLength, expiresAtSeconds);
    const provided = Buffer.from(sig);
    const expectedBytes = Buffer.from(expected);

    // Length-check first: timingSafeEqual throws on a mismatch rather than
    // returning false, and the length of a signature is not a secret.
    if (provided.length !== expectedBytes.length || !timingSafeEqual(provided, expectedBytes)) {
      throw new AuthorizationError('Upload URL signature is invalid');
    }

    // Expiry is checked *after* the signature, so an attacker cannot use the
    // response to distinguish a forged URL from a stale one.
    if (Date.now() >= expiresAtSeconds * 1000) {
      throw new AuthorizationError('Upload URL has expired');
    }

    if (observed?.contentType !== undefined && observed.contentType !== ct) {
      throw new AuthorizationError(
        `Upload URL committed to content type ${ct}, request sent ${observed.contentType}`
      );
    }

    // Exact, not a maximum: the URL committed to a number the client supplied from
    // a file it already held. A shorter body is as much a mismatch as a longer one.
    if (observed?.contentLength !== undefined && observed.contentLength !== contentLength) {
      throw new AuthorizationError(
        `Upload URL committed to ${contentLength} bytes, request sent ${observed.contentLength}`
      );
    }

    return { contentLength, contentType: ct };
  }

  async exists(filePath: string): Promise<boolean> {
    const fullPath = this.resolveUnderBase(filePath);
    try {
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    const sourceFullPath = this.resolveUnderBase(sourcePath);
    const destinationFullPath = this.resolveUnderBase(destinationPath);
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
