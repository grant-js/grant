/**
 * File storage service port interface.
 * Extends the infrastructure IFileStorageService adapter port with
 * application-level validation and path-generation helpers.
 */
import type { IFileStorageService, StoredObjectMetadata } from '../storage.port';

// ---------------------------------------------------------------------------
// IFileStorageServicePort
// ---------------------------------------------------------------------------

export interface IFileStorageServicePort extends IFileStorageService {
  /**
   * Validate the upload payload (content type, extension, size) and decode from base64.
   */
  validateAndDecodeUpload(params: { file: string; contentType: string; filename: string }): Buffer;

  /**
   * Sanitize the file extension and build a deterministic storage path.
   */
  sanitizeExtensionAndGeneratePath(filename: string, basePath: string, defaultExt?: string): string;

  /**
   * Validate a direct upload before a URL is issued for it.
   *
   * The pre-mint counterpart of `validateAndDecodeUpload`: with a direct upload
   * the bytes never reach the application, so content type, extension and size
   * are checked against what the client says it is about to send, and the URL is
   * then made to commit to it.
   */
  validateUploadRequest(params: {
    contentType: string;
    filename: string;
    contentLength: number;
  }): void;

  /**
   * Read back what the store holds at `path` and refuse anything the upload
   * policy would not have accepted. What a client claimed at mint time is not
   * evidence that it sent that.
   */
  assertStoredWithinPolicy(path: string): Promise<StoredObjectMetadata>;
}
