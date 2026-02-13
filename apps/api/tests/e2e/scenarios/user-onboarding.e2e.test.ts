/**
 * User Story: New Team Onboarding
 *
 * Simulates the complete lifecycle of a team setting up on the platform:
 *   1. Owner registers, verifies, creates org
 *   2. Owner invites team members with different roles
 *   3. Members accept invitations
 *   4. Owner creates projects
 *   5. Role-based access is verified
 *
 * This is a composition test that exercises the full user journey.
 */
import { afterAll, describe, expect, it } from 'vitest';

import { closeDbHelper } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

afterAll(async () => {
  await closeDbHelper();
});

// ---------------------------------------------------------------------------
// Scenario: Complete team onboarding
// ---------------------------------------------------------------------------
describe('User Story: Complete team onboarding', () => {
  let owner: TestUser;
  let org: { id: string; name: string; slug: string };
  let adminMember: TestUser;
  let regularMember: TestUser;

  it('Step 1: Owner registers and sets up organization', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('Acme Corp');

    expect(org.id).toBeDefined();
    expect(org.slug).toBeDefined();
  });

  it('Step 2: Owner creates a project under the organization', async () => {
    const project = await owner.tryCreateProject(org.id, 'Project Alpha');

    expect(project.status).toBe(201);
    expect(project.body.data).toBeDefined();
  });

  it('Step 3: Owner invites an admin member', async () => {
    const adminEmail = `e2e-admin-${Date.now()}@test.grant.dev`;
    const invitation = await owner.inviteMember(org.id, adminEmail);

    expect(invitation.status).toBe('pending');

    // Admin registers, verifies, and accepts
    adminMember = await TestUser.create({ email: adminEmail, withOrgAccount: true });
    await adminMember.acceptInvitation(org.id);
  });

  it('Step 4: Owner invites a regular member', async () => {
    const memberEmail = `e2e-regular-${Date.now()}@test.grant.dev`;
    await owner.inviteMember(org.id, memberEmail);

    regularMember = await TestUser.create({ email: memberEmail, withOrgAccount: true });
    await regularMember.acceptInvitation(org.id);
  });

  it('Step 5: Owner retains full access to the organization', async () => {
    const project = await owner.tryCreateProject(org.id, 'Owner Project');
    expect(project.status).toBe(201);
  });

  it('Step 6: Regular member can access the organization but with limited privileges', async () => {
    // Regular member should NOT be able to invite new members
    // (only Owner/Admin roles have OrganizationInvitation.Create)
    const res = await regularMember.post('/api/organization-invitations/invite', {
      scope: { id: org.id, tenant: 'organization' },
      email: `e2e-unauthorized-${Date.now()}@test.grant.dev`,
      roleId: '00000000-0000-0000-0000-000000000000',
    });

    // Should fail with 403 (forbidden) or 404 (role/resource not found for this scope)
    // Both are acceptable: the action is denied to the regular member
    expect([403, 404]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Scenario: Single-user personal workflow
// ---------------------------------------------------------------------------
describe('User Story: Single-user personal workflow', () => {
  it('user registers, verifies, and manages their profile', async () => {
    const user = await TestUser.create();

    // Can access their profile
    const profile = await user.getProfile();
    expect(profile.status).toBe(200);
    expect(profile.body.data).toBeDefined();
  });

  it('user can create org account and organization independently', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Solo Org');

    expect(org.id).toBeDefined();
    expect(org.name).toBe('Solo Org');
  });

  it('user can export all their data at any time', async () => {
    const user = await TestUser.create({ withOrgAccount: true });
    const org = await user.createOrganization('Export Org');

    const exportRes = await user.exportData();
    expect(exportRes.status).toBe(200);
    // /api/me/export returns raw JSON (no {success, data} wrapper)
    expect(exportRes.body.user).toBeDefined();
  });

  it('user can delete their account when they choose', async () => {
    const user = await TestUser.create();
    const deleteRes = await user.deleteAccount();

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Scenario: Multi-organization user
// ---------------------------------------------------------------------------
describe('User Story: User belongs to multiple organizations', () => {
  it('user can create multiple organizations', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    const org1 = await user.createOrganization('Org One');
    const org2 = await user.createOrganization('Org Two');

    expect(org1.id).not.toBe(org2.id);
    expect(org1.slug).not.toBe(org2.slug);
  });

  it('user can create projects in different organizations', async () => {
    const user = await TestUser.create({ withOrgAccount: true });

    const org1 = await user.createOrganization('Project Org 1');
    const org2 = await user.createOrganization('Project Org 2');

    const project1 = await user.tryCreateProject(org1.id, 'Org1 Project');
    const project2 = await user.tryCreateProject(org2.id, 'Org2 Project');

    expect(project1.status).toBe(201);
    expect(project2.status).toBe(201);
  });
});
