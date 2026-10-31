/**
 * E2E: what a project API key may carry, and who may manage it.
 *
 * A project API key's effective permissions in its project scope must be covered by what its
 * creator can do there (equality allowed). The same rule decides who may rotate, revoke or
 * delete the key. A role that carries more than the caller is refused (403) and nothing is
 * stored: no key, no pivot row, no audit row.
 */
import {
  SetProjectUserPasswordDocument,
  type SetProjectUserPasswordMutation,
  Tenant,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_OWNER = 'roles.names.organizationOwner';
const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';

interface IdBody {
  data?: { id: string; clientId?: string; clientSecret?: string };
}

afterAll(async () => {
  await closeDbHelper();
});

describe('API-key attenuation', () => {
  let owner: TestUser;
  let dev: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let exceedingRoleId: string;
  let plainRoleId: string;
  let adminRoleId: string;
  let devRoleId: string;
  let viewerRoleId: string;
  let ownerRoleId: string;
  let adminKeyId: string;
  const stamp = Date.now().toString(36);

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const createKey = (user: TestUser, roleId: string) =>
    apiClient()
      .post('/api/api-keys')
      .set('Authorization', user.authHeader)
      .send({ name: `E2E attenuation ${stamp}`, scope: projectScope(), roleId });

  const manage = (
    user: TestUser,
    action: 'rotate' | 'revoke' | 'delete',
    keyId: string,
    scope = projectScope()
  ) => {
    const request =
      action === 'delete'
        ? apiClient().delete(`/api/api-keys/${keyId}`)
        : apiClient().post(`/api/api-keys/${keyId}/${action}`);
    return request.set('Authorization', user.authHeader).send({ id: keyId, scope });
  };

  const counts = async (user: TestUser) => {
    const keys = await query<{ count: string }>`
      SELECT count(*)::text AS count FROM api_keys WHERE created_by = ${user.userId}::uuid
    `;
    const pivots = await query<{ count: string }>`
      SELECT count(*)::text AS count FROM organization_project_api_keys
      WHERE organization_id = ${org.id}::uuid AND deleted_at IS NULL
    `;
    const audits = await query<{ count: string }>`
      SELECT count(*)::text AS count FROM api_key_audit_logs WHERE performed_by = ${user.userId}::uuid
    `;
    return [Number(keys[0]!.count), Number(pivots[0]!.count), Number(audits[0]!.count)];
  };

  it('Setup: an organization with an Owner, a Dev, a role that carries more than the Dev, and a key with the Admin role', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Key Attenuation Org');
    const project = await owner.tryCreateProject(org.id, 'E2E Key Attenuation Project');
    expect(project.status).toBe(201);
    projectId = (project.body as IdBody).data!.id;

    const devEmail = `e2e-key-attenuation-dev-${stamp}@test.grant.dev`;
    devRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;
    await owner.inviteMember(org.id, devEmail, devRoleId);
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    await dev.acceptInvitation(org.id);

    // Other scenarios grant permissions to the Dev group, which is shared by every organization,
    // so the group is picked by what the Dev holds now: one with a permission the Dev lacks.
    const groupRows = await query<{ id: string }>`
      SELECT g.id FROM groups g
      INNER JOIN role_groups owner_rg ON owner_rg.group_id = g.id AND owner_rg.deleted_at IS NULL
      INNER JOIN roles owner_role ON owner_role.id = owner_rg.role_id AND owner_role.name = ${ROLE_OWNER}
      INNER JOIN organization_roles owner_or
        ON owner_or.role_id = owner_role.id AND owner_or.deleted_at IS NULL
        AND owner_or.organization_id = ${org.id}::uuid
      INNER JOIN group_permissions gp ON gp.group_id = g.id AND gp.deleted_at IS NULL
      WHERE g.deleted_at IS NULL AND NOT EXISTS (
        SELECT 1 FROM role_groups dev_rg
        INNER JOIN roles dev_role ON dev_role.id = dev_rg.role_id AND dev_role.name = ${ROLE_DEV}
        INNER JOIN organization_roles dev_or
          ON dev_or.role_id = dev_role.id AND dev_or.deleted_at IS NULL
          AND dev_or.organization_id = ${org.id}::uuid
        INNER JOIN group_permissions dev_gp
          ON dev_gp.group_id = dev_rg.group_id AND dev_gp.deleted_at IS NULL
        WHERE dev_rg.deleted_at IS NULL AND dev_gp.permission_id = gp.permission_id
      )
      GROUP BY g.id LIMIT 1
    `;
    expect(groupRows[0]?.id).toBeTruthy();
    const role = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Attenuation Role ${stamp}`,
        description: 'carries a permission the Dev does not hold',
        scope: { tenant: Tenant.Organization, id: org.id },
        groupIds: [groupRows[0]!.id],
      });
    expect(role.status, JSON.stringify(role.body)).toBe(201);
    exceedingRoleId = (role.body as IdBody).data!.id;

    const plain = await apiClient()
      .post('/api/roles')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Attenuation Plain Role ${stamp}`,
        description: 'carries no permission',
        scope: { tenant: Tenant.Organization, id: org.id },
      });
    expect(plain.status, JSON.stringify(plain.body)).toBe(201);
    plainRoleId = (plain.body as IdBody).data!.id;

    viewerRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_VIEWER))!;
    adminRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_ADMIN))!;
    ownerRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_OWNER))!;

    const adminKey = await createKey(owner, adminRoleId);
    expect(adminKey.status, JSON.stringify(adminKey.body)).toBe(201);
    adminKeyId = (adminKey.body as IdBody).data!.id;
  });

  it('a role key carries only a standard role: a role outside the standard roles is refused (403) and nothing is stored', async () => {
    for (const user of [owner, dev]) {
      const before = await counts(user);

      const res = await createKey(user, plainRoleId);

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await counts(user)).toEqual(before);
    }
  });

  it('refuses a role whose permissions exceed the creator (403) and stores nothing', async () => {
    const before = await counts(dev);

    const res = await createKey(dev, exceedingRoleId);

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(await counts(dev)).toEqual(before);
  });

  it('refuses the Admin role for a Dev (403) and stores nothing', async () => {
    const before = await counts(dev);

    const res = await createKey(dev, adminRoleId);

    expect(res.status, JSON.stringify(res.body)).toBe(403);
    expect(await counts(dev)).toEqual(before);
  });

  it('lets the Owner create a key with the Dev role, and with the Owner role (equality)', async () => {
    const withDev = await createKey(owner, devRoleId);
    expect(withDev.status, JSON.stringify(withDev.body)).toBe(201);

    const withOwner = await createKey(owner, ownerRoleId);
    expect(withOwner.status, JSON.stringify(withOwner.body)).toBe(201);
  });

  it('refuses to rotate, revoke or delete a key whose permissions exceed the caller (403)', async () => {
    for (const action of ['rotate', 'revoke', 'delete'] as const) {
      const res = await manage(dev, action, adminKeyId);
      expect(res.status, `${action}: ${JSON.stringify(res.body)}`).toBe(403);
    }

    const stored = await query<{ is_revoked: boolean; deleted_at: Date | null }>`
      SELECT is_revoked, deleted_at FROM api_keys WHERE id = ${adminKeyId}::uuid
    `;
    expect(stored[0]).toMatchObject({ is_revoked: false, deleted_at: null });
  });

  it('records what a key carries in the audit metadata of its creation', async () => {
    const res = await createKey(owner, devRoleId);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const keyId = (res.body as IdBody).data!.id;

    const rows = await query<{ metadata: string | null }>`
      SELECT metadata FROM api_key_audit_logs WHERE api_key_id = ${keyId}::uuid
    `;
    const created = rows
      .map((row) => JSON.parse(row.metadata ?? '{}') as Record<string, unknown>)
      .find((metadata) => metadata.action === 'CREATE_API_KEY');
    expect(created).toMatchObject({ grant: 'role', permissionCount: 0 });
  });

  it('lets a Dev create a key with the Viewer role; its token is refused ProjectUser:SetPassword', async () => {
    const res = await createKey(dev, viewerRoleId);
    expect(res.status, JSON.stringify(res.body)).toBe(201);
    const key = (res.body as IdBody).data!;

    const exchanged = await apiClient().post('/api/auth/token').send({
      clientId: key.clientId,
      clientSecret: key.clientSecret,
      scope: projectScope(),
    });
    expect(exchanged.status, JSON.stringify(exchanged.body)).toBe(200);
    const accessToken = (exchanged.body as { data?: { accessToken?: string } }).data?.accessToken;
    expect(accessToken).toBeTruthy();

    const setPassword = await graphqlRequest<SetProjectUserPasswordMutation>({
      query: print(SetProjectUserPasswordDocument),
      accessToken: accessToken!,
      variables: {
        input: {
          userId: '00000000-0000-4000-8000-000000000001',
          password: 'Attenuation-E2e-Passw0rd-1!',
          scope: projectScope(),
        },
      },
    });
    expect(
      setPassword.body.errors?.some(
        (e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN'
      )
    ).toBe(true);
  });

  it('applies the same rule to an account project: the default role passes, and the key can be managed', async () => {
    const created = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Attenuation Account Project ${stamp}`,
        scope: { id: owner.accountId, tenant: 'account' },
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    const scope = {
      tenant: Tenant.AccountProject,
      id: `${owner.accountId}:${(created.body as IdBody).data!.id}`,
    };

    const key = await apiClient()
      .post('/api/api-keys')
      .set('Authorization', owner.authHeader)
      .send({ name: `E2E attenuation account ${stamp}`, scope });
    expect(key.status, JSON.stringify(key.body)).toBe(201);
    const keyId = (key.body as IdBody).data!.id;

    for (const action of ['rotate', 'revoke', 'delete'] as const) {
      const res = await manage(owner, action, keyId, scope);
      expect(res.status, `${action}: ${JSON.stringify(res.body)}`).toBe(200);
    }
  });
});
