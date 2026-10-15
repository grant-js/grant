import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { proxy } from '@/proxy';

const storageUrl = 'https://grant.example.com/storage/imports/projects/x/y.json';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('proxy: /storage', () => {
  it('answers 404 with an empty body when the provider is not local', async () => {
    vi.stubEnv('STORAGE_PROVIDER', 's3');

    const response = proxy(new NextRequest(storageUrl));

    expect(response.status).toBe(404);
    expect(await response.text()).toBe('');
    // A 404 is a final answer: it must not carry the rewrite that would forward it.
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBeNull();
  });

  it.each([undefined, 'local'])(
    'lets the request through to the rewrite when provider is %s',
    (provider) => {
      if (provider) vi.stubEnv('STORAGE_PROVIDER', provider);
      else vi.stubEnv('STORAGE_PROVIDER', '');

      const response = proxy(new NextRequest(storageUrl));

      expect(response.status).toBe(200);
      expect(response.headers.get('x-middleware-next')).toBe('1');
    }
  );

  it('leaves other proxied paths alone on a non-local provider', () => {
    vi.stubEnv('STORAGE_PROVIDER', 's3');

    const response = proxy(new NextRequest('https://grant.example.com/api/auth/providers'));

    expect(response.status).toBe(200);
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('still injects the origin-verify header for /storage on the local provider', () => {
    vi.stubEnv('STORAGE_PROVIDER', 'local');
    vi.stubEnv('ORIGIN_VERIFY_SECRET', 'topsecret');

    const response = proxy(new NextRequest(storageUrl));

    expect(response.headers.get('x-middleware-request-x-origin-verify')).toBe('topsecret');
  });
});
