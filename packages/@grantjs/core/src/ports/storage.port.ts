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

export interface UploadUrlOptions {
  /**
   * Exact byte length the client will send. The URL commits to it: a body of any
   * other length must be rejected by the store. Exact, not maximum — the client
   * holds the file and knows the number before it asks, and the only presigning
   * form that expresses a *range* is presigned POST. See ADR 0007.
   */
  contentLength: number;

  /** Exact content type the client must send. The URL commits to it. */
  contentType: string;

  /**
   * Lifetime from the moment of minting. An integer in [1, 604800] — SigV4's own
   * ceiling, which no adapter has a reason to exceed. Neither store revokes a URL
   * it has issued, so this is the only mitigation for one that leaks: prefer
   * minutes.
   */
  expiresInSeconds: number;
}

export interface UploadUrlResult {
  /** Absolute for object stores; application-relative for adapters this app serves. */
  url: string;

  /** Only PUT is issued today. Widening the union later is additive. */
  method: 'PUT';

  /**
   * Headers the client must set verbatim. `Content-Length` is deliberately absent:
   * it is a forbidden header name for `fetch`, which sets it from the body — so a
   * caller could not honour it even though the URL commits to the value.
   */
  headers: Record<string, string>;

  /** Instant after which the store must reject the URL. */
  expiresAt: Date;
}

export interface StoredObjectMetadata {
  /** Size as the store reports it, not as the client claimed. */
  size: number;

  /** Content type where the store records one; absent on stores that do not. */
  contentType?: string;

  lastModified?: Date;
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
   * Mint a bounded, time-limited URL the client writes bytes to directly, without
   * them passing through this API's request body.
   *
   * The URL is a bearer capability: anyone holding it may write exactly
   * `contentLength` bytes of exactly `contentType` to exactly `path`, until
   * `expiresAt`. It is not single-use — a holder may overwrite the same path with a
   * different body of the same length and type inside the window — and no store
   * revokes it. Read the object back with `getMetadata()` rather than trusting what
   * was claimed at mint time.
   *
   * SECURITY: `path` is the tenancy boundary. This port cannot know the caller's
   * scope, so the prefix must be derived server-side. A client-supplied path is a
   * cross-tenant write.
   *
   * @param path - Storage path the URL is bound to
   * @param options - The three commitments the URL carries
   * @returns The URL, the method and headers the client must use, and the expiry
   * @throws ValidationError on a path containing a `..` segment, a leading
   *   separator, an empty segment or a dot-prefixed segment; on a `contentLength`
   *   that is not a positive integer; on an `expiresInSeconds` outside [1, 604800]
   */
  getUploadUrl(path: string, options: UploadUrlOptions): Promise<UploadUrlResult>;

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

  /**
   * What the store actually holds at `path`, or null if nothing does.
   *
   * `exists()` answers the same question with one bit and throws the rest away.
   * After a direct upload the size and type a client *claimed* are not evidence;
   * this is. Note that `contentType` is absent on stores that do not record one.
   *
   * @param path - Storage path to describe
   * @returns The stored object's metadata, or null if nothing is stored there
   */
  getMetadata(path: string): Promise<StoredObjectMetadata | null>;
}
