/**
 * E2E: the per-project opt-in for exportable API-key secrets.
 *
 * `Project:SetExportableApiKeySecrets` is held by Owner, Admin and the account owners, not by Dev
 * or Viewer. The flag is off by default, flips through GraphQL and REST, and each real change
 * writes one audit row on the project with the old and new value; setting the value the project
 * already has writes nothing. A scope that names another project than the one authorized is
 * refused by the transport guard before anything is read or written. Nothing reads the flag yet
 * (the copy lands in a later slice), so this scenario asserts the opt-in alone.
 *
 * The missing-key refusal is unit-tested only: the e2e stack sets the key.
 */
import { SetProjectExportableApiKeySecretsDocument, Tenant } from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';
const ROLE_VIEWER = 'roles.names.organizationViewer';
const AUDIT_ACTION = 'SET_EXPORTABLE_API_KEY_SECRETS';

interface IdBody {
  data?: { id: string; exportableApiKeySecrets?: boolean };
}

interface AuditRow extends Record<string, unknown> {
  action: string;
  old_values: string | null;
  new_values: string | null;
  metadata: string | null;
  performed_by: string;
  scope_tenant: string | null;
  scope_id: string | null;
}

afterAll(async () => {
  await closeDbHelper();
});

function isForbidden(res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}): boolean {
  return Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );
}

describe('Per-project opt-in for exportable API-key secrets', () => {
  let owner: TestUser;
  let admin: TestUser;
  let dev: TestUser;
  let viewer: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let otherProjectId: string;
  let personalProjectId: string;

  const projectScope = (id = projectId) => ({
    tenant: Tenant.OrganizationProject,
    id: `${org.id}:${id}`,
  });

  const gqlSet = (
    token: string,
    scope: { tenant: Tenant; id: string },
    enabled: boolean,
    headers: Record<string, string> = {}
  ) =>
    graphqlRequest<{
      setProjectExportableApiKeySecrets?: { id: string; exportableApiKeySecrets: boolean };
    }>({
      query: print(SetProjectExportableApiKeySecretsDocument),
      accessToken: token,
      variables: { input: { scope, enabled } },
      headers,
    });

  const restSet = (
    token: string,
    pathProjectId: string,
    scope: { tenant: Tenant; id: string },
    enabled: boolean,
    headers: Record<string, string> = {}
  ) => {
    const req = apiClient()
      .put(`/api/projects/${pathProjectId}/exportable-api-key-secrets`)
      .set('Authorization', `Bearer ${token}`);
    for (const [name, value] of Object.entries(headers)) req.set(name, value);
    return req.send({ scope, enabled });
  };

  const scopeHeaders = (scope: { tenant: Tenant; id: string }) => ({
    'x-scope-tenant': scope.tenant,
    'x-scope-id': scope.id,
  });

  async function storedFlag(id: string): Promise<boolean> {
    const rows = await query<{ exportable_api_key_secrets: boolean }>`
      SELECT exportable_api_key_secrets FROM projects WHERE id = ${id}::uuid
    `;
    expect(rows).toHaveLength(1);
    return rows[0]!.exportable_api_key_secrets;
  }

  async function auditRows(id: string): Promise<AuditRow[]> {
    return query<AuditRow>`
      SELECT action, old_values, new_values, metadata, performed_by::text AS performed_by,
             scope_tenant, scope_id
      FROM project_audit_logs
      WHERE project_id = ${id}::uuid AND action = ${AUDIT_ACTION}
      ORDER BY created_at ASC
    `;
  }

  it('Setup: an organization with two projects, an Admin, a Dev and a Viewer', async () => {
    const stamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Exportable Secrets Org');

    const first = await owner.tryCreateProject(org.id, 'E2E Exportable Secrets Project');
    expect(first.status).toBe(201);
    projectId = (first.body as IdBody).data!.id;
    const second = await owner.tryCreateProject(org.id, 'E2E Exportable Secrets Other Project');
    expect(second.status).toBe(201);
    otherProjectId = (second.body as IdBody).data!.id;

    const adminEmail = `e2e-exp-secret-admin-${stamp}@test.grant.dev`;
    const devEmail = `e2e-exp-secret-dev-${stamp}@test.grant.dev`;
    const viewerEmail = `e2e-exp-secret-viewer-${stamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      adminEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_ADMIN))!
    );
    await owner.inviteMember(
      org.id,
      devEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    await owner.inviteMember(
      org.id,
      viewerEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_VIEWER))!
    );
    admin = await TestUser.create({ email: adminEmail, withOrgAccount: true });
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    viewer = await TestUser.create({ email: viewerEmail, withOrgAccount: true });
    await admin.acceptInvitation(org.id);
    await dev.acceptInvitation(org.id);
    await viewer.acceptInvitation(org.id);
  });

  it('is off by default and readable on the project', async () => {
    expect(await storedFlag(projectId)).toBe(false);

    const res = await graphqlRequest<{
      projects: { projects: Array<{ id: string; exportableApiKeySecrets: boolean }> };
    }>({
      query: `query ($scope: Scope!, $ids: [ID!]) {
        projects(scope: $scope, ids: $ids) { projects { id exportableApiKeySecrets } }
      }`,
      accessToken: owner.accessToken,
      variables: { scope: { tenant: Tenant.Organization, id: org.id }, ids: [projectId] },
    });

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.projects.projects).toEqual([
      { id: projectId, exportableApiKeySecrets: false },
    ]);
    expect(await auditRows(projectId)).toHaveLength(0);
  });

  it('Owner enables it through GraphQL: the flag reads true and one audit row records the change', async () => {
    const res = await gqlSet(owner.accessToken, projectScope(), true);

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectExportableApiKeySecrets).toMatchObject({
      id: projectId,
      exportableApiKeySecrets: true,
    });
    expect(await storedFlag(projectId)).toBe(true);

    const rows = await auditRows(projectId);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.old_values!)).toEqual({ exportableApiKeySecrets: false });
    expect(JSON.parse(rows[0]!.new_values!)).toEqual({ exportableApiKeySecrets: true });
    expect(JSON.parse(rows[0]!.metadata!)).toMatchObject({ copiesDeleted: 0 });
    expect(rows[0]!.performed_by).toBe(owner.userId);
    expect(rows[0]!.scope_id).toBe(`${org.id}:${projectId}`);
  });

  it('the project read reflects the enabled flag', async () => {
    const res = await graphqlRequest<{
      projects: { projects: Array<{ id: string; exportableApiKeySecrets: boolean }> };
    }>({
      query: `query ($scope: Scope!, $ids: [ID!]) {
        projects(scope: $scope, ids: $ids) { projects { id exportableApiKeySecrets } }
      }`,
      accessToken: owner.accessToken,
      variables: { scope: { tenant: Tenant.Organization, id: org.id }, ids: [projectId] },
    });

    expect(res.body.data?.projects.projects[0]?.exportableApiKeySecrets).toBe(true);
  });

  it('setting the value the project already has is a no-op: no write, no audit row', async () => {
    const before = await auditRows(projectId);
    const updatedAt = await query<{ updated_at: Date }>`
      SELECT updated_at FROM projects WHERE id = ${projectId}::uuid
    `;

    const graphql = await gqlSet(owner.accessToken, projectScope(), true);
    expect(graphql.body.errors, JSON.stringify(graphql.body.errors)).toBeUndefined();
    expect(graphql.body.data?.setProjectExportableApiKeySecrets?.exportableApiKeySecrets).toBe(
      true
    );

    const rest = await restSet(owner.accessToken, projectId, projectScope(), true);
    expect(rest.status, JSON.stringify(rest.body)).toBe(200);
    expect((rest.body as IdBody).data?.exportableApiKeySecrets).toBe(true);

    expect(await auditRows(projectId)).toHaveLength(before.length);
    const after = await query<{ updated_at: Date }>`
      SELECT updated_at FROM projects WHERE id = ${projectId}::uuid
    `;
    expect(after[0]!.updated_at).toEqual(updatedAt[0]!.updated_at);
  });

  it('Admin disables it through REST: the response carries the project and a second audit row follows', async () => {
    const res = await restSet(admin.accessToken, projectId, projectScope(), false);

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((res.body as IdBody).data).toMatchObject({
      id: projectId,
      exportableApiKeySecrets: false,
    });
    expect(await storedFlag(projectId)).toBe(false);

    const rows = await auditRows(projectId);
    expect(rows).toHaveLength(2);
    expect(JSON.parse(rows[1]!.old_values!)).toEqual({ exportableApiKeySecrets: true });
    expect(JSON.parse(rows[1]!.new_values!)).toEqual({ exportableApiKeySecrets: false });
    expect(rows[1]!.performed_by).toBe(admin.userId);
  });

  it('Dev and Viewer are denied through GraphQL and REST: nothing changes, no audit row', async () => {
    const before = await auditRows(projectId);
    const flag = await storedFlag(projectId);

    for (const member of [dev, viewer]) {
      expect(isForbidden(await gqlSet(member.accessToken, projectScope(), !flag))).toBe(true);
      const rest = await restSet(member.accessToken, projectId, projectScope(), !flag);
      expect(rest.status).toBe(403);
    }

    expect(await storedFlag(projectId)).toBe(flag);
    expect(await auditRows(projectId)).toHaveLength(before.length);
  });

  it('refuses a body scope that names another project than the one authorized, before any write', async () => {
    const before = await auditRows(otherProjectId);

    // Authorized for project A (headers); the body names project B in the same organization.
    const graphql = await gqlSet(
      owner.accessToken,
      projectScope(otherProjectId),
      true,
      scopeHeaders(projectScope())
    );
    expect(isForbidden(graphql)).toBe(true);

    const rest = await restSet(
      owner.accessToken,
      otherProjectId,
      projectScope(otherProjectId),
      true,
      scopeHeaders(projectScope())
    );
    expect(rest.status).toBe(403);

    expect(await storedFlag(otherProjectId)).toBe(false);
    expect(await auditRows(otherProjectId)).toHaveLength(before.length);
  });

  it('refuses a REST path id that names another project than the authorized scope, before any write', async () => {
    const before = await auditRows(otherProjectId);

    const rest = await restSet(owner.accessToken, otherProjectId, projectScope(), true);

    expect(rest.status).toBeGreaterThanOrEqual(400);
    expect(rest.status).toBeLessThan(500);
    expect(await storedFlag(otherProjectId)).toBe(false);
    expect(await auditRows(otherProjectId)).toHaveLength(before.length);
    expect(await storedFlag(projectId)).toBe(false);
  });

  it('refuses a scope that is not a project scope, and changes nothing', async () => {
    const orgScope = { tenant: Tenant.Organization, id: org.id };

    const graphql = await gqlSet(owner.accessToken, orgScope, true);
    expect(graphql.body.errors?.length ?? 0).toBeGreaterThan(0);
    expect(graphql.body.data?.setProjectExportableApiKeySecrets ?? null).toBeNull();

    const rest = await restSet(owner.accessToken, projectId, orgScope, true);
    expect(rest.status).toBeGreaterThanOrEqual(400);
    expect(rest.status).toBeLessThan(500);

    expect(await storedFlag(projectId)).toBe(false);
    expect(await auditRows(projectId)).toHaveLength(2);
  });

  it('the personal account owner can flip it for a personal project (AccountProject scope)', async () => {
    const created = await apiClient()
      .post('/api/projects')
      .set('Authorization', owner.authHeader)
      .send({
        name: 'E2E Exportable Secrets Personal Project',
        scope: { id: owner.accountId, tenant: Tenant.Account },
      });
    expect(created.status, JSON.stringify(created.body)).toBe(201);
    personalProjectId = (created.body as IdBody).data!.id;

    const scope = { tenant: Tenant.AccountProject, id: `${owner.accountId}:${personalProjectId}` };
    const res = await gqlSet(owner.accessToken, scope, true);

    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectExportableApiKeySecrets?.exportableApiKeySecrets).toBe(true);
    expect(await storedFlag(personalProjectId)).toBe(true);
    const rows = await auditRows(personalProjectId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.scope_id).toBe(scope.id);
  });
});
