/**
 * Negative RBAC / Authorization Boundary Tests
 *
 * Validates that the API enforces role-based access controls and tenant
 * isolation. Users must not be able to access resources they are not
 * authorized for.
 *
 * Maps to:
 *   - SOC 2 CC6.1 (logical access, least privilege, separation)
 *   - SOC 2 CC6.2 (access removal)
 *   - ISO 27001 A.5.15 (access control)
 *   - ISO 27001 A.8.3 (information access restriction)
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// 1. Cross-tenant isolation
// ---------------------------------------------------------------------------
describe('Negative: Cross-tenant isolation', () => {
  it("user A cannot access user B's organization resources", async () => {
    // Create two separate users with their own orgs
    const userA = await TestUser.create({ withOrgAccount: true });
    const userB = await TestUser.create({ withOrgAccount: true });

    const orgA = await userA.createOrganization('Org A');
    const orgB = await userB.createOrganization('Org B');

    // User A tries to create a project in Org B → should be forbidden
    const res = await userA.tryCreateProject(orgB.id, 'Illegal Project');
    expect(res.status).toBe(403);

    // User B tries to create a project in Org A → should be forbidden
    const res2 = await userB.tryCreateProject(orgA.id, 'Illegal Project');
    expect(res2.status).toBe(403);
  });

  it("user cannot invite members to another user's organization", async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const outsider = await TestUser.create({ withOrgAccount: true });

    const org = await owner.createOrganization('Private Org');

    // Outsider tries to invite someone to the private org
    const res = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', outsider.authHeader)
      .send({
        scope: { id: org.id, tenant: 'organization' },
        email: `intruder-invite-${Date.now()}@test.grant.dev`,
        roleId: '00000000-0000-0000-0000-000000000000', // fake role, should fail on auth first
      });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 2. Scope manipulation
// ---------------------------------------------------------------------------
describe('Negative: Scope manipulation', () => {
  it('user cannot use a fabricated scope ID', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    // Try to create a project with a completely fabricated org ID
    const res = await user.tryCreateProject(
      '00000000-0000-0000-0000-999999999999',
      'Fabricated Scope Project'
    );

    // Should be rejected: 400 (invalid scope) or 403 (no role in scope)
    // Both are acceptable — the key point is the request is denied
    expect([400, 403]).toContain(res.status);
  });

  it("user cannot use another user's account scope", async () => {
    const userA = await TestUser.create({ withOrgAccount: true });
    const userB = await TestUser.create({ withOrgAccount: true });

    // User A tries to create org using user B's org account scope
    const res = await apiClient()
      .post('/api/organizations')
      .set('Authorization', userA.authHeader)
      .send({
        name: 'Stolen Scope Org',
        scope: { id: userB.orgAccountId, tenant: 'account' },
      });

    // Should fail: user A doesn't own user B's account
    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// 3. Privilege escalation prevention
// ---------------------------------------------------------------------------
describe('Negative: Privilege escalation', () => {
  it('non-member cannot access organization endpoints', async () => {
    const owner = await TestUser.create({ withOrgAccount: true });
    const nonMember = await TestUser.create({ withOrgAccount: true });

    const org = await owner.createOrganization('Members Only Org');

    // Non-member tries to list org members
    const res = await apiClient()
      .get('/api/organization-members')
      .query({ scopeId: org.id, tenant: 'organization' })
      .set('Authorization', nonMember.authHeader);

    expect(res.status).toBe(403);
  });

  it("user cannot read another user's profile data via user endpoint", async () => {
    const userA = await TestUser.create();
    const userB = await TestUser.create();

    // GET /api/me returns { data: { accounts: [{ owner: { id } }] } }
    const profileA = await userA.getProfile();
    const accounts = (profileA.body.data as Record<string, unknown>)?.accounts as
      | Array<Record<string, unknown>>
      | undefined;
    const userIdA = (accounts?.[0]?.owner as Record<string, unknown>)?.id;

    if (userIdA) {
      // User B tries to access user A's data via admin-style endpoint
      const res = await apiClient()
        .get(`/api/users/${userIdA}`)
        .set('Authorization', userB.authHeader);

      // Should be rejected: 400 (missing scope), 401 (unauthorized), or 403 (forbidden)
      // All mean the access attempt is denied
      expect([400, 401, 403]).toContain(res.status);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Resource access after state changes
// ---------------------------------------------------------------------------
describe('Negative: Access after state changes', () => {
  it('deleted account token should not grant access', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const savedToken = user.accessToken;

    // Delete the account
    await user.deleteAccount();

    // Try to access profile with the old token -- should fail
    const res = await apiClient().get('/api/me').set('Authorization', `Bearer ${savedToken}`);

    // After deletion, the token should be invalid (session revoked)
    // or the user should not be found
    expect([401, 403, 404]).toContain(res.status);
  });
});
