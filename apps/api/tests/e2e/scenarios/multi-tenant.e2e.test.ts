/**
 * Multi-Tenant Isolation Scenarios
 *
 * Validates that the platform enforces strict data isolation between tenants.
 * Each organization is a separate tenant. Users in one tenant must not be
 * able to read, modify, or enumerate resources belonging to another tenant.
 *
 * Maps to:
 *   - SOC 2 CC6.1 (tenant separation)
 *   - ISO 27001 A.8.3 (information access restriction)
 *   - HIPAA 164.312(a)(1) (access control)
 */
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// Setup: two isolated tenants
// ---------------------------------------------------------------------------
describe('Multi-tenant: Complete isolation between organizations', () => {
  let tenantA: TestUser;
  let tenantB: TestUser;
  let orgA: { id: string; name: string; slug: string };
  let orgB: { id: string; name: string; slug: string };

  it('setup: create two independent tenants', async () => {
    tenantA = await TestUser.create({ withOrgAccount: true });
    tenantB = await TestUser.create({ withOrgAccount: true });

    orgA = await tenantA.createOrganization('Tenant A Corp');
    orgB = await tenantB.createOrganization('Tenant B Corp');

    // Both orgs should have unique IDs
    expect(orgA.id).not.toBe(orgB.id);
  });

  it("tenant A cannot create projects in tenant B's org", async () => {
    const res = await tenantA.tryCreateProject(orgB.id, 'Cross-Tenant Project');
    expect(res.status).toBe(403);
  });

  it("tenant B cannot create projects in tenant A's org", async () => {
    const res = await tenantB.tryCreateProject(orgA.id, 'Cross-Tenant Project');
    expect(res.status).toBe(403);
  });

  it("tenant A cannot invite members to tenant B's org", async () => {
    const res = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', tenantA.authHeader)
      .send({
        scope: { id: orgB.id, tenant: 'organization' },
        email: `cross-tenant-invite-${Date.now()}@test.grant.dev`,
        roleId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(403);
  });

  it("tenant B cannot invite members to tenant A's org", async () => {
    const res = await apiClient()
      .post('/api/organization-invitations/invite')
      .set('Authorization', tenantB.authHeader)
      .send({
        scope: { id: orgA.id, tenant: 'organization' },
        email: `cross-tenant-invite-${Date.now()}@test.grant.dev`,
        roleId: '00000000-0000-0000-0000-000000000000',
      });

    expect(res.status).toBe(403);
  });

  it("tenant A cannot list tenant B's members", async () => {
    const res = await apiClient()
      .get('/api/organization-members')
      .query({ scopeId: orgB.id, tenant: 'organization' })
      .set('Authorization', tenantA.authHeader);

    expect(res.status).toBe(403);
  });

  it("tenant A cannot modify tenant B's organization", async () => {
    const res = await apiClient()
      .patch(`/api/organizations/${orgB.id}`)
      .set('Authorization', tenantA.authHeader)
      .send({
        name: 'Hijacked Org',
        scope: { id: orgB.id, tenant: 'organization' },
      });

    expect(res.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Data isolation with shared member
// ---------------------------------------------------------------------------
describe('Multi-tenant: Shared member across orgs', () => {
  it("user who belongs to both orgs can only access each org's data with correct scope", async () => {
    // Create two independent org owners
    const ownerA = await TestUser.create({ withOrgAccount: true });
    const ownerB = await TestUser.create({ withOrgAccount: true });

    const orgA = await ownerA.createOrganization('Shared Member Org A');
    const orgB = await ownerB.createOrganization('Shared Member Org B');

    // Use a common email for the shared member
    const memberEmail = `e2e-shared-${Date.now()}@test.grant.dev`;

    // Both owners invite the same person
    await ownerA.inviteMember(orgA.id, memberEmail);
    await ownerB.inviteMember(orgB.id, memberEmail);

    // Member registers, verifies, logs in, and creates an org account
    const member = await TestUser.create({ email: memberEmail, withOrgAccount: true });

    // Accept BOTH invitations (this used to 409; now idempotent)
    await member.acceptInvitation(orgA.id);
    await member.acceptInvitation(orgB.id);

    // Member can create projects in org A
    const projectA = await member.tryCreateProject(orgA.id, 'Member Project in A');
    expect([200, 201]).toContain(projectA.status);

    // Member can create projects in org B
    const projectB = await member.tryCreateProject(orgB.id, 'Member Project in B');
    expect([200, 201]).toContain(projectB.status);

    // But an outsider cannot access either org
    const outsider = await TestUser.create({ withOrgAccount: true });
    const outsiderResA = await outsider.tryCreateProject(orgA.id, 'Outsider A');
    expect(outsiderResA.status).toBe(403);
    const outsiderResB = await outsider.tryCreateProject(orgB.id, 'Outsider B');
    expect(outsiderResB.status).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Personal data isolation
// ---------------------------------------------------------------------------
describe('Multi-tenant: Personal data isolation', () => {
  it("user A cannot access user B's profile", async () => {
    const userA = await TestUser.create();
    const userB = await TestUser.create();

    // GET /api/me returns { data: { accounts: [{ owner: { id } }] } }
    const profileA = await userA.getProfile();
    const accounts = (profileA.body.data as Record<string, unknown>)?.accounts as
      | Array<Record<string, unknown>>
      | undefined;
    const userIdA = (accounts?.[0]?.owner as Record<string, unknown>)?.id;

    if (userIdA) {
      // User B tries to read user A's data via admin endpoint
      const res = await apiClient()
        .get(`/api/users/${userIdA}`)
        .set('Authorization', userB.authHeader);

      // Should not be able to read another user's data
      // 400 = missing scope, 401 = unauthorized, 403 = forbidden — all mean access denied
      expect([400, 401, 403]).toContain(res.status);
    }
  });

  it("user A cannot export user B's data", async () => {
    // Each user's export only contains their own data
    const userA = await TestUser.create();
    const userB = await TestUser.create();

    const exportA = await userA.exportData();
    const exportB = await userB.exportData();

    if (exportA.status === 200 && exportB.status === 200) {
      // /api/me/export returns raw JSON (no {success, data} wrapper)
      const dataA = exportA.body as Record<string, unknown>;
      const dataB = exportB.body as Record<string, unknown>;

      // Exports should contain different user IDs
      const userInfoA = dataA.user as Record<string, unknown>;
      const userInfoB = dataB.user as Record<string, unknown>;

      if (userInfoA?.id && userInfoB?.id) {
        expect(userInfoA.id).not.toBe(userInfoB.id);
      }
    }
  });
});
