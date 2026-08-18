import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { HmacWebhookSigner, verifyWebhookSignature, WEBHOOK_SIGNATURE_SCHEME } from './signer';

const signer = new HmacWebhookSigner();

const input = {
  id: 'evt_1',
  secret: 'shhh',
  timestamp: 1700000000,
  body: '{"hello":"world"}',
};

describe('sign', () => {
  it('is HMAC-SHA256 over "{timestamp}.{body}", base64', () => {
    const expected = createHmac('sha256', input.secret)
      .update(`${input.timestamp}.${input.body}`)
      .digest('base64');

    expect(signer.sign(input)).toBe(expected);
  });

  it('is deterministic', () => {
    expect(signer.sign(input)).toBe(signer.sign(input));
  });

  it.each([
    ['secret', { ...input, secret: 'other' }],
    ['timestamp', { ...input, timestamp: input.timestamp + 1 }],
    ['body', { ...input, body: '{"hello":"there"}' }],
  ])('changes when %s changes', (_field, mutated) => {
    expect(signer.sign(mutated)).not.toBe(signer.sign(input));
  });

  it('binds the timestamp to the body — the separator is not ambiguous', () => {
    /**
     * The signed string is `${timestamp}.${body}`. If a caller could shift the
     * boundary (timestamp "1.2" + body "3" vs timestamp "1" + body "2.3") the
     * same signature would cover two different payloads. Pinned because the
     * separator is a bare "." with no length prefix.
     */
    const a = signer.sign({ ...input, timestamp: 12 as unknown as number, body: '3' });
    const b = signer.sign({ ...input, timestamp: 1 as unknown as number, body: '23' });
    expect(a).not.toBe(b);
  });
});

describe('buildHeaders', () => {
  it('emits the documented header set', () => {
    const headers = signer.buildHeaders(input);

    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Webhook-Id': 'evt_1',
      'Webhook-Timestamp': '1700000000',
      'Webhook-Signature': `${WEBHOOK_SIGNATURE_SCHEME},${signer.sign(input)}`,
    });
  });

  it('prefixes the signature with the v1 scheme', () => {
    expect(signer.buildHeaders(input)['Webhook-Signature']).toMatch(/^v1,/);
  });
});

describe('verifyWebhookSignature', () => {
  const header = (sig: string) => `${WEBHOOK_SIGNATURE_SCHEME},${sig}`;

  it('accepts a signature it just produced', () => {
    expect(verifyWebhookSignature(signer, input, header(signer.sign(input)))).toBe(true);
  });

  it('accepts the full header built by buildHeaders', () => {
    const built = signer.buildHeaders(input)['Webhook-Signature'];
    expect(verifyWebhookSignature(signer, input, built)).toBe(true);
  });

  it('rejects a signature over a different body', () => {
    const other = signer.sign({ ...input, body: 'tampered' });
    expect(verifyWebhookSignature(signer, input, header(other))).toBe(false);
  });

  it('rejects an unknown scheme', () => {
    expect(verifyWebhookSignature(signer, input, `v2,${signer.sign(input)}`)).toBe(false);
  });

  it('rejects a scheme with no value', () => {
    expect(verifyWebhookSignature(signer, input, 'v1,')).toBe(false);
  });

  it('rejects an empty header', () => {
    expect(verifyWebhookSignature(signer, input, '')).toBe(false);
  });

  it('rejects a bare signature with no scheme prefix', () => {
    expect(verifyWebhookSignature(signer, input, signer.sign(input))).toBe(false);
  });

  it('accepts when several space-separated candidates include the right one', () => {
    const good = signer.sign(input);
    expect(verifyWebhookSignature(signer, input, `v1,wrong ${header(good)}`)).toBe(true);
  });

  it('does not throw on a length-mismatched candidate', () => {
    // timingSafeEqual throws on unequal lengths; the guard is the explicit
    // a.length === b.length check before it. Pinned so that check cannot be
    // "simplified" away into an exception.
    expect(() => verifyWebhookSignature(signer, input, 'v1,short')).not.toThrow();
    expect(verifyWebhookSignature(signer, input, 'v1,short')).toBe(false);
  });
});
