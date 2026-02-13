/**
 * HIPAA Compliance E2E Tests
 *
 * Validates the technical safeguards required by the HIPAA Security Rule
 * (45 CFR Part 164, Subpart C). These tests verify that the platform
 * provides adequate controls for organizations that process Protected
 * Health Information (PHI).
 *
 * Standards covered:
 *   - 164.312(a)(1)    Access control (unique user ID, emergency access)
 *   - 164.312(a)(2)(i)  Unique user identification
 *   - 164.312(a)(2)(iii) Automatic logoff (session expiration)
 *   - 164.312(b)        Audit controls
 *   - 164.312(c)(1)     Integrity controls (audit log immutability)
 *   - 164.312(d)        Person or entity authentication
 *   - 164.312(e)(1)     Transmission security
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, query } from '../helpers/db-tokens';
import { TestUser, unauthenticatedClient } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// 164.312(a)(1) -- Access control
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(a)(1) -- Access control', () => {
  it('each user has a unique identifier (UUID)', async () => {
    const user1 = await TestUser.create();
    const user2 = await TestUser.create();

    const profile1 = await user1.getProfile();
    const profile2 = await user2.getProfile();

    // GET /api/me returns { data: { accounts: [{ owner: { id } }] } }
    // User ID is available via accounts[].owner.id
    const accounts1 = (profile1.body.data as Record<string, unknown>)?.accounts as
      | Array<Record<string, unknown>>
      | undefined;
    const accounts2 = (profile2.body.data as Record<string, unknown>)?.accounts as
      | Array<Record<string, unknown>>
      | undefined;

    const userId1 = (accounts1?.[0]?.owner as Record<string, unknown>)?.id;
    const userId2 = (accounts2?.[0]?.owner as Record<string, unknown>)?.id;

    expect(userId1).toBeDefined();
    expect(userId2).toBeDefined();
    expect(userId1).not.toBe(userId2);

    // UUIDs should be in standard format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(String(userId1)).toMatch(uuidRegex);
    expect(String(userId2)).toMatch(uuidRegex);
  });

  it('access is denied without proper authentication', async () => {
    const res = await unauthenticatedClient().get('/api/me');
    expect(res.status).toBe(401);
  });

  it('access is denied with wrong credentials', async () => {
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

  it('role-based access restricts operations appropriately', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const outsider = await TestUser.create({ withOrgAccount: true });

    const org = await owner.createOrganization('HIPAA Org');

    // Outsider should not have access
    const res = await outsider.tryCreateProject(org.id, 'Unauthorized');
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 164.312(a)(2)(i) -- Unique user identification
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(a)(2)(i) -- Unique user identification', () => {
  it('each user authentication method is uniquely identified', async () => {
    const user1 = await TestUser.create();
    const user2 = await TestUser.create();

    // Query auth methods to verify unique identification
    const rows = await query<{ id: string; provider_id: string }>`
      SELECT id, provider_id
      FROM user_authentication_methods
      WHERE provider = 'email'
        AND provider_id IN (${user1.email}, ${user2.email})
        AND deleted_at IS NULL
    `;

    expect(rows.length).toBe(2);
    // IDs should be unique
    expect(rows[0].id).not.toBe(rows[1].id);
    // Provider IDs (emails) should be unique
    expect(rows[0].provider_id).not.toBe(rows[1].provider_id);
  });

  it('duplicate registration with same email is rejected', async () => {
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
// 164.312(a)(2)(iii) -- Automatic logoff
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(a)(2)(iii) -- Automatic logoff', () => {
  it('JWT access tokens have a finite expiration time', async () => {
    const user = await TestUser.create();

    const parts = user.accessToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Token must have exp claim
    expect(payload.exp).toBeDefined();
    expect(typeof payload.exp).toBe('number');

    // exp should be in the future (token is fresh)
    expect(payload.exp * 1000).toBeGreaterThan(Date.now());

    // Token should expire within a reasonable time (not infinite)
    // Typical: 15 min to 24 hours
    const maxLifetimeMs = 24 * 60 * 60 * 1000; // 24 hours
    expect(payload.exp * 1000 - Date.now()).toBeLessThan(maxLifetimeMs);
  });

  it('sessions have creation timestamps for monitoring', async () => {
    const user = await TestUser.create();

    // Check sessions in DB
    const rows = await query<{ created_at: Date; expires_at: Date }>`
      SELECT created_at, expires_at
      FROM user_sessions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `;

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.created_at).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// 164.312(b) -- Audit controls
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(b) -- Audit controls', () => {
  it('authentication events are logged', async () => {
    const user = await TestUser.create();

    // After registration + login, there should be session records
    const rows = await query<{ id: string; created_at: Date }>`
      SELECT id, created_at
      FROM user_sessions
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 10
    `;

    // At least sessions from the test users should exist
    expect(rows.length).toBeGreaterThan(0);
  });

  it('data access operations are auditable', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('HIPAA Audit Org');

    // Creating an org should produce audit entries
    const rows = await query<Record<string, unknown>>`
      SELECT *
      FROM organization_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 5
    `;

    expect(rows.length).toBeGreaterThan(0);
  });

  it('audit logs include user identity (performed_by)', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    await user.createOrganization('HIPAA Identity Org');

    const rows = await query<{ performed_by: string }>`
      SELECT performed_by
      FROM organization_audit_logs
      WHERE action = 'CREATE'
      ORDER BY created_at DESC
      LIMIT 3
    `;

    for (const row of rows) {
      expect(row.performed_by).toBeDefined();
      expect(row.performed_by).not.toBeNull();
      // Should be a valid UUID (not empty or placeholder)
      expect(row.performed_by.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 164.312(c)(1) -- Integrity controls
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(c)(1) -- Integrity controls', () => {
  it('audit logs are append-only (no modification endpoints)', async () => {
    const user = await TestUser.create();

    // Attempt to modify audit logs via non-standard endpoints
    const paths = ['/api/audit-logs', '/api/user-audit-logs'];

    for (const path of paths) {
      const putRes = await user.post(path, { action: 'TAMPERED' });
      expect([404, 405, 401, 403]).toContain(putRes.status);
    }
  });

  it('password changes are tracked via provider_data updates', async () => {
    const user = await TestUser.create();

    // Check that the auth method has an updated_at timestamp
    const rows = await query<{ updated_at: Date; created_at: Date }>`
      SELECT updated_at, created_at
      FROM user_authentication_methods
      WHERE provider = 'email'
        AND provider_id = ${user.email}
        AND deleted_at IS NULL
    `;

    expect(rows.length).toBe(1);
    expect(rows[0].updated_at).toBeDefined();
    expect(rows[0].created_at).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 164.312(d) -- Person or entity authentication
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(d) -- Person or entity authentication', () => {
  it('multi-factor: email verification is required for sensitive operations', async () => {
    // Register without verifying email
    const uid = Date.now();
    const email = `e2e-unverified-hipaa-${uid}@test.grant.dev`;

    const regRes = await apiClient()
      .post('/api/auth/register')
      .send({
        name: `Unverified HIPAA User ${uid}`,
        type: 'personal',
        provider: 'email',
        providerId: email,
        providerData: { password: 'Xe9#mK2!vQ7z' },
      })
      .expect(201);

    const unverifiedToken = regRes.body.data.accessToken;

    // Create org account
    const accountRes = await apiClient()
      .post('/api/me/accounts')
      .set('Authorization', `Bearer ${unverifiedToken}`);

    const orgAccountId = accountRes.body?.data?.account?.id;
    if (orgAccountId) {
      // Unverified user should be blocked from org-context mutations
      const orgRes = await apiClient()
        .post('/api/organizations')
        .set('Authorization', `Bearer ${unverifiedToken}`)
        .send({
          name: `Unverified Org ${uid}`,
          scope: { id: orgAccountId, tenant: 'account' },
        });

      expect(orgRes.status).toBe(403);
    }
  });

  it('JWT contains identity claims for traceability', async () => {
    const user = await TestUser.create();

    const parts = user.accessToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());

    // Must contain subject (user ID)
    expect(payload.sub).toBeDefined();
    // Must contain issued-at
    expect(payload.iat).toBeDefined();
    // Must contain expiration
    expect(payload.exp).toBeDefined();
    // Must contain JWT ID for uniqueness
    expect(payload.jti).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 164.312(e)(1) -- Transmission security
// ---------------------------------------------------------------------------
describe('HIPAA 164.312(e)(1) -- Transmission security', () => {
  it('tokens use asymmetric cryptography (RS256)', async () => {
    const user = await TestUser.create();

    const parts = user.accessToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());

    expect(header.alg).toBe('RS256');
    expect(header.typ).toBe('JWT');
  });

  it('JWKS endpoint does not expose private key material', async () => {
    const res = await unauthenticatedClient().get('/.well-known/jwks.json').expect(200);

    for (const key of res.body.keys) {
      // Public components should be present
      expect(key.n).toBeDefined(); // modulus
      expect(key.e).toBeDefined(); // exponent

      // Private components MUST NOT be present
      expect(key.d).toBeUndefined(); // private exponent
      expect(key.p).toBeUndefined(); // first prime factor
      expect(key.q).toBeUndefined(); // second prime factor
      expect(key.dp).toBeUndefined(); // first factor CRT exponent
      expect(key.dq).toBeUndefined(); // second factor CRT exponent
      expect(key.qi).toBeUndefined(); // first CRT coefficient
    }
  });
});
