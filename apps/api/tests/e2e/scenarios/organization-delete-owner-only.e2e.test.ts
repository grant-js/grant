/**
 * E2E: deleting an organization is owner-only.
 *
 * `Organization:delete` belongs to the Organization Owner group and to no other
 * organization role. An Admin is refused through both transports, the
 * organization survives the refused attempts, and the Owner can delete it.
 *
 * Prerequisites: E2E stack running, DB migrated and seeded.
 */
import { DeleteOrganizationDocument } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_ADMIN = 'roles.names.organizationAdmin';

interface DeleteOrganizationData {
  deleteOrganization?: { id: string; name: string } | null;
}

afterAll(async () => {
  await closeDbHelper();
});

function restDeletePath(organizationId: string): string {
  return `/api/organizations/${organizationId}?tenant=organization&scopeId=${organizationId}`;
}

async function isOrganizationLive(organizationId: string): Promise<boolean> {
  const rows = await query<{ id: string }>`
    SELECT id FROM organizations WHERE id = ${organizationId} AND deleted_at IS NULL
  `;
  return rows.length === 1;
}

describe('Organization delete is owner-only', () => {
  let owner: TestUser;
  let admin: TestUser;
  let org: { id: string; name: string; slug: string };

  it('Setup: an organization with an Owner and an Admin member', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization(`Owner Only Delete ${Date.now()}`);

    const adminRoleId = await getOrganizationRoleIdByName(org.id, ROLE_ADMIN);
    expect(adminRoleId).toBeTruthy();

    const adminEmail = `e2e-owner-only-delete-${Date.now()}@test.grant.dev`;
    await owner.inviteMember(org.id, adminEmail, adminRoleId!);

    admin = await TestUser.create({ email: adminEmail, withOrgAccount: true });
    await admin.acceptInvitation(org.id);
  });

  it('Admin cannot delete the organization through GraphQL', async () => {
    const res = await graphqlRequest<DeleteOrganizationData>({
      query: print(DeleteOrganizationDocument),
      variables: { id: org.id, scope: { tenant: 'organization', id: org.id } },
      accessToken: admin.accessToken,
    });

    expect(res.body.errors?.length).toBeGreaterThan(0);
    expect(res.body.data?.deleteOrganization ?? null).toBeNull();
    expect(await isOrganizationLive(org.id)).toBe(true);
  });

  it('Admin cannot delete the organization through REST', async () => {
    const res = await admin.delete(restDeletePath(org.id));

    expect(res.status).toBe(403);
    expect(await isOrganizationLive(org.id)).toBe(true);
  });

  it('Owner can delete the organization through REST', async () => {
    const res = await owner.delete(restDeletePath(org.id));

    expect(res.status).toBe(200);
    expect(await isOrganizationLive(org.id)).toBe(false);
  });

  it('Owner can delete an organization through GraphQL', async () => {
    const second = await owner.createOrganization(`Owner Only Delete GraphQL ${Date.now()}`);

    const res = await graphqlRequest<DeleteOrganizationData>({
      query: print(DeleteOrganizationDocument),
      variables: { id: second.id, scope: { tenant: 'organization', id: second.id } },
      accessToken: owner.accessToken,
    });

    expect(res.body.errors).toBeUndefined();
    expect(res.body.data?.deleteOrganization?.id).toBe(second.id);
    expect(await isOrganizationLive(second.id)).toBe(false);
  });
});
