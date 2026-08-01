import { createHmac, timingSafeEqual } from 'node:crypto';

import type { IWebhookSigner, WebhookSignatureInput } from '@grantjs/core';

/** Scheme prefix for the signature header value. */
export const WEBHOOK_SIGNATURE_SCHEME = 'v1';

/**
 * HMAC-SHA256 webhook signer.
 *
 * Signs `"{timestamp}.{body}"` and emits headers:
 *   Webhook-Id, Webhook-Timestamp, Webhook-Signature: v1,<base64 sig>
 */
export class HmacWebhookSigner implements IWebhookSigner {
  sign(input: WebhookSignatureInput): string {
    return createHmac('sha256', input.secret)
      .update(`${input.timestamp}.${input.body}`)
      .digest('base64');
  }

  buildHeaders(input: WebhookSignatureInput): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Webhook-Id': input.id,
      'Webhook-Timestamp': String(input.timestamp),
      'Webhook-Signature': `${WEBHOOK_SIGNATURE_SCHEME},${this.sign(input)}`,
    };
  }
}

/**
 * Constant-time verification helper (useful for tests and any inbound
 * verification). Returns true if `signatureHeader` contains a matching v1 sig.
 */
export function verifyWebhookSignature(
  signer: IWebhookSigner,
  input: WebhookSignatureInput,
  signatureHeader: string
): boolean {
  const expected = signer.sign(input);
  for (const part of signatureHeader.split(/\s+/)) {
    const [scheme, value] = part.split(',');
    if (scheme !== WEBHOOK_SIGNATURE_SCHEME || !value) continue;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    if (a.length === b.length && timingSafeEqual(a, b)) return true;
  }
  return false;
}
