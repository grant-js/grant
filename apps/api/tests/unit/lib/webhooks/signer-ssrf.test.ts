import {
  assertUrlAllowed,
  HmacWebhookSigner,
  SsrfBlockedError,
  verifyWebhookSignature,
} from '@grantjs/webhooks';
import { describe, expect, it } from 'vitest';

describe('HmacWebhookSigner', () => {
  const signer = new HmacWebhookSigner();
  const input = {
    id: 'evt-1',
    timestamp: 1_700_000_000,
    body: '{"hello":"world"}',
    secret: 's3cr3t',
  };

  it('produces deterministic v1 signature headers', () => {
    const headers = signer.buildHeaders(input);
    expect(headers['Webhook-Id']).toBe('evt-1');
    expect(headers['Webhook-Timestamp']).toBe('1700000000');
    expect(headers['Webhook-Signature']).toMatch(/^v1,/);
    expect(signer.buildHeaders(input)['Webhook-Signature']).toBe(headers['Webhook-Signature']);
  });

  it('verifies its own signatures and rejects tampering', () => {
    const header = signer.buildHeaders(input)['Webhook-Signature'];
    expect(verifyWebhookSignature(signer, input, header)).toBe(true);
    expect(verifyWebhookSignature(signer, { ...input, body: 'tampered' }, header)).toBe(false);
  });
});

describe('assertUrlAllowed (SSRF guard)', () => {
  it('rejects non-https protocols by default', async () => {
    await expect(assertUrlAllowed('http://example.com/hook')).rejects.toBeInstanceOf(
      SsrfBlockedError
    );
  });

  it('rejects literal private IPs', async () => {
    await expect(assertUrlAllowed('https://127.0.0.1/hook')).rejects.toBeInstanceOf(
      SsrfBlockedError
    );
    await expect(assertUrlAllowed('https://10.1.2.3/hook')).rejects.toBeInstanceOf(
      SsrfBlockedError
    );
    await expect(assertUrlAllowed('https://169.254.169.254/latest')).rejects.toBeInstanceOf(
      SsrfBlockedError
    );
  });

  it('honors allowPrivateTargets for local development', async () => {
    await expect(
      assertUrlAllowed('http://localhost:9999/hook', {
        allowedProtocols: ['http:', 'https:'],
        allowPrivateTargets: true,
      })
    ).resolves.toBeUndefined();
  });

  it('rejects denylisted hosts', async () => {
    await expect(
      assertUrlAllowed('https://blocked.example.com/hook', { denylist: ['blocked.example.com'] })
    ).rejects.toBeInstanceOf(SsrfBlockedError);
  });
});
