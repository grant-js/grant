import { describe, expect, it } from 'vitest';

import { assertUrlAllowed, SsrfBlockedError } from './ssrf';

/**
 * Characterization tests: these assert what the guard does **today**, including
 * the parts that look wrong. Each surprising behaviour is labelled and its
 * disposition (defect vs intended) is argued in the pass-6 stack plan, not here.
 */

const blocked = async (url: string, opts = {}) =>
  await expect(assertUrlAllowed(url, opts)).rejects.toBeInstanceOf(SsrfBlockedError);

const allowed = async (url: string, opts = {}) =>
  await expect(assertUrlAllowed(url, opts)).resolves.toBeUndefined();

const reason = async (url: string, opts = {}) => {
  try {
    await assertUrlAllowed(url, opts);
    return null;
  } catch (e) {
    return (e as Error).message;
  }
};

describe('protocol', () => {
  it('allows https by default', async () => {
    await allowed('https://example.com/hook');
  });

  it('rejects http by default', async () => {
    expect(await reason('http://example.com/hook')).toBe('Webhook URL protocol not allowed: http:');
  });

  it('rejects non-web protocols that could reach the local filesystem or services', async () => {
    await blocked('file:///etc/passwd');
    await blocked('gopher://example.com/');
    await blocked('ftp://example.com/');
  });

  it('honours an explicit protocol allowlist', async () => {
    await allowed('http://example.com/hook', { allowedProtocols: ['http:'] });
  });

  it('rejects a malformed URL before anything else', async () => {
    expect(await reason('not a url')).toBe('Invalid webhook URL');
  });
});

describe('literal IPv4 targets', () => {
  it.each([
    ['10.0.0.1', 'RFC1918 /8'],
    ['172.16.0.1', 'RFC1918 /12'],
    ['172.31.255.255', 'RFC1918 /12 upper bound'],
    ['192.168.1.1', 'RFC1918 /16'],
    ['127.0.0.1', 'loopback'],
    ['169.254.169.254', 'link-local — the cloud metadata endpoint'],
    ['0.0.0.0', 'unspecified'],
    ['100.64.0.1', 'carrier-grade NAT'],
  ])('blocks %s (%s)', async (ip) => {
    await blocked(`https://${ip}/hook`);
  });

  it.each([
    ['8.8.8.8'],
    ['172.32.0.1'], // just outside the /12
    ['172.15.255.255'], // just below the /12
    ['100.128.0.1'], // just outside the CGNAT /10
  ])('allows public %s', async (ip) => {
    await allowed(`https://${ip}/hook`);
  });
});

describe('alternate IPv4 encodings — the classic SSRF bypass set', () => {
  /**
   * These do NOT bypass the guard, and the reason is worth pinning: the guard
   * reads `url.hostname` from the WHATWG `URL` parser, which normalises every
   * one of these to dotted-quad form before `isIP()` ever sees it. A refactor
   * to a different parser (`url.parse`, a regex, a raw string) would silently
   * reopen all four.
   */
  it.each([
    ['2130706433', 'decimal'],
    ['0177.0.0.1', 'octal'],
    ['0x7f.0.0.1', 'hex'],
    ['127.1', 'short form'],
  ])('blocks %s (%s) because URL normalises it to 127.0.0.1', async (host) => {
    expect(new URL(`https://${host}/hook`).hostname).toBe('127.0.0.1');
    expect(await reason(`https://${host}/hook`)).toBe(
      'Webhook URL targets a private address: 127.0.0.1'
    );
  });
});

describe('literal IPv6 targets', () => {
  /**
   * SURPRISING — and the reason is a real defect, argued in the stack plan.
   *
   * `url.hostname` keeps the square brackets for an IPv6 literal (`[::1]`), and
   * `isIP('[::1]')` is 0. So no IPv6 literal is ever recognised as a literal IP:
   * every one falls through to the DNS branch, where a bracketed string cannot
   * resolve, and is rejected as "could not be resolved".
   *
   * The guard therefore fails CLOSED for private IPv6 — but for the wrong
   * reason, with a misleading message, and `isPrivateIPv6` is dead code on this
   * path. The functional cost is that a PUBLIC IPv6 literal is also rejected.
   */
  it('blocks IPv6 loopback, but reports it as unresolvable rather than private', async () => {
    expect(await reason('https://[::1]/hook')).toBe('Webhook host could not be resolved: [::1]');
  });

  it('blocks IPv4-mapped loopback, also as unresolvable', async () => {
    // Note URL rewrites ::ffff:127.0.0.1 to its hex form.
    expect(new URL('https://[::ffff:127.0.0.1]/hook').hostname).toBe('[::ffff:7f00:1]');
    expect(await reason('https://[::ffff:127.0.0.1]/hook')).toBe(
      'Webhook host could not be resolved: [::ffff:7f00:1]'
    );
  });

  it('ALSO blocks a public IPv6 literal — over-blocking, the functional half of the defect', async () => {
    expect(await reason('https://[2606:4700:4700::1111]/hook')).toBe(
      'Webhook host could not be resolved: [2606:4700:4700::1111]'
    );
  });
});

describe('DNS-resolved targets', () => {
  it('blocks a hostname that resolves to loopback', async () => {
    expect(await reason('https://localhost/hook')).toBe(
      'Webhook host resolves to a private address: localhost'
    );
  });

  it('blocks a hostname that cannot be resolved', async () => {
    const msg = await reason('https://no-such-host.invalid/hook');
    expect(msg).toBe('Webhook host could not be resolved: no-such-host.invalid');
  });
});

describe('allowlist and denylist', () => {
  it('denylist beats everything, including a public host', async () => {
    expect(await reason('https://example.com/hook', { denylist: ['example.com'] })).toBe(
      'Webhook host is denylisted: example.com'
    );
  });

  it('denylist is evaluated before allowlist', async () => {
    await blocked('https://example.com/hook', {
      allowlist: ['example.com'],
      denylist: ['example.com'],
    });
  });

  it('allowlist bypasses the private-address check entirely', async () => {
    await allowed('https://localhost/hook', { allowlist: ['localhost'] });
  });

  it('matches host case-insensitively on both lists', async () => {
    await blocked('https://EXAMPLE.com/hook', { denylist: ['example.COM'] });
    await allowed('https://LOCALHOST/hook', { allowlist: ['localhost'] });
  });

  it('allowPrivateTargets disables the address checks — dev/test escape hatch', async () => {
    await allowed('https://127.0.0.1/hook', { allowPrivateTargets: true });
  });
});
