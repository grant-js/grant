/** Parameters for computing a webhook signature. */
export interface WebhookSignatureInput {
  /** Unique delivery id (also sent as `Webhook-Id`). */
  id: string;
  /** Unix epoch seconds used in the signed payload and `Webhook-Timestamp`. */
  timestamp: number;
  /** Raw request body (exact bytes that will be POSTed). */
  body: string;
  /** Subscription signing secret. */
  secret: string;
}

/**
 * Signs webhook payloads so consumers can verify authenticity and integrity.
 * Signature scheme: HMAC-SHA256 over `"{timestamp}.{body}"`, base64-encoded,
 * emitted as `Webhook-Signature: v1,<sig>`.
 */
export interface IWebhookSigner {
  /** Compute the bare signature value (without the `v1,` scheme prefix). */
  sign(input: WebhookSignatureInput): string;
  /** Build the full set of signing headers for a delivery. */
  buildHeaders(input: WebhookSignatureInput): Record<string, string>;
}

export type WebhookDeliveryErrorType = 'timeout' | 'network' | 'ssrf' | 'http' | 'unknown';

export interface WebhookDeliveryRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
  timeoutMs?: number;
}

export interface WebhookDeliveryResult {
  /** True only for a 2xx response. */
  ok: boolean;
  /** HTTP status code if a response was received, else null. */
  status: number | null;
  errorType?: WebhookDeliveryErrorType;
  errorMessage?: string;
  /** Whether the dispatcher should schedule a retry (5xx/timeout/network). */
  retryable: boolean;
}

/**
 * Delivers signed webhook payloads to external endpoints. Implementations must
 * apply an SSRF guard (block private/loopback/link-local targets unless
 * explicitly allowlisted) both at delivery time and via `validateUrl` when a
 * subscription is created.
 */
export interface IWebhookDeliveryAdapter {
  deliver(request: WebhookDeliveryRequest): Promise<WebhookDeliveryResult>;
  /** Throws a domain error when the URL is not an allowed delivery target. */
  validateUrl(url: string): Promise<void>;
}
