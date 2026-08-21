import { describe, expect, it, vi } from 'vitest';

import type { GrantServerConfig } from '../../types';
import {
  extractBearerToken,
  extractTokenFromCookies,
  extractTokenFromRequest,
} from '../../utils/token-extractor';

/**
 * Characterization tests — pass 7, slice 4.
 *
 * This module decides which credential a request is authenticated with, for all four
 * framework adapters, and `extractBearerToken` / `extractTokenFromRequest` are both
 * semver-public (they appear in the built dist/index.d.ts). It had no tests.
 *
 * Per the code-quality rubric: these assert what the code does TODAY, including the
 * parts that look wrong. Cases that pin surprising-but-current behaviour are marked
 * CHARACTERIZATION and say so — do not "fix" one by editing the assertion.
 */

const config = (over: Partial<GrantServerConfig> = {}): GrantServerConfig =>
  ({ apiUrl: 'https://api.example.test', ...over }) as GrantServerConfig;

describe('extractBearerToken', () => {
  it('returns null for a missing header', () => {
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('')).toBeNull();
  });

  it('extracts the token from a well-formed header', () => {
    expect(extractBearerToken('Bearer abc123')).toBe('abc123');
  });

  it('matches the scheme case-insensitively', () => {
    expect(extractBearerToken('bearer abc123')).toBe('abc123');
    expect(extractBearerToken('BEARER abc123')).toBe('abc123');
    expect(extractBearerToken('BeArEr abc123')).toBe('abc123');
  });

  it('tolerates surrounding and repeated whitespace', () => {
    expect(extractBearerToken('   Bearer    abc123   ')).toBe('abc123');
    expect(extractBearerToken('Bearer\tabc123')).toBe('abc123');
  });

  it('rejects a non-Bearer scheme', () => {
    expect(extractBearerToken('Basic abc123')).toBeNull();
    expect(extractBearerToken('Token abc123')).toBeNull();
  });

  it('rejects anything that is not exactly two whitespace-separated parts', () => {
    expect(extractBearerToken('Bearer')).toBeNull();
    expect(extractBearerToken('abc123')).toBeNull();
    // A JWT never contains a space, so a third part means the header is malformed.
    expect(extractBearerToken('Bearer abc 123')).toBeNull();
  });
});

describe('extractTokenFromCookies', () => {
  it('returns null when there is no cookie header', () => {
    expect(extractTokenFromCookies(undefined, 'grant-access-token')).toBeNull();
    expect(extractTokenFromCookies('', 'grant-access-token')).toBeNull();
  });

  it('reads the named cookie out of a multi-cookie header', () => {
    const header = 'other=1; grant-access-token=abc123; another=2';
    expect(extractTokenFromCookies(header, 'grant-access-token')).toBe('abc123');
  });

  it('returns null when the named cookie is absent', () => {
    expect(extractTokenFromCookies('other=1; another=2', 'grant-access-token')).toBeNull();
  });

  it('trims whitespace around both name and value', () => {
    expect(extractTokenFromCookies('  grant-access-token  =  abc123  ', 'grant-access-token')).toBe(
      'abc123'
    );
  });

  it('preserves "=" inside the value (base64url padding, JWTs)', () => {
    expect(extractTokenFromCookies('t=a.b.c==', 't')).toBe('a.b.c==');
  });

  it('CHARACTERIZATION: an empty cookie value reads as absent, not as an empty token', () => {
    // `cookies[cookieName] || null` collapses '' to null. Benign here — an empty token
    // would fail auth anyway — but it means "present but empty" and "absent" are
    // indistinguishable to callers.
    expect(extractTokenFromCookies('grant-access-token=', 'grant-access-token')).toBeNull();
  });

  it('CHARACTERIZATION: on a duplicate cookie name, the LAST value wins', () => {
    // Cookie shadowing is a real attack class: a subdomain can set a cookie that the
    // browser sends alongside the legitimate one. Which value wins is therefore a
    // security-relevant choice, and it is currently made implicitly by the assignment
    // order in parseCookieHeader's forEach rather than deliberately.
    expect(extractTokenFromCookies('t=first; t=second', 't')).toBe('second');
  });

  it('CHARACTERIZATION: values are not URL-decoded', () => {
    // RFC 6265 values are often percent-encoded by the setting party. This returns the
    // raw encoded string, so a token containing an encoded character arrives mangled.
    expect(extractTokenFromCookies('t=a%20b', 't')).toBe('a%20b');
    expect(extractTokenFromCookies('t=a%3Db', 't')).toBe('a%3Db');
  });

  it('CHARACTERIZATION: a bare cookie with no "=" is skipped rather than treated as a flag', () => {
    expect(extractTokenFromCookies('flagonly; t=abc', 't')).toBe('abc');
    expect(extractTokenFromCookies('t', 't')).toBeNull();
  });
});

describe('extractTokenFromRequest', () => {
  describe('config.getToken', () => {
    it('takes precedence over every header', async () => {
      const getToken = vi.fn().mockResolvedValue('from-resolver');
      const req = { headers: { authorization: 'Bearer from-header' } };
      await expect(extractTokenFromRequest(req, config({ getToken }))).resolves.toBe(
        'from-resolver'
      );
      expect(getToken).toHaveBeenCalledWith(req);
    });

    it('falls through to the headers when it returns a falsy value', async () => {
      const req = { headers: { authorization: 'Bearer from-header' } };
      for (const value of [null, undefined, '']) {
        const getToken = vi.fn().mockResolvedValue(value);
        await expect(extractTokenFromRequest(req, config({ getToken }))).resolves.toBe(
          'from-header'
        );
      }
    });

    it('is awaited, so a synchronous resolver works too', async () => {
      const getToken = vi.fn().mockReturnValue('sync-token');
      await expect(extractTokenFromRequest({}, config({ getToken }))).resolves.toBe('sync-token');
    });
  });

  describe('Web API requests (NextRequest / Request — headers.get)', () => {
    const webReq = (entries: Record<string, string>) => ({
      headers: { get: (name: string) => entries[name.toLowerCase()] ?? null },
    });

    it('prefers the Authorization header', async () => {
      const req = webReq({
        authorization: 'Bearer web-token',
        cookie: 'grant-access-token=cookie',
      });
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('web-token');
    });

    it('falls back to the cookie header', async () => {
      const req = webReq({ cookie: 'grant-access-token=cookie-token' });
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('cookie-token');
    });

    it('honours a custom cookieName', async () => {
      const req = webReq({ cookie: 'session=custom-token' });
      await expect(extractTokenFromRequest(req, config({ cookieName: 'session' }))).resolves.toBe(
        'custom-token'
      );
    });

    it('returns null when neither is present', async () => {
      await expect(extractTokenFromRequest(webReq({}), config())).resolves.toBeNull();
    });

    it('CHARACTERIZATION: req.cookies is ignored on this branch', async () => {
      // The Web-API branch returns null without ever consulting req.cookies, while the
      // Express branch below does consult it. A request object carrying BOTH a
      // headers.get function and a parsed cookies bag resolves differently depending on
      // which branch it lands in.
      const req = {
        headers: { get: () => null },
        cookies: { 'grant-access-token': 'ignored-token' },
      };
      await expect(extractTokenFromRequest(req, config())).resolves.toBeNull();
    });
  });

  describe('Express-style requests (plain headers object)', () => {
    it('prefers the Authorization header', async () => {
      const req = {
        headers: { authorization: 'Bearer express-token', cookie: 'grant-access-token=cookie' },
        cookies: { 'grant-access-token': 'parsed' },
      };
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('express-token');
    });

    it('prefers the parsed cookies bag over the raw cookie header', async () => {
      const req = {
        headers: { cookie: 'grant-access-token=from-header' },
        cookies: { 'grant-access-token': 'from-parsed' },
      };
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('from-parsed');
    });

    it('falls back to the raw cookie header when no parsed bag exists', async () => {
      const req = { headers: { cookie: 'grant-access-token=from-header' } };
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('from-header');
    });

    it('honours a custom cookieName in both the bag and the raw header', async () => {
      await expect(
        extractTokenFromRequest(
          { cookies: { session: 'a' }, headers: {} },
          config({ cookieName: 'session' })
        )
      ).resolves.toBe('a');
      await expect(
        extractTokenFromRequest(
          { headers: { cookie: 'session=b' } },
          config({ cookieName: 'session' })
        )
      ).resolves.toBe('b');
    });

    it('returns null when nothing is present', async () => {
      await expect(extractTokenFromRequest({ headers: {} }, config())).resolves.toBeNull();
    });
  });

  describe('malformed requests', () => {
    it('returns null rather than throwing when headers are missing', async () => {
      await expect(extractTokenFromRequest({}, config())).resolves.toBeNull();
      await expect(extractTokenFromRequest(null, config())).resolves.toBeNull();
      await expect(extractTokenFromRequest(undefined, config())).resolves.toBeNull();
      await expect(extractTokenFromRequest('not-a-request', config())).resolves.toBeNull();
    });

    it('CHARACTERIZATION: a malformed Authorization header does NOT stop the cookie fallback', async () => {
      // Deliberate and worth keeping: a client sending `Authorization: Basic ...` while
      // also holding a session cookie is authenticated by the cookie rather than
      // rejected outright.
      const req = { headers: { authorization: 'Basic nope', cookie: 'grant-access-token=abc' } };
      await expect(extractTokenFromRequest(req, config())).resolves.toBe('abc');
    });
  });
});
