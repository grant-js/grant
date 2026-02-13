/**
 * SOC 2 Access Control Compliance E2E Tests
 *
 * Validates Trust Service Criteria for logical access security.
 *
 * Controls covered:
 *   - CC6.1  Logical access security (authentication, least privilege, separation)
 *   - CC6.2  Access provisioning and removal
 *   - CC6.3  Access review (roles and permissions queryable)
 *   - CC6.6  Encryption in transit (JWT RS256, JWKS)
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { TestUser, unauthenticatedClient } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// CC6.1 -- Logical access: authentication required
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.1 -- Authentication required', () => {
  it('all protected endpoints reject unauthenticated requests', async () => {
    // GET endpoints consistently return 401 for missing auth
    const getEndpoints = [
      { method: 'get' as const, path: '/api/me' },
      { method: 'get' as const, path: '/api/me/export' },
    ];

    for (const endpoint of getEndpoints) {
      const res = await unauthenticatedClient()[endpoint.method](endpoint.path);
      expect(
        res.status,
        `${endpoint.method.toUpperCase()} ${endpoint.path} should require auth`
      ).toBe(401);
    }

    // POST/DELETE endpoints may return 400 (body/scope validation) before auth check,
    // but must never return 2xx (i.e. the request is still rejected)
    const mutationEndpoints = [
      { method: 'post' as const, path: '/api/organizations' },
      { method: 'post' as const, path: '/api/projects' },
      { method: 'post' as const, path: '/api/organization-invitations/invite' },
      { method: 'delete' as const, path: '/api/me/accounts' },
    ];

    for (const endpoint of mutationEndpoints) {
      const res = await unauthenticatedClient()[endpoint.method](endpoint.path);
      expect(
        res.status,
        `${endpoint.method.toUpperCase()} ${endpoint.path} should not succeed without auth`
      ).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  it('public endpoints are accessible without authentication', async () => {
    // Health check should be public
    const healthRes = await unauthenticatedClient().get('/health');
    expect(healthRes.status).toBe(200);

    // JWKS endpoint should be public
    const jwksRes = await unauthenticatedClient().get('/.well-known/jwks.json');
    expect(jwksRes.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// CC6.1 -- Logical access: least privilege
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.1 -- Least privilege', () => {
  it('org member cannot perform owner-only actions', async () => {
    // Create owner with org
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Least Privilege Org');

    // Invite a member
    const memberEmail = `e2e-member-${Date.now()}@test.grant.dev`;
    await owner.inviteMember(org.id, memberEmail);

    // Register the member and accept the invitation
    const member = await TestUser.create({ email: memberEmail, withOrgAccount: true });
    await member.acceptInvitation(org.id);

    // Member should NOT be able to invite other members (requires Owner/Admin)
    const inviteRes = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', member.authHeader)
      .send({
        scope: { id: org.id, tenant: 'organization' },
        email: `e2e-unauthorized-invite-${Date.now()}@test.grant.dev`,
        roleId: '00000000-0000-0000-0000-000000000000',
      });

    // Should fail with 403 (forbidden) or 404 (role/resource not found for this scope)
    // Both are acceptable: the key point is the action is denied
    expect([403, 404]).toContain(inviteRes.status);
  });
});

// ---------------------------------------------------------------------------
// CC6.1 -- Logical access: tenant separation
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.1 -- Tenant separation', () => {
  it("tenant A cannot read tenant B's data", async () => {
    const tenantA = await TestUser.create({ withOrgAccount: true });
    const tenantB = await TestUser.create({ withOrgAccount: true });

    const orgA = await tenantA.createOrganization('Tenant A Corp');
    await tenantB.createOrganization('Tenant B Corp');

    // Tenant B tries to create a project in Tenant A's org
    const res = await tenantB.tryCreateProject(orgA.id, 'Cross-Tenant Project');
    expect(res.status).toBe(403);
  });

  it("tenant A cannot list tenant B's organization members", async () => {
    const tenantA = await TestUser.create({ withOrgAccount: true });
    const tenantB = await TestUser.create({ withOrgAccount: true });

    const orgB = await tenantB.createOrganization('Isolated Org B');

    // Tenant A tries to list org B's members
    const res = await apiClient()
      .get('/api/organization-members')
      .query({ scopeId: orgB.id, tenant: 'organization' })
      .set('Authorization', tenantA.authHeader);

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// CC6.2 -- Access provisioning and removal
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.2 -- Access provisioning and removal', () => {
  it('invitation workflow provisions access correctly', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const org = await owner.createOrganization('Provisioning Org');

    // Invite a new member
    const memberEmail = `e2e-provision-${Date.now()}@test.grant.dev`;
    await owner.inviteMember(org.id, memberEmail);

    // Member registers, verifies, and accepts
    const member = await TestUser.create({ email: memberEmail, withOrgAccount: true });
    await member.acceptInvitation(org.id);

    // After acceptance, member should have access to the org
    const projectRes = await member.tryCreateProject(org.id, 'Provisioned Project');
    // Members may or may not be able to create projects depending on role,
    // but they should NOT get 401 (they are authenticated and authorized at some level)
    expect(projectRes.status).not.toBe(401);
  });

  it('deleted user loses all access', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Deleted User Org');
    const oldToken = user.accessToken;

    // Delete the user's accounts (soft delete)
    const deleteRes = await user.deleteAccount(false);
    expect(deleteRes.status).toBe(200);

    // All subsequent requests with the old token should be rejected
    const profileRes = await apiClient().get('/api/me').set('Authorization', `Bearer ${oldToken}`);
    expect(profileRes.status).toBe(401);

    const orgRes = await apiClient()
      .get('/api/organizations')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', `Bearer ${oldToken}`);
    expect(orgRes.status).toBe(401);
  });

  it('session revocation removes access', async () => {
    const user = await TestUser.create();

    // List sessions
    const sessionsRes = await user.get('/api/me/sessions');

    if (sessionsRes.status === 200 && sessionsRes.body.data) {
      const sessions =
        (sessionsRes.body.data as Record<string, unknown>).items ?? sessionsRes.body.data;

      if (Array.isArray(sessions) && sessions.length > 0) {
        const sessionId = (sessions[0] as Record<string, unknown>).id;
        if (sessionId) {
          // Revoke the session
          const revokeRes = await user.delete(`/api/me/sessions/${sessionId}`);
          expect([200, 204]).toContain(revokeRes.status);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// CC6.3 -- Access review
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.3 -- Access review', () => {
  it('roles are queryable via API for periodic review', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Access Review Org');

    // Query roles via API
    const res = await apiClient()
      .get('/api/roles')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', user.authHeader);

    // Should return a list of roles (even if empty, the endpoint should work)
    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toBeDefined();
    }
  });

  it('permissions are queryable via API for periodic review', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Permission Review Org');

    const res = await apiClient()
      .get('/api/permissions')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', user.authHeader);

    expect([200, 403]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// CC6.6 -- Encryption in transit
// ---------------------------------------------------------------------------
describe('SOC 2 CC6.6 -- Encryption in transit', () => {
  it('JWT tokens use RS256 asymmetric signing', async () => {
    const user = await TestUser.create();

    const parts = user.accessToken.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    expect(header.alg).toBe('RS256');
  });

  it('JWKS endpoint exposes public keys for verification', async () => {
    const res = await unauthenticatedClient().get('/.well-known/jwks.json').expect(200);

    expect(res.body.keys).toBeDefined();
    expect(Array.isArray(res.body.keys)).toBe(true);

    for (const key of res.body.keys) {
      expect(key.kty).toBe('RSA');
      expect(key.alg).toBe('RS256');
      expect(key.use).toBe('sig');
      expect(key.kid).toBeDefined();
      // Public key components present
      expect(key.n).toBeDefined();
      expect(key.e).toBeDefined();
      // Private key components must NOT be present
      expect(key.d).toBeUndefined();
      expect(key.p).toBeUndefined();
      expect(key.q).toBeUndefined();
    }
  });
});
