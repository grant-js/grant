/**
 * E2E: the role of a project API key.
 *
 * A project API key may only be created, rotated, revoked or deleted with a standard organization
 * role of strictly lower level than the caller's (Owner, Admin, Dev, Viewer, in that order). A
 * role outside the standard roles is refused (403) and nothing is stored.
 */
import { Tenant } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { TestUser } from '../helpers/test-user';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';

interface IdBody {
  data?: { id: string };
}

afterAll(async () => {
  await closeDbHelper();
});

describe('API-key role check', () => {
  let owner: TestUser;
  let dev: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let customRoleId: string;
  let viewerRoleId: string;
  let adminKeyId: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const createKey = (user: TestUser, roleId: string) =>
    apiClient()
      .post('/api/api-keys')
      .set('Authorization', user.authHeader)
      .send({ name: `E2E role check ${Date.now()}`, scope: projectScope(), roleId });

  const pivotCount = async (): Promise<number> => {
    const rows = await query<{ count: string }>`
      SELECT count(*)::text AS count FROM organization_project_api_keys
      WHERE organization_id = ${org.id}::uuid AND deleted_at IS NULL
    `;
    return Number(rows[0]!.count);
  };

  it('Setup: an organization with an Owner, a Dev, a non-standard role and a key with the Admin role', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Key Role Check Org');
    const project = await owner.tryCreateProject(org.id, 'E2E Key Role Check Project');
    expect(project.status).toBe(201);
    projectId = (project.body as IdBody).data!.id;

    const devEmail = `e2e-key-role-dev-${Date.now()}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      devEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    await dev.acceptInvitation(org.id);

    const role = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Role Check Role ${Date.now()}`,
        description: 'not a standard organization role',
        scope: { tenant: Tenant.Organization, id: org.id },
      });
    expect(role.status, JSON.stringify(role.body)).toBe(201);
    customRoleId = (role.body as IdBody).data!.id;
    viewerRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_VIEWER))!;

    const adminKey = await createKey(
      owner,
      (await getOrganizationRoleIdByName(org.id, ROLE_ADMIN))!
    );
    expect(adminKey.status, JSON.stringify(adminKey.body)).toBe(201);
    adminKeyId = (adminKey.body as IdBody).data!.id;
  });

  it('refuses a role outside the standard organization roles (403) and stores nothing', async () => {
    const before = await pivotCount();

    const res = await createKey(dev, customRoleId);

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(await pivotCount()).toBe(before);
  });

  it('accepts a standard role of lower level than the caller (201)', async () => {
    const res = await createKey(dev, viewerRoleId);

    expect(res.status, JSON.stringify(res.body)).toBe(201);
  });

  it('refuses to rotate, revoke or delete a key whose role is above the caller (403)', async () => {
    const rotate = await apiClient()
      .post(`/api/api-keys/${adminKeyId}/rotate`)
      .set('Authorization', dev.authHeader)
      .send({ id: adminKeyId, scope: projectScope() });
    expect(rotate.status, JSON.stringify(rotate.body)).toBe(403);

    const revoke = await apiClient()
      .post(`/api/api-keys/${adminKeyId}/revoke`)
      .set('Authorization', dev.authHeader)
      .send({ id: adminKeyId, scope: projectScope() });
    expect(revoke.status, JSON.stringify(revoke.body)).toBe(403);

    const remove = await apiClient()
      .delete(`/api/api-keys/${adminKeyId}`)
      .set('Authorization', dev.authHeader)
      .send({ id: adminKeyId, scope: projectScope() });
    expect(remove.status, JSON.stringify(remove.body)).toBe(403);
  });
});
