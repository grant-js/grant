/**
 * E2E: project API keys that carry permissions instead of a role.
 *
 * A key created with `permissionIds` is authorized by exactly those permissions in its project
 * and by nothing else. What a caller may give a key is listed by `apiKeyAttachableGrants`
 * (GraphQL) and `GET /api/api-keys/attachable-grants` (REST); the key's permissions are edited
 * with `setApiKeyPermissions` / `PUT /api/api-keys/{id}/permissions`. Additions are bounded by
 * the editor's own cohort, removals are always allowed, a change reaches the key's next request,
 * and a role key is converted to permissions within the editor's cohort. Both project tenants.
 *
 * Fixtures are synthetic and the scenario edits no seeded role or group: the Dev it uses is the
 * seeded one, and the first test fails loudly when the stack is not fresh (an earlier scenario
 * left a grant on the shared Dev group), instead of passing for the wrong reason.
 *
 * Prerequisites: E2E stack running (docker-compose.e2e.yml), DB migrated and seeded.
 */
import { SetProjectUserPasswordDocument, Tenant } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { exportInput } from '../../helpers/cdm-sync-fixtures';
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

interface KeyBody {
  data?: {
    id: string;
    role?: { id: string; name: string } | null;
    permissions?: Array<{ id: string; name: string }> | null;
  };
}

interface GrantsBody {
  data?: {
    permissions: Array<{
      machineOnly: boolean;
      permission: { id: string; name: string; action: string };
    }>;
    roles: Array<{ id: string; name: string }>;
  };
}

interface EventRow extends Record<string, unknown> {
  id: string;
  sequence: number | string;
  type: string;
  category: string;
  delivery_class: 'transactional' | 'notification';
  scope_tenant: string;
  scope_id: string;
  actor_user_id: string | null;
  subject_user_id: string | null;
  payload: {
    aggregate?: { kind: string; id: string };
    data?: Record<string, unknown>;
    projectIds?: string[];
  };
  occurred_at: Date;
}

afterAll(async () => {
  await closeDbHelper();
});

const permissionIdByName = async (resource: string, action: string): Promise<string> => {
  const name = `permissions.names.${resource}.${action}`;
  const rows = await query<{ id: string }>`
    SELECT id FROM permissions WHERE name = ${name} AND deleted_at IS NULL LIMIT 1
  `;
  expect(rows[0]?.id, `seeded permission ${name}`).toBeDefined();
  return rows[0]!.id;
};

const isForbidden = (res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}) =>
  Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );

describe('API keys that carry permissions', () => {
  const stamp = Date.now().toString(36);
  let owner: TestUser;
  let dev: TestUser;
  let viewer: TestUser;
  let outsider: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let outsiderOrg: { id: string; name: string; slug: string };
  let outsiderProjectId: string;
  let accountProjectId: string;
  let devRoleId: string;
  let adminRoleId: string;
  let subscriptionId: string;

  let pUserQuery: string;
  let pUserRead: string;
  let pSyncQuery: string;
  let pSyncUpdate: string;
  let pSetPassword: string;
  let pExport: string;
  let pApiKeyCreate: string;

  const orgScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });
  const accountScope = () => ({
    tenant: Tenant.AccountProject,
    id: `${owner.accountId}:${accountProjectId}`,
  });
  const READ_SET = () => [pUserQuery, pUserRead, pSyncQuery];

  const gql = <T>(accessToken: string, text: string, variables: Record<string, unknown>) =>
    graphqlRequest<T>({ query: text, accessToken, variables });

  const createKey = (
    auth: string,
    scope: { tenant: Tenant; id: string },
    grant: { roleId?: string; permissionIds?: string[] },
    name = `E2E scopes ${stamp}`
  ) =>
    apiClient()
      .post('/api/api-keys')
      .set('Authorization', auth)
      .send({ name, scope, ...grant });

  const setPermissions = (
    auth: string,
    scope: { tenant: Tenant; id: string },
    keyId: string,
    permissionIds: string[]
  ) =>
    apiClient()
      .put(`/api/api-keys/${keyId}/permissions`)
      .set('Authorization', auth)
      .send({ scope, permissionIds });

  const cohort = (auth: string, scope: { tenant: Tenant; id: string }) =>
    apiClient()
      .get('/api/api-keys/attachable-grants')
      .query({ tenant: scope.tenant, scopeId: scope.id })
      .set('Authorization', auth);

  const exchangeRaw = (
    key: { clientId: string; clientSecret: string },
    scope: { tenant: Tenant; id: string }
  ) =>
    apiClient()
      .post('/api/auth/token')
      .send({ clientId: key.clientId, clientSecret: key.clientSecret, scope });

  const exchange = async (
    key: { clientId: string; clientSecret: string },
    scope: { tenant: Tenant; id: string }
  ): Promise<string> => {
    const res = await exchangeRaw(key, scope);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { accessToken: string } }).data.accessToken;
  };

  const bearer = (token: string) => `Bearer ${token}`;

  /** `users(scope)` over GraphQL: the REST list takes a single id, a project scope has two. */
  const listUsers = (token: string, scope: { tenant: Tenant; id: string }) =>
    gql<{ users: { totalCount: number } }>(
      token,
      `query Users($scope: Scope!) { users(scope: $scope, limit: 1) { totalCount } }`,
      { scope }
    );
  const canListUsers = async (token: string, scope: { tenant: Tenant; id: string }) => {
    const res = await listUsers(token, scope);
    return res.body.errors === undefined;
  };

  const listSyncJobs = (token: string, scope: { tenant: Tenant; id: string }, project: string) =>
    apiClient()
      .get(`/api/projects/${project}/sync/jobs`)
      .query({ tenant: scope.tenant, scopeId: scope.id, page: 1, limit: 5 })
      .set('Authorization', bearer(token));

  const startExportJob = (token: string, scope: { tenant: Tenant; id: string }, project: string) =>
    apiClient()
      .post(`/api/projects/${project}/sync/jobs/export`)
      .set('Authorization', bearer(token))
      .send({ scope, ...exportInput({ jobName: `E2E scopes export ${stamp}` }) });

  const storedPermissionIds = async (keyId: string): Promise<string[]> => {
    const rows = await query<{ permission_id: string }>`
      SELECT permission_id FROM api_key_permissions
      WHERE api_key_id = ${keyId}::uuid AND deleted_at IS NULL
    `;
    return rows.map((row) => row.permission_id).sort();
  };

  const pivotRole = async (keyId: string): Promise<string | null | undefined> => {
    const rows = await query<{ organization_role_id: string | null }>`
      SELECT organization_role_id FROM organization_project_api_keys
      WHERE api_key_id = ${keyId}::uuid AND deleted_at IS NULL
    `;
    return rows[0] ? rows[0].organization_role_id : undefined;
  };

  const auditActions = async (keyId: string): Promise<string[]> => {
    const rows = await query<{ action: string }>`
      SELECT action FROM api_key_audit_logs WHERE api_key_id = ${keyId}::uuid ORDER BY created_at, id
    `;
    return rows.map((row) => row.action);
  };

  const keyCount = async (user: TestUser): Promise<number> => {
    const rows = await query<{ count: string }>`
      SELECT count(*)::text AS count FROM api_keys WHERE created_by = ${user.userId}::uuid
    `;
    return Number(rows[0]!.count);
  };

  const listKeys = async (auth: string, scope: { tenant: Tenant; id: string }) => {
    const res = await apiClient()
      .get('/api/api-keys')
      .query({ tenant: scope.tenant, scopeId: scope.id, limit: 100 })
      .set('Authorization', auth);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    return (res.body as { data: { apiKeys: Array<KeyBody['data']> } }).data.apiKeys;
  };

  const deliveries = (): Promise<EventRow[]> =>
    query<EventRow>`
      SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
             e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
      FROM webhook_delivery_attempts d
      INNER JOIN event_log e ON e.id = d.event_id
      WHERE d.subscription_id = ${subscriptionId}::uuid
      ORDER BY e.sequence
    `;

  const waitForUpdates = async (keyId: string, count: number): Promise<EventRow[]> => {
    const deadline = Date.now() + 40_000;
    let rows: EventRow[] = [];
    while (Date.now() < deadline) {
      rows = (await deliveries()).filter(
        (row) => row.type === 'api_key.updated' && row.payload.aggregate?.id === keyId
      );
      if (rows.length >= count) return rows;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    throw new Error(
      `Timed out waiting for ${count} api_key.updated for ${keyId}; saw ${rows.length}`
    );
  };

  const envelopeOf = (row: EventRow) =>
    buildCloudEventEnvelope(
      {
        id: row.id,
        sequence: Number(row.sequence),
        type: row.type as 'api_key.updated',
        category: row.category as 'security',
        deliveryClass: row.delivery_class,
        scope: { tenant: row.scope_tenant as typeof Tenant.Organization, id: row.scope_id },
        actorUserId: row.actor_user_id,
        subjectUserId: row.subject_user_id,
        aggregate: row.payload.aggregate,
        data: row.payload.data ?? {},
        occurredAt: row.occurred_at,
        projectIds: row.payload.projectIds,
      },
      'https://grant.e2e.invalid'
    );

  it('Setup: an organization with an Owner, a seeded Dev and a Viewer, an account project, a subscription, and a second organization', async () => {
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Key Scopes Org');
    const project = await owner.tryCreateProject(org.id, 'E2E Key Scopes Project');
    expect(project.status).toBe(201);
    projectId = (project.body as IdBody).data!.id;

    devRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;
    adminRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_ADMIN))!;
    const viewerRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_VIEWER))!;

    const devEmail = `e2e-key-scopes-dev-${stamp}@test.grant.dev`;
    await owner.inviteMember(org.id, devEmail, devRoleId);
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    await dev.acceptInvitation(org.id);

    const viewerEmail = `e2e-key-scopes-viewer-${stamp}@test.grant.dev`;
    await owner.inviteMember(org.id, viewerEmail, viewerRoleId);
    viewer = await TestUser.create({ email: viewerEmail, withOrgAccount: true });
    await viewer.acceptInvitation(org.id);

    const accountProject = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: `E2E Key Scopes Account Project ${stamp}`,
        scope: { id: owner.accountId, tenant: 'account' },
      });
    expect(accountProject.status, JSON.stringify(accountProject.body)).toBe(201);
    accountProjectId = (accountProject.body as IdBody).data!.id;

    outsider = await TestUser.create({ withOrgAccount: true });
    outsiderOrg = await outsider.createOrganization('E2E Key Scopes Outsider Org');
    const outsiderProject = await outsider.tryCreateProject(
      outsiderOrg.id,
      'E2E Key Scopes Outsider Project'
    );
    expect(outsiderProject.status).toBe(201);
    outsiderProjectId = (outsiderProject.body as IdBody).data!.id;

    [pUserQuery, pUserRead, pSyncQuery, pSyncUpdate, pSetPassword, pExport, pApiKeyCreate] =
      await Promise.all([
        permissionIdByName('User', 'Query'),
        permissionIdByName('User', 'Read'),
        permissionIdByName('ProjectSyncJob', 'Query'),
        permissionIdByName('ProjectSyncJob', 'Update'),
        permissionIdByName('ProjectUser', 'SetPassword'),
        permissionIdByName('ProjectUser', 'ExportCredentials'),
        permissionIdByName('ApiKey', 'Create'),
      ]);

    const sub = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: orgScope(),
        url: 'https://example.com/grant-e2e-key-scopes',
        eventTypes: ['api_key.updated'],
        description: 'E2E key scopes',
        active: true,
      });
    expect(sub.status, JSON.stringify(sub.body)).toBe(201);
    subscriptionId = (sub.body as IdBody).data!.id;
  });

  it('the stack is fresh: the seeded Dev group holds neither ExportCredentials nor SetPassword', async () => {
    const rows = await query<{ n: string }>`
      SELECT count(*)::text AS n
      FROM role_groups rg
      INNER JOIN roles r ON r.id = rg.role_id AND r.deleted_at IS NULL AND r.name = ${ROLE_DEV}
      INNER JOIN organization_roles orl
        ON orl.role_id = r.id AND orl.deleted_at IS NULL AND orl.organization_id = ${org.id}::uuid
      INNER JOIN group_permissions gp ON gp.group_id = rg.group_id AND gp.deleted_at IS NULL
      WHERE rg.deleted_at IS NULL
        AND gp.permission_id IN (${pExport}::uuid, ${pSetPassword}::uuid)
    `;
    expect(
      Number(rows[0]!.n),
      'an earlier scenario left a grant on the shared Dev group: run this file on a fresh stack'
    ).toBe(0);
  });

  describe('the cohort query', () => {
    it('lists the Owner permissions, flags the machine-only one, and lists the standard roles', async () => {
      const res = await cohort(owner.authHeader, orgScope());

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const { permissions, roles } = (res.body as GrantsBody).data!;
      const byId = new Map(permissions.map((entry) => [entry.permission.id, entry]));
      expect(byId.get(pExport)?.machineOnly).toBe(true);
      expect(byId.get(pSetPassword)?.machineOnly).toBe(false);
      expect(byId.get(pApiKeyCreate)?.machineOnly).toBe(false);
      expect(permissions.filter((entry) => entry.machineOnly)).toHaveLength(1);
      expect(roles.map((role) => role.name).sort()).toEqual(
        [ROLE_OWNER, ROLE_ADMIN, ROLE_DEV, ROLE_VIEWER].sort()
      );
    });

    it('does not list a custom role of the organization', async () => {
      const custom = await apiClient()
        .post('/api/roles')
        .set('Authorization', owner.authHeader)
        .send({
          name: `E2E Key Scopes Custom Role ${stamp}`,
          description: 'not a standard role',
          scope: { tenant: Tenant.Organization, id: org.id },
        });
      expect(custom.status, JSON.stringify(custom.body)).toBe(201);
      const customId = (custom.body as IdBody).data!.id;

      const res = await cohort(owner.authHeader, orgScope());

      expect((res.body as GrantsBody).data!.roles.map((role) => role.id)).not.toContain(customId);
    });

    it('lists the Dev permissions without ProjectUser:ExportCredentials, SetPassword, and the roles the Dev covers', async () => {
      const res = await cohort(dev.authHeader, orgScope());

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const { permissions, roles } = (res.body as GrantsBody).data!;
      const ids = permissions.map((entry) => entry.permission.id);
      expect(ids).toContain(pSyncUpdate);
      expect(ids).toContain(pApiKeyCreate);
      expect(ids).not.toContain(pExport);
      expect(ids).not.toContain(pSetPassword);
      expect(permissions.some((entry) => entry.machineOnly)).toBe(false);
      const names = roles.map((role) => role.name);
      expect(names).toContain(ROLE_DEV);
      expect(names).not.toContain(ROLE_OWNER);
      expect(names).not.toContain(ROLE_ADMIN);
    });

    it('is refused (403) for a caller without ApiKey:Create, and for a scope that is not a project', async () => {
      const refused = await cohort(viewer.authHeader, orgScope());
      expect(refused.status, JSON.stringify(refused.body)).toBe(403);

      const notProject = await cohort(owner.authHeader, {
        tenant: Tenant.Organization,
        id: org.id,
      });
      expect([400, 403]).toContain(notProject.status);
    });

    it('answers the same set over GraphQL', async () => {
      const res = await gql<{
        apiKeyAttachableGrants: {
          permissions: Array<{ machineOnly: boolean; permission: { id: string } }>;
          roles: Array<{ id: string }>;
        };
      }>(
        owner.accessToken,
        `query Grants($scope: Scope!) {
          apiKeyAttachableGrants(scope: $scope) {
            permissions { machineOnly permission { id name action } }
            roles { id name }
          }
        }`,
        { scope: orgScope() }
      );
      expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

      const rest = (await cohort(owner.authHeader, orgScope())).body as GrantsBody;
      const graphql = res.body.data!.apiKeyAttachableGrants;
      expect(graphql.permissions.map((entry) => entry.permission.id).sort()).toEqual(
        rest.data!.permissions.map((entry) => entry.permission.id).sort()
      );
      expect(
        graphql.permissions.find((entry) => entry.permission.id === pExport)?.machineOnly
      ).toBe(true);
      expect(graphql.roles.map((role) => role.id).sort()).toEqual(
        rest.data!.roles.map((role) => role.id).sort()
      );
    });

    it('lists the account owner cohort, with the machine-only permission it is gated for', async () => {
      const res = await cohort(owner.authHeader, accountScope());

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const { permissions } = (res.body as GrantsBody).data!;
      expect(permissions.find((entry) => entry.permission.id === pExport)?.machineOnly).toBe(true);
      expect(permissions.map((entry) => entry.permission.id)).toContain(pSyncUpdate);
    });
  });

  describe('a key with permissions authorizes exactly those permissions, and edits reach it at once', () => {
    let keyId: string;
    let keyCredentials: { clientId: string; clientSecret: string };
    let token: string;
    let updatesBefore: number;

    it('the Owner creates a key with [User:Query, User:Read, ProjectSyncJob:Query]; it is listed with permissions and no role', async () => {
      const res = await createKey(owner.authHeader, orgScope(), { permissionIds: READ_SET() });

      expect(res.status, JSON.stringify(res.body)).toBe(201);
      const key = (res.body as IdBody).data!;
      keyId = key.id;
      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET()].sort());
      expect(await pivotRole(keyId)).toBeNull();

      const listed = (await listKeys(owner.authHeader, orgScope())).find((k) => k?.id === keyId);
      expect(listed?.role ?? null).toBeNull();
      expect(listed?.permissions?.map((p) => p.id).sort()).toEqual([...READ_SET()].sort());

      keyCredentials = key as typeof keyCredentials;
      token = await exchange(keyCredentials, orgScope());
      updatesBefore = (await auditActions(keyId)).length;
    });

    it('its token lists users and sync jobs, and is refused everything else', async () => {
      expect(await canListUsers(token, orgScope())).toBe(true);
      expect((await listSyncJobs(token, orgScope(), projectId)).status).toBe(200);

      expect((await startExportJob(token, orgScope(), projectId)).status).toBe(403);
      const roles = await gql(
        token,
        `query Roles($scope: Scope!) { roles(scope: $scope, limit: 1) { totalCount } }`,
        { scope: orgScope() }
      );
      expect(isForbidden(roles)).toBe(true);
      const keys = await apiClient()
        .get('/api/api-keys')
        .query({ tenant: orgScope().tenant, scopeId: orgScope().id })
        .set('Authorization', bearer(token));
      expect(keys.status).toBe(403);

      const setPassword = await gql(token, print(SetProjectUserPasswordDocument), {
        input: {
          userId: '00000000-0000-4000-8000-000000000001',
          password: 'KeyScopes-E2e-Passw0rd-1!',
          scope: orgScope(),
        },
      });
      expect(isForbidden(setPassword)).toBe(true);
    });

    it('its grants stay in their own scope: other credentials scopes are refused, and so is a token naming another project', async () => {
      const otherScope = await exchangeRaw(keyCredentials, accountScope());
      expect(otherScope.status).toBe(401);

      const otherProject = {
        tenant: Tenant.OrganizationProject,
        id: `${org.id}:${accountProjectId}`,
      };
      expect(isForbidden(await listUsers(token, otherProject))).toBe(true);
    });

    it('the Owner adds ProjectSyncJob:Update: the same token starts a sync job at once; the audit has one row for the change', async () => {
      const res = await setPermissions(owner.authHeader, orgScope(), keyId, [
        ...READ_SET(),
        pSyncUpdate,
      ]);

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const body = (res.body as KeyBody).data!;
      expect(body.role ?? null).toBeNull();
      expect(body.permissions?.map((p) => p.id).sort()).toEqual(
        [...READ_SET(), pSyncUpdate].sort()
      );
      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET(), pSyncUpdate].sort());

      const started = await startExportJob(token, orgScope(), projectId);
      expect(started.status, JSON.stringify(started.body)).toBe(202);

      const actions = (await auditActions(keyId)).slice(updatesBefore);
      expect(actions.filter((a) => a === 'ADD_PERMISSION')).toHaveLength(1);
      expect(actions.filter((a) => a === 'REMOVE_PERMISSION')).toHaveLength(0);
      expect(actions.filter((a) => a === 'UPDATE_API_KEY_PERMISSIONS')).toHaveLength(1);
    });

    it('the Owner removes it: the same token is refused again, and the audit gains a removal row', async () => {
      const before = (await auditActions(keyId)).length;

      const res = await setPermissions(owner.authHeader, orgScope(), keyId, READ_SET());

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET()].sort());
      expect((await startExportJob(token, orgScope(), projectId)).status).toBe(403);
      expect(await canListUsers(token, orgScope())).toBe(true);

      const actions = (await auditActions(keyId)).slice(before);
      expect(actions.filter((a) => a === 'REMOVE_PERMISSION')).toHaveLength(1);
      expect(actions.filter((a) => a === 'ADD_PERMISSION')).toHaveLength(0);
    });

    it('a repeat of the same set changes nothing, and drops no row from the audit', async () => {
      const before = await auditActions(keyId);

      const res = await setPermissions(
        owner.authHeader,
        orgScope(),
        keyId,
        [...READ_SET()].reverse()
      );

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      expect(await auditActions(keyId)).toEqual(before);
    });

    it('publishes api_key.updated once per change, naming the key and two counts, never a permission', async () => {
      const rows = await waitForUpdates(keyId, 2);

      expect(rows).toHaveLength(2);
      const envelopes = rows.map(envelopeOf);
      expect(
        envelopes.map((e) => (e.data.after as { permissionCount: number }).permissionCount)
      ).toEqual([4, 3]);
      for (const [index, envelope] of envelopes.entries()) {
        expect(envelope.type).toContain('api_key.updated');
        expect(envelope.grantsubjectuser).toBeNull();
        expect(envelope.data.before).toEqual({ id: keyId, name: `E2E scopes ${stamp}` });
        expect(envelope.data.after).toEqual({
          id: keyId,
          name: `E2E scopes ${stamp}`,
          permissionCount: index === 0 ? 4 : 3,
        });
        const text = JSON.stringify(envelope);
        for (const permission of [...READ_SET(), pSyncUpdate]) {
          expect(text).not.toContain(permission);
        }
        expect(text).not.toMatch(/ProjectSyncJob|User:Query|Query/);
        expect(rows[index]!.payload.projectIds).toContain(projectId);
      }
    });

    it('the key secret never reaches a change: its audit rows hold ids and counts only', async () => {
      const rows = await query<{ values: string }>`
        SELECT concat_ws(' ', old_values, new_values, metadata) AS values
        FROM api_key_audit_logs WHERE api_key_id = ${keyId}::uuid
      `;
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(row.values).not.toMatch(/clientSecret|secret|hash/i);
      }
    });
  });

  describe('what a Dev may attach, and what an Owner may', () => {
    let devKeyId: string;
    let devKeyAuditBefore: string[];

    it('a Dev creates a key with permissions it holds', async () => {
      const res = await createKey(dev.authHeader, orgScope(), { permissionIds: READ_SET() });

      expect(res.status, JSON.stringify(res.body)).toBe(201);
      devKeyId = (res.body as IdBody).data!.id;
      devKeyAuditBefore = await auditActions(devKeyId);
    });

    it.each([
      ['a permission the Dev does not hold', () => [...READ_SET(), pSetPassword]],
      ['ProjectUser:ExportCredentials', () => [...READ_SET(), pExport]],
    ])('a Dev cannot add %s to a key: 403 and the key is unchanged', async (_label, set) => {
      const res = await setPermissions(dev.authHeader, orgScope(), devKeyId, set());

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await storedPermissionIds(devKeyId)).toEqual([...READ_SET()].sort());
      expect(await auditActions(devKeyId)).toEqual(devKeyAuditBefore);
    });

    it.each([
      ['a permission the Dev does not hold', () => [pSetPassword]],
      ['ProjectUser:ExportCredentials', () => [pExport]],
    ])('a Dev cannot create a key with %s: 403 and nothing is stored', async (_label, set) => {
      const before = await keyCount(dev);

      const res = await createKey(dev.authHeader, orgScope(), { permissionIds: set() });

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await keyCount(dev)).toBe(before);
    });

    it('an Owner can attach ProjectUser:ExportCredentials, without holding it, to a new key and to an existing one', async () => {
      const created = await createKey(owner.authHeader, orgScope(), {
        permissionIds: [pUserQuery, pExport],
      });
      expect(created.status, JSON.stringify(created.body)).toBe(201);
      expect(await storedPermissionIds((created.body as IdBody).data!.id)).toEqual(
        [pUserQuery, pExport].sort()
      );

      const edited = await setPermissions(owner.authHeader, orgScope(), devKeyId, [
        ...READ_SET(),
        pExport,
      ]);
      expect(edited.status, JSON.stringify(edited.body)).toBe(200);
      expect(await storedPermissionIds(devKeyId)).toEqual([...READ_SET(), pExport].sort());
    });

    it('the Dev can no longer edit that key: it carries what the Dev does not cover (403, unchanged)', async () => {
      const res = await setPermissions(dev.authHeader, orgScope(), devKeyId, [pUserQuery]);

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await storedPermissionIds(devKeyId)).toEqual([...READ_SET(), pExport].sort());
    });

    it('the Owner removes ProjectUser:ExportCredentials from it; the Dev edits the key again and may remove', async () => {
      const removed = await setPermissions(owner.authHeader, orgScope(), devKeyId, READ_SET());
      expect(removed.status, JSON.stringify(removed.body)).toBe(200);

      const edited = await setPermissions(dev.authHeader, orgScope(), devKeyId, [pUserQuery]);
      expect(edited.status, JSON.stringify(edited.body)).toBe(200);
      expect(await storedPermissionIds(devKeyId)).toEqual([pUserQuery]);
    });
  });

  describe('a role key is converted to permissions, within the editor cohort', () => {
    let roleKeyId: string;
    let roleKey: { clientId: string; clientSecret: string };
    let roleToken: string;

    it('the Owner creates a key with the Dev role; it is listed with its role and no permissions', async () => {
      const res = await createKey(owner.authHeader, orgScope(), { roleId: devRoleId });

      expect(res.status, JSON.stringify(res.body)).toBe(201);
      roleKey = (res.body as IdBody).data as typeof roleKey;
      roleKeyId = (res.body as IdBody).data!.id;
      const listed = (await listKeys(owner.authHeader, orgScope())).find(
        (k) => k?.id === roleKeyId
      );
      expect(listed?.role?.id).toBe(devRoleId);
      expect(listed?.permissions ?? null).toBeNull();

      roleToken = await exchange(roleKey, orgScope());
      expect((await listSyncJobs(roleToken, orgScope(), projectId)).status).toBe(200);
      expect((await startExportJob(roleToken, orgScope(), projectId)).status).toBe(202);
    });

    it('a Dev cannot convert a key that carries more than the Dev (an Admin-role key): 403 and the role stays', async () => {
      const adminKey = await createKey(owner.authHeader, orgScope(), { roleId: adminRoleId });
      expect(adminKey.status, JSON.stringify(adminKey.body)).toBe(201);
      const adminKeyId = (adminKey.body as IdBody).data!.id;

      const res = await setPermissions(dev.authHeader, orgScope(), adminKeyId, [pUserQuery]);

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await pivotRole(adminKeyId)).toBe(adminRoleId);
      expect(await storedPermissionIds(adminKeyId)).toEqual([]);
    });

    it('a Dev cannot convert a Dev-role key into a set that adds a permission the Dev lacks', async () => {
      const res = await setPermissions(dev.authHeader, orgScope(), roleKeyId, [
        pUserQuery,
        pSetPassword,
      ]);

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await pivotRole(roleKeyId)).toBe(devRoleId);
      expect(await storedPermissionIds(roleKeyId)).toEqual([]);
    });

    it('the Owner converts it: the role is cleared, the permissions are stored, and the token it already holds narrows at once', async () => {
      const res = await setPermissions(owner.authHeader, orgScope(), roleKeyId, [
        pUserQuery,
        pSyncQuery,
      ]);

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const body = (res.body as KeyBody).data!;
      expect(body.role ?? null).toBeNull();
      expect(body.permissions?.map((p) => p.id).sort()).toEqual([pUserQuery, pSyncQuery].sort());
      expect(await pivotRole(roleKeyId)).toBeNull();
      expect(await storedPermissionIds(roleKeyId)).toEqual([pUserQuery, pSyncQuery].sort());

      expect((await startExportJob(roleToken, orgScope(), projectId)).status).toBe(403);
      expect((await listSyncJobs(roleToken, orgScope(), projectId)).status).toBe(200);

      const actions = await auditActions(roleKeyId);
      expect(actions.filter((a) => a === 'ADD_PERMISSION')).toHaveLength(2);
      const rows = await query<{ new_values: string | null; metadata: string | null }>`
        SELECT new_values, metadata FROM api_key_audit_logs
        WHERE api_key_id = ${roleKeyId}::uuid AND action = 'UPDATE_API_KEY_PERMISSIONS'
      `;
      expect(JSON.parse(rows[0]!.new_values!)).toMatchObject({
        added: 2,
        removed: 0,
        convertedFromRoleId: devRoleId,
      });
    });

    it('the conversion is one way: there is no route back to the role', async () => {
      const res = await createKey(owner.authHeader, orgScope(), {
        roleId: devRoleId,
        permissionIds: [pUserQuery],
      });
      expect(res.status, JSON.stringify(res.body)).toBe(400);
      expect(await pivotRole(roleKeyId)).toBeNull();
    });
  });

  describe('requests that are not valid are refused and store nothing', () => {
    it.each([
      ['an empty set', () => ({ permissionIds: [] as string[] }), 400],
      ['a permission that does not exist', () => ({ permissionIds: [crypto.randomUUID()] }), 400],
      [
        'both a role and permissions',
        () => ({ roleId: devRoleId, permissionIds: [pUserQuery] }),
        400,
      ],
    ])('creating a key with %s is %i', async (_label, grant, status) => {
      const before = await keyCount(owner);

      const res = await createKey(owner.authHeader, orgScope(), grant());

      expect(res.status, JSON.stringify(res.body)).toBe(status);
      expect(await keyCount(owner)).toBe(before);
    });

    it('permissions are not accepted for a project user key, where the key is the user', async () => {
      const profile = await owner.getProfile();
      const userId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } })
        .data!.accounts![0]!.owner!.id;
      const before = await keyCount(owner);

      const res = await createKey(
        owner.authHeader,
        { tenant: Tenant.ProjectUser, id: `${projectId}:${userId}` },
        { permissionIds: [pUserQuery] }
      );

      expect([400, 403]).toContain(res.status);
      expect(await keyCount(owner)).toBe(before);
    });

    it('editing refuses an empty set, a revoked key and a scope that is not a project', async () => {
      const created = await createKey(owner.authHeader, orgScope(), { permissionIds: READ_SET() });
      const keyId = (created.body as IdBody).data!.id;

      expect((await setPermissions(owner.authHeader, orgScope(), keyId, [])).status).toBe(400);
      expect(
        (
          await setPermissions(
            owner.authHeader,
            { tenant: Tenant.Organization, id: org.id },
            keyId,
            [pUserQuery]
          )
        ).status
      ).toBeGreaterThanOrEqual(400);

      const revoked = await apiClient()
        .post(`/api/api-keys/${keyId}/revoke`)
        .set('Authorization', owner.authHeader)
        .send({ id: keyId, scope: orgScope() });
      expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);

      const res = await setPermissions(owner.authHeader, orgScope(), keyId, [pUserQuery]);
      expect(res.status, JSON.stringify(res.body)).toBe(400);
      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET()].sort());
    });

    it('editing is refused (403) for a caller without ApiKey:Update', async () => {
      const created = await createKey(owner.authHeader, orgScope(), { permissionIds: READ_SET() });
      const keyId = (created.body as IdBody).data!.id;

      const res = await setPermissions(viewer.authHeader, orgScope(), keyId, [pUserQuery]);

      expect(res.status, JSON.stringify(res.body)).toBe(403);
      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET()].sort());
    });
  });

  describe('tenancy: another organization cannot reach the key', () => {
    let keyId: string;

    it('naming the organization project is refused (403); naming its own project does not find the key (404); nothing changes', async () => {
      const created = await createKey(owner.authHeader, orgScope(), { permissionIds: READ_SET() });
      keyId = (created.body as IdBody).data!.id;
      const before = await auditActions(keyId);

      const named = await setPermissions(outsider.authHeader, orgScope(), keyId, [pUserQuery]);
      expect(named.status, JSON.stringify(named.body)).toBe(403);

      const ownScope = {
        tenant: Tenant.OrganizationProject,
        id: `${outsiderOrg.id}:${outsiderProjectId}`,
      };
      const own = await setPermissions(outsider.authHeader, ownScope, keyId, [pUserQuery]);
      expect(own.status, JSON.stringify(own.body)).toBe(404);

      expect(await storedPermissionIds(keyId)).toEqual([...READ_SET()].sort());
      expect(await auditActions(keyId)).toEqual(before);
      expect((await cohort(outsider.authHeader, orgScope())).status).toBe(403);
    });
  });

  describe('the same over GraphQL', () => {
    it('creates with permissionIds, lists permissions, and edits with setApiKeyPermissions', async () => {
      const created = await gql<{
        createApiKey: { id: string; clientId: string; clientSecret: string };
      }>(
        owner.accessToken,
        `mutation Create($input: CreateApiKeyInput!) {
          createApiKey(input: $input) { id clientId clientSecret }
        }`,
        {
          input: {
            name: `E2E scopes graphql ${stamp}`,
            scope: orgScope(),
            permissionIds: READ_SET(),
          },
        }
      );
      expect(created.body.errors, JSON.stringify(created.body.errors)).toBeUndefined();
      const keyId = created.body.data!.createApiKey.id;

      const listed = await gql<{
        apiKeys: {
          apiKeys: Array<{ id: string; role: unknown; permissions: Array<{ id: string }> | null }>;
        };
      }>(
        owner.accessToken,
        `query Keys($scope: Scope!) {
          apiKeys(scope: $scope, limit: 100) { apiKeys { id role { id } permissions { id name } } }
        }`,
        { scope: orgScope() }
      );
      expect(listed.body.errors, JSON.stringify(listed.body.errors)).toBeUndefined();
      const key = listed.body.data!.apiKeys.apiKeys.find((k) => k.id === keyId)!;
      expect(key.role).toBeNull();
      expect(key.permissions!.map((p) => p.id).sort()).toEqual([...READ_SET()].sort());

      const edited = await gql<{
        setApiKeyPermissions: { id: string; permissions: Array<{ id: string }> };
      }>(
        owner.accessToken,
        `mutation Set($input: SetApiKeyPermissionsInput!) {
          setApiKeyPermissions(input: $input) { id role { id } permissions { id } }
        }`,
        { input: { scope: orgScope(), id: keyId, permissionIds: [pUserQuery, pSyncUpdate] } }
      );
      expect(edited.body.errors, JSON.stringify(edited.body.errors)).toBeUndefined();
      expect(edited.body.data!.setApiKeyPermissions.permissions.map((p) => p.id).sort()).toEqual(
        [pUserQuery, pSyncUpdate].sort()
      );
      expect(await storedPermissionIds(keyId)).toEqual([pUserQuery, pSyncUpdate].sort());

      const refused = await gql(
        dev.accessToken,
        `mutation Set($input: SetApiKeyPermissionsInput!) {
          setApiKeyPermissions(input: $input) { id }
        }`,
        { input: { scope: orgScope(), id: keyId, permissionIds: [pUserQuery, pExport] } }
      );
      expect(isForbidden(refused)).toBe(true);
      expect(await storedPermissionIds(keyId)).toEqual([pUserQuery, pSyncUpdate].sort());
    });
  });

  describe('the account project tenant', () => {
    let keyId: string;
    let keyCreds: { clientId: string; clientSecret: string };
    let token: string;

    it('creates a key with permissions; its token is refused what it does not carry', async () => {
      const res = await createKey(owner.authHeader, accountScope(), {
        permissionIds: [pApiKeyCreate, pUserQuery, pUserRead],
      });

      expect(res.status, JSON.stringify(res.body)).toBe(201);
      keyCreds = (res.body as IdBody).data as typeof keyCreds;
      keyId = (res.body as IdBody).data!.id;
      expect(await storedPermissionIds(keyId)).toEqual(
        [pApiKeyCreate, pUserQuery, pUserRead].sort()
      );

      const listed = (await listKeys(owner.authHeader, accountScope())).find(
        (k) => k?.id === keyId
      );
      expect(listed?.permissions?.map((p) => p.id).sort()).toEqual(
        [pApiKeyCreate, pUserQuery, pUserRead].sort()
      );

      token = await exchange(keyCreds, accountScope());
      expect(await canListUsers(token, accountScope())).toBe(true);
      expect((await startExportJob(token, accountScope(), accountProjectId)).status).toBe(403);
    });

    it.each([
      ['an empty set', () => ({ permissionIds: [] as string[] })],
      ['a permission that does not exist', () => ({ permissionIds: [crypto.randomUUID()] })],
      ['both a role and permissions', () => ({ roleId: devRoleId, permissionIds: [pUserQuery] })],
    ])('refuses a key with %s (400) and stores nothing', async (_label, grant) => {
      const before = await keyCount(owner);

      const res = await createKey(owner.authHeader, accountScope(), grant());

      expect(res.status, JSON.stringify(res.body)).toBe(400);
      expect(await keyCount(owner)).toBe(before);
    });

    it('edits reach the token at once, and removals are free', async () => {
      const added = await setPermissions(owner.authHeader, accountScope(), keyId, [
        pApiKeyCreate,
        pUserQuery,
        pUserRead,
        pSyncUpdate,
      ]);
      expect(added.status, JSON.stringify(added.body)).toBe(200);
      expect((await startExportJob(token, accountScope(), accountProjectId)).status).toBe(202);

      const removed = await setPermissions(owner.authHeader, accountScope(), keyId, [pUserQuery]);
      expect(removed.status, JSON.stringify(removed.body)).toBe(200);
      expect((await startExportJob(token, accountScope(), accountProjectId)).status).toBe(403);
      expect(await storedPermissionIds(keyId)).toEqual([pUserQuery]);
    });

    it('converts an account role key to permissions', async () => {
      const roleKey = await createKey(owner.authHeader, accountScope(), {});
      expect(roleKey.status, JSON.stringify(roleKey.body)).toBe(201);
      const roleKeyId = (roleKey.body as IdBody).data!.id;

      const res = await setPermissions(owner.authHeader, accountScope(), roleKeyId, [pUserQuery]);

      expect(res.status, JSON.stringify(res.body)).toBe(200);
      const rows = await query<{ account_role_id: string | null }>`
        SELECT account_role_id FROM account_project_api_keys
        WHERE api_key_id = ${roleKeyId}::uuid AND deleted_at IS NULL
      `;
      expect(rows[0]!.account_role_id).toBeNull();
      expect(await storedPermissionIds(roleKeyId)).toEqual([pUserQuery]);
    });
  });
});
