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

export interface DownloadOptions {
  /**
   * Largest object the caller will accept, in bytes. Required: a read with no cap
   * is a read the caller can be made to lose memory on. See `download()`.
   */
  maxBytes: number;
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

  /**
   * Read the whole object stored at `path` into memory, refusing anything larger
   * than `options.maxBytes`.
   *
   * Returns a `Buffer`, not a stream, on purpose: the only consumer today is the
   * project-sync worker, which parses the entire document before it does anything
   * with it, so a stream would be buffered by the first caller anyway. A streaming
   * variant can be added beside this method later without breaking any caller.
   *
   * **The cap lives inside the method and is required, not left to the caller.**
   * "Call `getMetadata()` first and refuse on `size`" does not fail closed: HEAD
   * then GET is a time-of-check/time-of-use gap, and the principals that read
   * through this port (the sync task role) can also write the bucket, so a larger
   * object may be at the same key by the time the GET runs. Both stores also hand
   * the body over before the caller can look at it. So the adapter checks the size
   * the store reports on the read itself, before buffering, and counts bytes while
   * reading where the store did not report one. Adding the parameter later would be
   * another `@grantjs/core` change, which is why it is here from the first slice.
   *
   * Required of every adapter, for the reason ADR 0007 gives for `getUploadUrl()`:
   * a capability the port promises and one adapter cannot honour makes ports leak.
   * See ADR 0009.
   *
   * SECURITY: `path` is the tenancy boundary, exactly as for `getUploadUrl()`. A
   * client-supplied path is a cross-tenant read; derive it server-side. Adapters
   * apply the same path guards as `getUploadUrl()`, so a path that could never
   * have been minted is never read either.
   *
   * @param path - Storage path to read
   * @param options - `maxBytes`: the largest object, in bytes, the caller will
   *   accept. A positive integer; an object of exactly `maxBytes` is accepted.
   * @returns The stored bytes
   * @throws PayloadTooLargeError when the object is larger than `maxBytes`. Thrown
   *   before the body is buffered; `limitBytes` is the cap, and `receivedBytes` the
   *   size when the store reported it.
   * @throws NotFoundError when nothing is stored at `path`. Unlike `getMetadata()`,
   *   which answers `null`, a method that returns bytes has no empty value to
   *   return, and unlike `delete()` a missing object is not an already-satisfied
   *   intent.
   * @throws ValidationError on a path containing a `..` segment, a leading
   *   separator, an empty segment or a dot-prefixed segment; or on a `maxBytes`
   *   that is not a positive integer
   * @throws GrantException (`STORAGE_ERROR`) on any other store failure
   */
  download(path: string, options: DownloadOptions): Promise<Buffer>;
}
