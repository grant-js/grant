/**
 * Send a body to a URL the API minted, and nothing else.
 *
 * A presigned URL is a bearer capability (ADR 0007): it permits exactly one byte
 * length of exactly one content type at exactly one server-derived path, until it
 * expires. Everything here follows from that — the request carries the headers the
 * API named and none of its own, and it carries no credentials, because a capability
 * needs none and the storage origin is not ours to hand a session cookie to.
 *
 * Deliberately knows nothing about Apollo, pictures, or which target is uploading.
 * The three call sites differ only in which mutation pair mints the URL and records
 * the result; the transfer between them is identical, and a copy per target is how
 * two of them would end up disagreeing about what an expired URL means.
 */

/**
 * Why the transfer failed, as something a caller can branch on.
 *
 * The messages on the error are for developers — the user-facing wording is chosen by
 * the hook, which has the translator. Callers must not match on message text.
 */
export type DirectUploadFailure =
  /** The window closed before the body was sent. No request was made. */
  | 'expired'
  /** The caller's signal fired. Any object at the path is partial or absent. */
  | 'aborted'
  /** The request never got an answer — offline, DNS, TLS, a blocked preflight. */
  | 'network'
  /** The store answered, and refused. `status` says how. */
  | 'rejected'
  /**
   * The bytes are in the store and the API was never told. The one failure that
   * leaves the two sides disagreeing, so it is named rather than folded into the
   * others — see the orphan note on `runDirectUpload`.
   */
  | 'unclaimed';

export class DirectUploadError extends Error {
  public readonly failure: DirectUploadFailure;
  public readonly status?: number;

  constructor(
    failure: DirectUploadFailure,
    message: string,
    options: { status?: number; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = 'DirectUploadError';
    this.failure = failure;
    this.status = options.status;
  }
}

/**
 * Only the slice of `fetch` this module uses. Narrower than `typeof fetch` on purpose:
 * `globalThis.fetch` satisfies it, and a test double satisfies it without a cast.
 */
type UploadFetch = (url: string, init: RequestInit) => Promise<Response>;

/** The mint step's result, as the `UploadUrl` GraphQL type delivers it. */
export interface DirectUploadTicket {
  url: string;
  method: string;
  /** `Date` from Apollo's scalar, string when it has been through JSON. */
  expiresAt: Date | string;
  headers: ReadonlyArray<{ name: string; value: string }>;
}

export interface SendDirectUploadOptions {
  ticket: DirectUploadTicket;
  body: Blob;
  /** Aborts the transfer. See the asymmetry note in the picture-upload hooks. */
  signal?: AbortSignal;
  /** Base for an application-relative ticket URL. Defaults to this document's origin. */
  origin?: string;
  fetchImpl?: UploadFetch;
}

/**
 * `UploadUrl.url` is absolute for object stores and application-relative for targets
 * the API serves itself. Resolving it explicitly rather than leaning on `fetch`'s own
 * base resolution is what lets a test assert which origin was reached.
 */
function resolveTicketUrl(url: string, origin?: string): string {
  const base = origin ?? (typeof window === 'undefined' ? undefined : window.location.origin);
  try {
    return new URL(url, base).toString();
  } catch {
    throw new DirectUploadError('rejected', `Upload URL is not a usable URL: ${url}`);
  }
}

export async function sendDirectUpload(options: SendDirectUploadOptions): Promise<void> {
  const { ticket, body, signal } = options;
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;

  const expiresAt =
    ticket.expiresAt instanceof Date ? ticket.expiresAt : new Date(ticket.expiresAt);

  // Checked here rather than left to the store, for two reasons. A cropped image is
  // megabytes, and sending them to be refused wastes the one thing a slow connection
  // has none of. And the refusal a store gives for a stale signature is
  // indistinguishable from the one it gives for a forged one — by design, on the local
  // adapter — so the only place this can be named accurately is before the request.
  if (Number.isNaN(expiresAt.getTime())) {
    throw new DirectUploadError(
      'expired',
      `Upload URL has an unreadable expiry: ${ticket.expiresAt}`
    );
  }
  if (expiresAt.getTime() <= Date.now()) {
    throw new DirectUploadError('expired', `Upload URL expired at ${expiresAt.toISOString()}`);
  }

  const headers = new Headers();
  for (const { name, value } of ticket.headers) {
    headers.set(name, value);
  }

  let response: Response;
  try {
    response = await fetchImpl(resolveTicketUrl(ticket.url, options.origin), {
      method: ticket.method.toUpperCase(),
      headers,
      body,
      // A presigned URL authorizes itself. Sending the session cookie alongside it
      // would hand our credentials to whatever origin the store lives on, to no
      // purpose — the store is not the API and cannot act on them, but it can log them.
      credentials: 'omit',
      // Not `cache: 'no-store'`: a PUT is never served from cache, and naming a cache
      // mode adds a header to a request whose headers are signed.
      signal,
    });
  } catch (error) {
    if (signal?.aborted) {
      throw new DirectUploadError('aborted', 'Upload was cancelled before it finished', {
        cause: error,
      });
    }
    throw new DirectUploadError('network', 'Upload could not reach the storage service', {
      cause: error,
    });
  }

  if (!response.ok) {
    throw new DirectUploadError(
      'rejected',
      `Storage service refused the upload with ${response.status}`,
      { status: response.status }
    );
  }
}

/** What a target contributes to a direct upload: a way to mint, and a way to record. */
export interface DirectUploadSteps<TResult> {
  mint: (descriptor: {
    filename: string;
    contentType: string;
    contentLength: number;
  }) => Promise<DirectUploadTicket | null | undefined>;
  confirm: (descriptor: { filename: string }) => Promise<TResult | null | undefined>;
}

export interface DirectUploadBody {
  body: Blob;
  filename: string;
  contentType: string;
}

export interface RunDirectUploadOptions {
  signal?: AbortSignal;
  origin?: string;
  fetchImpl?: UploadFetch;
}

/**
 * Mint a URL, send the bytes to it, then tell the API they arrived.
 *
 * The three steps are separate requests, so there is a window between the second and
 * the third. What survives that window is the point of this function:
 *
 *   - **Before the PUT**, an abort or an expired ticket means nothing was written and
 *     nothing was claimed. Both stop here.
 *   - **After the PUT**, the bytes exist. The signal is deliberately *not* honoured
 *     from this point on: abandoning a stored object is precisely the orphan this is
 *     trying to avoid, so a cancelled upload that already landed is finished rather
 *     than dropped.
 *   - **If the confirm fails anyway** — offline, session expired, permission revoked
 *     mid-flight — the failure is reported as `unclaimed`, because the caller needs to
 *     say something different than "upload failed". The object is at the path the
 *     server derives from the caller's identity and the filename, which is fixed, so a
 *     retry overwrites it: the orphan does not accumulate, and one successful retry
 *     resolves it. See the finding recorded against slice 11a for the case this does
 *     not cover.
 */
export async function runDirectUpload<TResult>(
  steps: DirectUploadSteps<TResult>,
  file: DirectUploadBody,
  options: RunDirectUploadOptions = {}
): Promise<TResult> {
  const { body, filename, contentType } = file;

  const ticket = await steps.mint({ filename, contentType, contentLength: body.size });
  if (!ticket) {
    throw new DirectUploadError('rejected', 'The API did not issue an upload URL');
  }

  if (options.signal?.aborted) {
    throw new DirectUploadError('aborted', 'Upload was cancelled before any bytes were sent');
  }

  await sendDirectUpload({
    ticket,
    body,
    signal: options.signal,
    origin: options.origin,
    fetchImpl: options.fetchImpl,
  });

  let confirmed: TResult | null | undefined;
  try {
    confirmed = await steps.confirm({ filename });
  } catch (error) {
    throw new DirectUploadError('unclaimed', 'The upload was stored but could not be recorded', {
      cause: error,
    });
  }

  if (!confirmed) {
    throw new DirectUploadError('unclaimed', 'The upload was stored but the API recorded nothing');
  }

  return confirmed;
}
