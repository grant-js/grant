import type { Request } from 'express';
import { describe, expect, it, vi } from 'vitest';

const mockConfig = { security: { trustedClientIpHeader: '' } };
vi.mock('@/config', () => ({ config: mockConfig }));

const { getClientIp } = await import('@/lib/headers.lib');

function request(headers: Record<string, string | string[]>, socketIp = '10.0.1.7'): Request {
  return { headers, socket: { remoteAddress: socketIp } } as unknown as Request;
}

describe('getClientIp without a trusted header', () => {
  it('reads the first x-forwarded-for entry, as it always has', () => {
    mockConfig.security.trustedClientIpHeader = '';

    expect(getClientIp(request({ 'x-forwarded-for': '203.0.113.5, 70.41.3.18' }))).toBe(
      '203.0.113.5'
    );
  });

  it('is spoofable behind an appending proxy — the reason the option exists', () => {
    // Documents the exposure rather than asserting it is fixed. CloudFront APPENDS the
    // viewer IP to a client-supplied X-Forwarded-For, so a caller sending
    // `X-Forwarded-For: 1.2.3.4` is read as 1.2.3.4 while the real address trails it.
    // This value keys the rate limiter and is recorded as the request's ipAddress.
    mockConfig.security.trustedClientIpHeader = '';
    const spoofed = request({ 'x-forwarded-for': '1.2.3.4, 198.51.100.9' });

    expect(getClientIp(spoofed)).toBe('1.2.3.4');
    expect(getClientIp(spoofed)).not.toBe('198.51.100.9');
  });

  it('falls back to x-real-ip, then the socket', () => {
    mockConfig.security.trustedClientIpHeader = '';

    expect(getClientIp(request({ 'x-real-ip': '198.51.100.9' }))).toBe('198.51.100.9');
    expect(getClientIp(request({}))).toBe('10.0.1.7');
  });
});

describe('getClientIp with a trusted header', () => {
  it('ignores a spoofed x-forwarded-for entirely', () => {
    // The fix. CloudFront overwrites CloudFront-Viewer-Address, so it cannot be
    // supplied by the caller the way X-Forwarded-For can.
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';

    const ip = getClientIp(
      request({
        'x-forwarded-for': '1.2.3.4, 198.51.100.9',
        'cloudfront-viewer-address': '198.51.100.9:54321',
      })
    );

    expect(ip).toBe('198.51.100.9');
  });

  it('strips the port from the last colon, keeping IPv6 intact', () => {
    // Splitting on the FIRST colon would truncate every IPv6 client to "2001",
    // collapsing them into a single rate-limit bucket.
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';

    expect(getClientIp(request({ 'cloudfront-viewer-address': '2001:db8::1:54321' }))).toBe(
      '2001:db8::1'
    );
    expect(getClientIp(request({ 'cloudfront-viewer-address': '203.0.113.5:443' }))).toBe(
      '203.0.113.5'
    );
  });

  it('leaves a bare address untouched, port or not', () => {
    // Splitting on the last colon unconditionally would turn 2001:db8::1 into
    // 2001:db8: — so the remainder is validated as an IP before it is used, and a
    // value that already parses as one is returned as-is.
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';

    expect(getClientIp(request({ 'cloudfront-viewer-address': '2001:db8::1' }))).toBe(
      '2001:db8::1'
    );
    expect(getClientIp(request({ 'cloudfront-viewer-address': '203.0.113.5' }))).toBe(
      '203.0.113.5'
    );
  });

  it('keeps an IPv6 address whose port is indistinguishable from a hex group', () => {
    // Documents a limit rather than claiming it is solved: 2001:db8::1:8443 is both a
    // valid IPv6 address and a plausible address:port, and nothing in the string says
    // which. Such a caller is keyed per connection instead of per address.
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';

    expect(getClientIp(request({ 'cloudfront-viewer-address': '2001:db8::1:8443' }))).toBe(
      '2001:db8::1:8443'
    );
  });

  it('does not fall back to x-forwarded-for when the trusted header is absent', () => {
    // Falling back would restore the bypass: a caller would simply omit the trusted
    // header and supply their own X-Forwarded-For. The socket address is the safe
    // answer even though it is the load balancer's.
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';

    expect(getClientIp(request({ 'x-forwarded-for': '1.2.3.4' }))).toBe('10.0.1.7');
  });
});

/**
 * Gate 4, finding F-B.
 *
 * The trusted header keys the rate limiter and the audit `ipAddress`, so its value has
 * to be an address or nothing. Measured against the live edge, CloudFront overwrites
 * the header and a viewer cannot reach these cases — but that made the safety a
 * property of CloudFront rather than of this code. These pin it here.
 */
describe('a trusted header that is not an address is refused', () => {
  function withTrusted(value: string) {
    mockConfig.security.trustedClientIpHeader = 'cloudfront-viewer-address';
    return request({ 'cloudfront-viewer-address': value });
  }

  it('takes the address from a well-formed value', () => {
    expect(getClientIp(withTrusted('203.0.113.5:54321'))).toBe('203.0.113.5');
  });

  it('accepts a value carrying no port at all', () => {
    expect(getClientIp(withTrusted('203.0.113.5'))).toBe('203.0.113.5');
  });

  it('does not key on a comma-joined value, which is what an appending proxy produces', () => {
    // Falls through to the socket address: one shared bucket, not a bucket the caller
    // chose. Worse limiting, safe direction.
    expect(getClientIp(withTrusted('9.9.9.9:1, 203.0.113.5:53'))).toBe('10.0.1.7');
  });

  it('does not key on arbitrary text', () => {
    expect(getClientIp(withTrusted('not-an-address'))).toBe('10.0.1.7');
  });
});
