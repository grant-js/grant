export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
  public?: boolean;
}

export interface UploadResult {
  path: string;
  url: string;
  size: number;
  contentType?: string;
}

export interface IFileStorageService {
  /**
   * Upload a file to storage
   * @param file - File buffer or stream
   * @param path - Storage path (e.g., 'users/123/profile.jpg')
   * @param options - Upload options (content type, metadata, etc.)
   * @returns Upload result with path and URL
   */
  upload(file: Buffer, path: string, options?: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file from storage
   * @param path - Storage path to delete
   */
  delete(path: string): Promise<void>;

  /**
   * Get public URL for a file
   * @param path - Storage path
   * @returns Public URL (signed URL for S3, direct URL for local)
   */
  getUrl(path: string): Promise<string>;

  /**
   * Check if a file exists
   * @param path - Storage path to check
   * @returns True if file exists
   */
  exists(path: string): Promise<boolean>;

  /**
   * Copy a file to a new location
   * @param sourcePath - Source file path
   * @param destinationPath - Destination file path
   */
  copy(sourcePath: string, destinationPath: string): Promise<void>;
}
