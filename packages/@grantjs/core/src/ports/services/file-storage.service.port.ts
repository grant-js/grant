/**
 * File storage service port interface.
 * Extends the infrastructure IFileStorageService adapter port with
 * application-level validation and path-generation helpers.
 */
import type { IFileStorageService } from '../storage.port';

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
}
