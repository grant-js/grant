/**
 * Public social OAuth discovery and optional live IdP redirects.
 *
 * Provider list does not need credentials. Authorize redirects are skipped unless
 * the matching client id is present in the E2E environment.
 */
import { afterAll, describe, expect, it } from 'vitest';

import { closeDbHelper } from '../helpers/db-tokens';
import { unauthenticatedClient } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

describe('OAuth providers', () => {
  it('GET /api/auth/providers lists github and google', async () => {
    const res = await unauthenticatedClient().get('/api/auth/providers');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.providers).toEqual([
      { id: 'github', configured: expect.any(Boolean) },
      { id: 'google', configured: expect.any(Boolean) },
    ]);
  });

  it.skipIf(!process.env.GITHUB_CLIENT_ID)(
    'GET /api/auth/github → 302 with Location to GitHub',
    async () => {
      const res = await unauthenticatedClient().get('/api/auth/github').redirects(0).expect(302);

      expect(res.headers.location).toMatch(/github\.com/);
    }
  );

  it.skipIf(!process.env.GOOGLE_CLIENT_ID)(
    'GET /api/auth/google → 302 with Location to Google',
    async () => {
      const res = await unauthenticatedClient().get('/api/auth/google').redirects(0).expect(302);

      expect(res.headers.location).toMatch(/accounts\.google\.com/);
    }
  );
});
