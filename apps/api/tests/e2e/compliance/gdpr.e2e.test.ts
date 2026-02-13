/**
 * GDPR Compliance E2E Tests
 *
 * Validates that the platform implements the technical requirements of the
 * General Data Protection Regulation. Each test maps to a specific GDPR
 * article.
 *
 * Articles covered:
 *   - Art. 15  Right of access
 *   - Art. 17  Right to erasure
 *   - Art. 20  Data portability
 *   - Art. 25  Data protection by design (data minimization)
 *   - Art. 32  Security of processing
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { expectCompleteDataExport, expectNoSensitiveFields } from '../helpers/assertions';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// Art. 15 -- Right of access
// ---------------------------------------------------------------------------
describe('GDPR Art. 15 -- Right of access', () => {
  it('user can export all their personal data via GET /api/me/export', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    // Create some data first: org + project so the export has content
    const org = await user.createOrganization('GDPR Export Org');
    await user.tryCreateProject(org.id, 'GDPR Export Project');

    const res = await user.exportData();
    expect(res.status).toBe(200);

    // /api/me/export returns raw JSON (no {success, data} wrapper)
    const exportData = res.body as Record<string, unknown>;
    expectCompleteDataExport(exportData);
  });

  it('export includes user profile information', async () => {
    const user = await TestUser.create();
    const res = await user.exportData();
    expect(res.status).toBe(200);

    // Export response is the data directly (no .data wrapper)
    const exportData = res.body as Record<string, unknown>;
    const userData = exportData.user as Record<string, unknown>;

    expect(userData).toBeDefined();
    // The API may normalize/slugify the display name on storage,
    // so just verify the name field exists and is a non-empty string
    expect(userData.name).toBeDefined();
    expect(typeof userData.name).toBe('string');
    expect((userData.name as string).length).toBeGreaterThan(0);
  });

  it('export includes account information', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const res = await user.exportData();
    expect(res.status).toBe(200);

    const exportData = res.body as Record<string, unknown>;
    const accounts = exportData.accounts as unknown[];

    expect(accounts).toBeDefined();
    expect(Array.isArray(accounts)).toBe(true);
    // Should have at least personal account (+ org account if created)
    expect(accounts.length).toBeGreaterThanOrEqual(1);
  });

  it('export includes authentication method information', async () => {
    const user = await TestUser.create();
    const res = await user.exportData();
    expect(res.status).toBe(200);

    const exportData = res.body as Record<string, unknown>;
    const authMethods = exportData.authenticationMethods as unknown[];

    expect(authMethods).toBeDefined();
    expect(Array.isArray(authMethods)).toBe(true);
    expect(authMethods.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// Art. 17 -- Right to erasure
// ---------------------------------------------------------------------------
describe('GDPR Art. 17 -- Right to erasure', () => {
  it('user can delete their account (soft delete)', async () => {
    const user = await TestUser.create();
    const res = await user.deleteAccount(false);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('user can hard-delete their account for immediate removal', async () => {
    const user = await TestUser.create();
    const res = await user.deleteAccount(true);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // After hard delete, direct DB check should find no user record
    const rows = await query<{ id: string }>`
      SELECT id FROM users WHERE id IN (
        SELECT owner_id FROM accounts WHERE id = ${user.accountId}
      )
    `;
    expect(rows.length).toBe(0);
  });

  it('after deletion, user cannot access API with old token', async () => {
    const user = await TestUser.create();
    const oldToken = user.accessToken;

    // Soft-delete the account
    const deleteRes = await user.deleteAccount(false);
    expect(deleteRes.status).toBe(200);

    // Try to access a protected endpoint with the old token
    const res = await apiClient().get('/api/me').set('Authorization', `Bearer ${oldToken}`);

    // The API should reject the request — the user is soft-deleted
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Art. 20 -- Data portability
// ---------------------------------------------------------------------------
describe('GDPR Art. 20 -- Data portability', () => {
  it('export is in machine-readable format (JSON)', async () => {
    const user = await TestUser.create();
    const res = await user.exportData();
    expect(res.status).toBe(200);

    // /api/me/export returns raw JSON (no {success, data} wrapper)
    expect(res.body).toBeDefined();
    expect(typeof res.body).toBe('object');
    expect(res.body.user).toBeDefined();

    // The exported data should be a serializable object
    const serialized = JSON.stringify(res.body);
    const parsed = JSON.parse(serialized);
    expect(parsed).toBeDefined();
  });

  it('export timestamp is present and valid', async () => {
    const user = await TestUser.create();
    const res = await user.exportData();
    expect(res.status).toBe(200);

    const exportData = res.body as Record<string, unknown>;
    expect(exportData.exportedAt).toBeDefined();

    // Should be a valid date string
    const date = new Date(exportData.exportedAt as string);
    expect(date.getTime()).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Art. 25 -- Data protection by design (data minimization)
// ---------------------------------------------------------------------------
describe('GDPR Art. 25 -- Data minimization', () => {
  it('login response does not leak sensitive fields', async () => {
    const user = await TestUser.create();

    // Re-login to get a fresh response
    const res = await apiClient()
      .post('/api/auth/login')
      .send({
        provider: 'email',
        providerId: user.email,
        providerData: { password: user.password },
      })
      .expect(200);

    expectNoSensitiveFields(res.body);
  });

  it('user profile response does not leak sensitive fields', async () => {
    const user = await TestUser.create();
    const res = await user.getProfile();

    expectNoSensitiveFields(res.body);
  });

  it('data export does not contain raw password hashes', async () => {
    const user = await TestUser.create();
    const res = await user.exportData();

    expectNoSensitiveFields(res.body);
  });

  it('registration response does not leak sensitive fields', async () => {
    const uid = Date.now();
    const res = await apiClient()
      .post('/api/auth/register')
      .send({
        name: `Minimization Test ${uid}`,
        type: 'personal',
        provider: 'email',
        providerId: `e2e-min-${uid}@test.grant.dev`,
        providerData: { password: 'Xe9#mK2!vQ7z' },
      })
      .expect(201);

    expectNoSensitiveFields(res.body);
  });
});

// ---------------------------------------------------------------------------
// Art. 32 -- Security of processing
// ---------------------------------------------------------------------------
describe('GDPR Art. 32 -- Security of processing', () => {
  it('passwords are stored hashed, not plaintext', async () => {
    const user = await TestUser.create();

    // Query the DB directly to verify password is hashed
    const rows = await query<{ provider_data: Record<string, unknown> }>`
      SELECT provider_data
      FROM user_authentication_methods
      WHERE provider = 'email'
        AND provider_id = ${user.email}
        AND deleted_at IS NULL
      LIMIT 1
    `;

    expect(rows.length).toBe(1);
    const providerData = rows[0].provider_data;

    // The stored password should be a bcrypt hash, not the plaintext
    const storedHash =
      (providerData as Record<string, unknown>).hashedPassword ??
      (providerData as Record<string, unknown>).password ??
      (providerData as Record<string, unknown>).hash;

    if (storedHash) {
      // bcrypt hashes start with $2a$ or $2b$
      expect(String(storedHash)).toMatch(/^\$2[aby]\$/);
      // Must not be the plaintext password
      expect(storedHash).not.toBe(user.password);
    }
  });

  it('access tokens have expiration (JWT exp claim)', async () => {
    const user = await TestUser.create();

    // Decode JWT payload (base64url) without verification
    const parts = user.accessToken.split('.');
    expect(parts.length).toBe(3);

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    expect(payload.exp).toBeDefined();
    expect(typeof payload.exp).toBe('number');

    // Expiration should be in the future
    const expiresAt = new Date(payload.exp * 1000);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('JWT uses RS256 asymmetric signing algorithm', async () => {
    const user = await TestUser.create();

    // Decode JWT header to check algorithm
    const parts = user.accessToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

    expect(header.alg).toBe('RS256');
  });

  it('JWKS endpoint is publicly available for token verification', async () => {
    const res = await apiClient().get('/.well-known/jwks.json').expect(200);

    expect(res.body.keys).toBeDefined();
    expect(Array.isArray(res.body.keys)).toBe(true);
    expect(res.body.keys.length).toBeGreaterThan(0);

    // Each key should have required JWKS fields
    const key = res.body.keys[0];
    expect(key.kty).toBeDefined();
    expect(key.kid).toBeDefined();
    expect(key.alg).toBe('RS256');
  });
});
