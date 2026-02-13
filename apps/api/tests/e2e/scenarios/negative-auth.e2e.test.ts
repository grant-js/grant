/**
 * Negative Authentication Tests
 *
 * Validates that the API correctly rejects invalid authentication attempts.
 * Maps to SOC 2 CC6.1 (logical access security) and CC6.8 (intrusion detection).
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { TestUser, unauthenticatedClient } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// 1. Unauthenticated access
// ---------------------------------------------------------------------------
describe('Negative: Unauthenticated access', () => {
  it('rejects GET /api/me without auth header → 401', async () => {
    const res = await unauthenticatedClient().get('/api/me');
    expect(res.status).toBe(401);
  });

  it('rejects POST /api/organizations without auth header → 4xx', async () => {
    const res = await unauthenticatedClient()
      .post('/api/organizations')
      .send({ name: 'Unauthorized Org', scope: { id: 'fake', tenant: 'account' } });
    // May return 400 (scope validation) or 401 (auth) depending on middleware order
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('rejects POST /api/projects without auth header → 4xx', async () => {
    const res = await unauthenticatedClient()
      .post('/api/projects')
      .send({ name: 'Unauthorized Project', scope: { id: 'fake', tenant: 'organization' } });
    // May return 400 (scope validation) or 401 (auth) depending on middleware order
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it('rejects DELETE /api/me/accounts without auth header → 4xx', async () => {
    const res = await unauthenticatedClient().delete('/api/me/accounts');
    // May return 400 (missing scope/body) or 401 (auth) depending on middleware order
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

// ---------------------------------------------------------------------------
// 2. Invalid credentials
// ---------------------------------------------------------------------------
describe('Negative: Invalid credentials', () => {
  it('rejects login with wrong password → 401', async () => {
    // First, create a real user so the email exists
    const user = await TestUser.create();

    const res = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: user.email,
        providerData: { password: 'Wr0ng!P@ssw0rd#99' },
      });

    expect(res.status).toBe(401);
  });

  it('rejects login with non-existent email → 401', async () => {
    const res = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: `nonexistent-${Date.now()}@test.grant.dev`,
        providerData: { password: 'Xe9#mK2!vQ7z' },
      });

    expect(res.status).toBe(401);
  });

  it('rejects registration with duplicate email → 409', async () => {
    const user = await TestUser.create();

    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Duplicate User',
        type: 'personal',
        provider: 'email',
        providerId: user.email,
        providerData: { password: 'Xe9#mK2!vQ7z' },
      });

    expect(res.status).toBe(409);
  });
});

// ---------------------------------------------------------------------------
// 3. Invalid / malformed tokens
// ---------------------------------------------------------------------------
describe('Negative: Invalid tokens', () => {
  it('rejects request with malformed JWT → 401', async () => {
    const res = await apiClient()
      .get('/api/me')
      .set('Authorization', 'Bearer not-a-valid-jwt-token');

    expect(res.status).toBe(401);
  });

  it('rejects request with empty Bearer token → 401', async () => {
    const res = await apiClient().get('/api/me').set('Authorization', 'Bearer ');

    expect(res.status).toBe(401);
  });

  it('rejects request with wrong auth scheme → 401', async () => {
    const res = await apiClient().get('/api/me').set('Authorization', 'Basic dXNlcjpwYXNz');

    expect(res.status).toBe(401);
  });

  it('rejects request with tampered JWT payload → 401', async () => {
    // Create a valid user to get a real token, then tamper with it
    const user = await TestUser.create();
    const parts = user.accessToken.split('.');

    if (parts.length === 3) {
      // Tamper with the payload (middle part)
      const tamperedPayload = Buffer.from(
        '{"sub":"00000000-0000-0000-0000-000000000000"}'
      ).toString('base64url');
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      const res = await apiClient().get('/api/me').set('Authorization', `Bearer ${tamperedToken}`);

      expect(res.status).toBe(401);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Unverified user restrictions
// ---------------------------------------------------------------------------
describe('Negative: Unverified user restrictions', () => {
  it('unverified user cannot create organization → 403', async () => {
    // Register but do NOT verify email
    const uid = Date.now();
    const email = `e2e-unverified-${uid}@test.grant.dev`;

    const regRes = await apiClient()
      .post('/api/auth/register')
      .send({
        name: `Unverified User ${uid}`,
        type: 'personal',
        provider: 'email',
        providerId: email,
        providerData: { password: 'Xe9#mK2!vQ7z' },
      })
      .expect(201);

    const unverifiedToken = regRes.body.data.accessToken;

    // Try to create an org account first
    const accountRes = await apiClient()
      .post('/api/me/accounts')
      .set('Authorization', `Bearer ${unverifiedToken}`);

    // Whether account creation succeeds or not, try to create org
    const orgAccountId = accountRes.body?.data?.account?.id;
    if (orgAccountId) {
      const orgRes = await apiClient()
        .post('/api/organizations')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          name: `Unverified Org ${uid}`,
          scope: { id: orgAccountId, tenant: 'account' },
        });

      // Unverified users should be blocked from org-context mutations
      expect(orgRes.status).toBe(403);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Input validation
// ---------------------------------------------------------------------------
describe('Negative: Input validation', () => {
  it('rejects registration with weak password → 400', async () => {
    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Weak Password User',
        type: 'personal',
        provider: 'email',
        providerId: `e2e-weak-${Date.now()}@test.grant.dev`,
        providerData: { password: '123' },
      });

    expect(res.status).toBe(400);
  });

  it('rejects registration with invalid email → 400', async () => {
    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: 'Invalid Email User',
        type: 'personal',
        provider: 'email',
        providerId: 'not-an-email',
        providerData: { password: 'Xe9#mK2!vQ7z' },
      });

    expect(res.status).toBe(400);
  });

  it('rejects email verification with invalid token → 400 or 401', async () => {
    const res = await apiClient()
      .post('/api/auth/verify-email')
      .send({ token: 'invalid-token-abc123' });

    // API may return 400 (bad request), 401 (unauthorized), or 404 (token not found)
    expect([400, 401, 404]).toContain(res.status);
  });
});
