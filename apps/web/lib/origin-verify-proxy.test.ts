import { describe, expect, it } from 'vitest';

import {
  resolveOriginVerifyHeaderName,
  resolveOriginVerifySecret,
  shouldInjectOriginVerify,
} from '@/lib/origin-verify-proxy';

describe('shouldInjectOriginVerify', () => {
  it.each([
    '/api',
    '/api/auth/providers',
    '/graphql',
    '/graphql/foo',
    '/health',
    '/storage/x',
    '/.well-known/jwks.json',
    '/org/o1/prj/p1/.well-known/openid-configuration',
    '/acc/a1/prj/p1/.well-known/jwks.json',
  ])('matches proxied path %s', (pathname) => {
    expect(shouldInjectOriginVerify(pathname)).toBe(true);
  });

  it.each(['/auth/login', '/en/auth/register', '/dashboard', '/favicon.ico'])(
    'skips page path %s',
    (pathname) => {
      expect(shouldInjectOriginVerify(pathname)).toBe(false);
    }
  );
});

describe('resolveOriginVerifySecret', () => {
  it('returns the server secret when set', () => {
    expect(resolveOriginVerifySecret({ ORIGIN_VERIFY_SECRET: '  s3cret  ' })).toBe('s3cret');
  });

  it('is a no-op when the server secret is unset', () => {
    expect(resolveOriginVerifySecret({})).toBeUndefined();
    expect(resolveOriginVerifySecret({ ORIGIN_VERIFY_SECRET: '' })).toBeUndefined();
  });

  it('never uses NEXT_PUBLIC_ORIGIN_VERIFY_SECRET', () => {
    expect(
      resolveOriginVerifySecret({
        NEXT_PUBLIC_ORIGIN_VERIFY_SECRET: 'leaked-to-browser',
      })
    ).toBeUndefined();
  });
});

describe('resolveOriginVerifyHeaderName', () => {
  it('defaults to x-origin-verify', () => {
    expect(resolveOriginVerifyHeaderName({})).toBe('x-origin-verify');
  });

  it('normalizes SECURITY_ORIGIN_VERIFY_HEADER', () => {
    expect(resolveOriginVerifyHeaderName({ SECURITY_ORIGIN_VERIFY_HEADER: ' X-Custom ' })).toBe(
      'x-custom'
    );
  });
});
