/**
 * E2E: audited project credential export and the `User.passwordCredential` fingerprint.
 *
 * `ProjectUser:ExportCredentials` is held by no standard group: Owner and Admin are denied.
 * A role whose group is granted it (as Dev's is here) exports `{ algorithm: 'bcrypt', hash }`
 * equal to the stored hash. That is the one place a hash appears. A non-member in `userIds`
 * fails the whole call; every successful call writes exactly one `export` audit row (counts and
 * kinds, never a hash); an unauthorized or failed call writes none.
 *
 * `User.passwordCredential` is selected end to end through `users(scope:)` in the project
 * scope: `null` for a caller without the permission (the Owner), `{ source, updatedAt,
 * fingerprint }` for a holder, with the fingerprint equal to the lowercase hex SHA-256 of the
 * hash the export returns. An API key holding `ExportCredentials` exports too, and its audit
 * row is attributed to the system user with the key id in metadata.
 */
import { createHash } from 'node:crypto';

import {
  CreateApiKeyDocument,
  CreateUserDocument,
  ExportProjectUserCredentialsDocument,
  SetProjectUserPasswordDocument,
  Tenant,
  TokenType,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const STRONG_PASSWORD = 'Operator-Export-Passw0rd-7!';
const OTHER_PASSWORD = 'Operator-Export-Other-Passw0rd-9!';

const ROLE_ADMIN = 'roles.names.organizationAdmin';
const ROLE_DEV = 'roles.names.organizationDev';

interface IdBody {
  data?: { id: string };
}

interface ExportResult {
  exportProjectUserCredentials?: {
    users: Array<{ userId: string; password: { algorithm: string; hash: string } | null }>;
  };
}

const USERS_PASSWORD_CREDENTIAL_QUERY = `
  query UsersPasswordCredential($scope: Scope!, $ids: [ID!]) {
    users(scope: $scope, ids: $ids) {
      users {
        id
        passwordCredential {
          source
          updatedAt
          fingerprint
        }
      }
    }
  }
`;

interface UsersPasswordCredentialData {
  users?: {
    users?: Array<{
      id: string;
      passwordCredential: { source: string; updatedAt: string; fingerprint: string } | null;
    }>;
  };
}

interface AuditRow extends Record<string, unknown> {
  action: string;
  old_values: string | null;
  new_values: string | null;
  metadata: string | null;
  performed_by: string | null;
  project_user_credential_id: string | null;
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

// The seeded system user (SYSTEM_USER_ID default); API-key actors are attributed to it.
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID ?? '00000000-0000-0000-0000-000000000000';

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');

describe('Operator credential export', () => {
  let owner: TestUser;
  let admin: TestUser;
  let dev: TestUser;
  let exporter: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let withPasswordId: string;
  let withoutPasswordId: string;
  let outsiderId: string;
  let uniqueStamp: string;

  const projectScope = () => ({ tenant: Tenant.OrganizationProject, id: `${org.id}:${projectId}` });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

  const exportGql = (token: string, userIds: string[], extra: Record<string, unknown> = {}) =>
    gql<ExportResult>(token, ExportProjectUserCredentialsDocument, {
      input: { scope: projectScope(), userIds, ...extra },
    });

  const exportRest = (authHeader: string, userIds: string[], extra: Record<string, unknown> = {}) =>
    apiClient()
      .post('/api/users/credentials/export')
      .set('Authorization', authHeader)
      .send({ scope: projectScope(), userIds, ...extra });

  /** `User.passwordCredential` of each id, in the request's project scope, for this token. */
  async function passwordCredentials(token: string, ids: string[]) {
    const res = await graphqlRequest<UsersPasswordCredentialData>({
      query: USERS_PASSWORD_CREDENTIAL_QUERY,
      accessToken: token,
      variables: { scope: projectScope(), ids },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const byId = new Map(
      (res.body.data?.users?.users ?? []).map((user) => [user.id, user.passwordCredential])
    );
    for (const id of ids) {
      expect(byId.has(id), `member ${id} must be listed`).toBe(true);
    }
    return byId;
  }

  async function exportAuditRows(): Promise<AuditRow[]> {
    return query<AuditRow>`
      SELECT action, old_values, new_values, metadata, performed_by::text AS performed_by,
             project_user_credential_id::text AS project_user_credential_id, scope_id
      FROM project_user_credential_audit_logs
      WHERE action = 'export' AND scope_id = ${`${org.id}:${projectId}`}
      ORDER BY created_at ASC
    `;
  }

  async function storedHash(userId: string): Promise<string> {
    const rows = await query<{ hash: string }>`
      SELECT hash FROM project_user_credentials
      WHERE project_id = ${projectId}::uuid AND user_id = ${userId}::uuid AND deleted_at IS NULL
    `;
    expect(rows).toHaveLength(1);
    return rows[0]!.hash;
  }

  async function createProjectUser(token: string, name: string): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(token, CreateUserDocument, {
      input: { name, scope: projectScope() },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createUser!.id;
  }

  const setPassword = (token: string, userId: string, password: string) =>
    gql<{ setProjectUserPassword?: { id: string } }>(token, SetProjectUserPasswordDocument, {
      input: { userId, password, scope: projectScope() },
    });

  it('Setup: org, project, roles, members with and without a credential', async () => {
    uniqueStamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Export Org');
    const projectRes = await owner.tryCreateProject(org.id, 'E2E Export Project');
    expect(projectRes.status).toBe(201);
    projectId = (projectRes.body as IdBody).data!.id;

    const adminRoleId = await getOrganizationRoleIdByName(org.id, ROLE_ADMIN);
    const devRoleId = await getOrganizationRoleIdByName(org.id, ROLE_DEV);
    expect(adminRoleId && devRoleId).toBeTruthy();

    const adminEmail = `e2e-export-admin-${uniqueStamp}@test.grant.dev`;
    const devEmail = `e2e-export-dev-${uniqueStamp}@test.grant.dev`;
    await owner.inviteMember(org.id, adminEmail, adminRoleId!);
    await owner.inviteMember(org.id, devEmail, devRoleId!);
    admin = await TestUser.create({ email: adminEmail, withOrgAccount: true });
    dev = await TestUser.create({ email: devEmail, withOrgAccount: true });
    await admin.acceptInvitation(org.id);
    await dev.acceptInvitation(org.id);

    withPasswordId = await createProjectUser(owner.accessToken, 'E2E Export With Password');
    withoutPasswordId = await createProjectUser(owner.accessToken, 'E2E Export Without Password');
    const set = await setPassword(owner.accessToken, withPasswordId, STRONG_PASSWORD);
    expect(set.body.errors, JSON.stringify(set.body.errors)).toBeUndefined();

    const outsider = await TestUser.create({ withOrgAccount: true });
    const profile = await outsider.getProfile();
    outsiderId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } }).data!
      .accounts![0]!.owner!.id;
  });

  it('Owner, Admin and an ungranted Dev are denied (403) and nothing is audited', async () => {
    const before = (await exportAuditRows()).length;

    expect(isForbidden(await exportGql(owner.accessToken, [withPasswordId]))).toBe(true);
    expect(isForbidden(await exportGql(admin.accessToken, [withPasswordId]))).toBe(true);
    expect(isForbidden(await exportGql(dev.accessToken, [withPasswordId]))).toBe(true);
    expect((await exportRest(owner.authHeader, [withPasswordId])).status).toBe(403);
    expect((await exportRest(admin.authHeader, [withPasswordId])).status).toBe(403);
    expect((await exportRest(dev.authHeader, [withPasswordId])).status).toBe(403);

    expect((await exportAuditRows()).length).toBe(before);
  });

  it('Owner stays denied after a Dev role group is granted ExportCredentials (no default holder)', async () => {
    const permissionRows = await query<{ id: string }>`
      SELECT p.id
      FROM permissions p
      INNER JOIN resources r ON r.id = p.resource_id
      WHERE p.action = ${'ExportCredentials'}
        AND r.slug = ${'ProjectUser'}
        AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const exportPermissionId = permissionRows[0]?.id;
    expect(exportPermissionId).toBeTruthy();

    const groupRows = await query<{ id: string }>`
      SELECT g.id
      FROM groups g
      INNER JOIN role_groups rg ON rg.group_id = g.id AND rg.deleted_at IS NULL
      INNER JOIN roles r ON r.id = rg.role_id AND r.deleted_at IS NULL
      INNER JOIN organization_roles orl ON orl.role_id = r.id AND orl.deleted_at IS NULL
      WHERE orl.organization_id = ${org.id}::uuid
        AND r.name = ${ROLE_DEV}
        AND g.name = ${'groups.names.userDev'}
        AND g.deleted_at IS NULL
      LIMIT 1
    `;
    const groupId = groupRows[0]?.id;
    expect(groupId).toBeTruthy();

    const current = await query<{ permission_id: string }>`
      SELECT permission_id
      FROM group_permissions
      WHERE group_id = ${groupId}::uuid AND deleted_at IS NULL
    `;
    const permissionIds = [
      ...new Set([...current.map((row) => row.permission_id), exportPermissionId!]),
    ];

    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ permissionIds });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    // A fresh Dev joins after the grant, as the set-password scenario does.
    const grantedEmail = `e2e-export-dev2-${uniqueStamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      grantedEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    exporter = await TestUser.create({ email: grantedEmail, withOrgAccount: true });
    await exporter.acceptInvitation(org.id);

    expect(isForbidden(await exportGql(owner.accessToken, [withPasswordId]))).toBe(true);
  });

  it('exports { algorithm: bcrypt, hash } equal to the stored hash, null for a member without a credential, in request order', async () => {
    const hash = await storedHash(withPasswordId);
    expect(hash).toMatch(/^\$2[aby]\$/);

    const res = await exportGql(exporter.accessToken, [withoutPasswordId, withPasswordId]);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.exportProjectUserCredentials?.users).toEqual([
      { userId: withoutPasswordId, password: null },
      { userId: withPasswordId, password: { algorithm: 'bcrypt', hash } },
    ]);
  });

  it('every successful call writes exactly one export audit row: counts and kinds, no hash', async () => {
    const hash = await storedHash(withPasswordId);
    const before = (await exportAuditRows()).length;

    const res = await exportGql(exporter.accessToken, [withPasswordId, withoutPasswordId]);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const rows = await exportAuditRows();
    expect(rows).toHaveLength(before + 1);
    const row = rows[rows.length - 1]!;
    expect(row.action).toBe('export');
    expect(row.performed_by).toBe(exporter.userId);
    expect(row.project_user_credential_id).toBeNull();
    expect(row.old_values).toBeNull();
    expect(row.new_values).toBeNull();
    expect(JSON.parse(row.metadata!)).toMatchObject({
      userCount: 2,
      credentialCount: 1,
      kinds: ['PASSWORD'],
    });
    for (const value of Object.values(row)) {
      expect(JSON.stringify(value)).not.toContain(hash);
    }
  });

  it('an OrganizationProject API key holding ExportCredentials exports (200) and is audited as the system user, with the key id in metadata', async () => {
    const hash = await storedHash(withPasswordId);
    const devRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;

    // The Dev group was granted ExportCredentials above, so a key minted with the Dev role holds it.
    const created = await gql<{
      createApiKey?: { id: string; clientId: string; clientSecret: string };
    }>(owner.accessToken, CreateApiKeyDocument, {
      input: { name: `E2E export key ${uniqueStamp}`, scope: projectScope(), roleId: devRoleId },
    });
    expect(created.body.errors, JSON.stringify(created.body.errors)).toBeUndefined();
    const key = created.body.data!.createApiKey!;
    expect(key.id && key.clientId && key.clientSecret).toBeTruthy();

    const exchange = await apiClient()
      .post('/api/auth/token')
      .send({ clientId: key.clientId, clientSecret: key.clientSecret, scope: projectScope() });
    expect(exchange.status, JSON.stringify(exchange.body)).toBe(200);
    const keyToken = (exchange.body as { data?: { accessToken?: string } }).data?.accessToken;
    expect(keyToken).toBeTruthy();

    const before = (await exportAuditRows()).length;
    const res = await exportRest(`Bearer ${keyToken}`, [withPasswordId, withoutPasswordId]);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect((res.body as { data: unknown }).data).toEqual({
      users: [
        { userId: withPasswordId, password: { algorithm: 'bcrypt', hash } },
        { userId: withoutPasswordId, password: null },
      ],
    });

    const rows = await exportAuditRows();
    expect(rows).toHaveLength(before + 1);
    const row = rows[rows.length - 1]!;
    expect(row.action).toBe('export');
    expect(row.performed_by).toBe(SYSTEM_USER_ID);
    expect(JSON.parse(row.metadata!)).toMatchObject({
      userCount: 2,
      credentialCount: 1,
      kinds: ['PASSWORD'],
      actorTokenId: key.id,
      actorTokenType: TokenType.ApiKey,
    });
    for (const value of Object.values(row)) {
      expect(JSON.stringify(value)).not.toContain(hash);
      expect(JSON.stringify(value)).not.toContain(key.clientSecret);
    }
  });

  it('one non-member in userIds fails the whole call (404) and writes no audit row', async () => {
    const before = (await exportAuditRows()).length;

    const res = await exportGql(exporter.accessToken, [withPasswordId, outsiderId]);
    expect(res.body.data?.exportProjectUserCredentials ?? null).toBeNull();
    expect(
      res.body.errors?.some(
        (e) => e.extensions?.code === 'NOT_FOUND' || e.message.toLowerCase().includes('not found')
      )
    ).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain(await storedHash(withPasswordId));

    const rest = await exportRest(exporter.authHeader, [withPasswordId, outsiderId]);
    expect(rest.status).toBe(404);
    expect(JSON.stringify(rest.body)).not.toContain(await storedHash(withPasswordId));

    expect((await exportAuditRows()).length).toBe(before);
  });

  it('refuses an empty list, a non-project scope and empty kinds (the over-cap list is a handler unit test), without auditing', async () => {
    const before = (await exportAuditRows()).length;

    expect((await exportGql(exporter.accessToken, [])).body.errors).toBeDefined();
    expect((await exportRest(exporter.authHeader, [])).status).toBe(400);
    expect((await exportRest(exporter.authHeader, [withPasswordId], { kinds: [] })).status).toBe(
      400
    );
    const orgScoped = await apiClient()
      .post('/api/users/credentials/export')
      .set('Authorization', exporter.authHeader)
      .send({ scope: { tenant: Tenant.Organization, id: org.id }, userIds: [withPasswordId] });
    expect(orgScoped.status).toBeGreaterThanOrEqual(400);
    expect(orgScoped.status).toBeLessThan(500);

    expect((await exportAuditRows()).length).toBe(before);
  });

  it('REST POST /api/users/credentials/export returns the same shape, is no-store and audited once', async () => {
    const hash = await storedHash(withPasswordId);
    const before = (await exportAuditRows()).length;

    const res = await exportRest(exporter.authHeader, [withPasswordId, withoutPasswordId], {
      kinds: ['PASSWORD'],
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    expect((res.body as { data: unknown }).data).toEqual({
      users: [
        { userId: withPasswordId, password: { algorithm: 'bcrypt', hash } },
        { userId: withoutPasswordId, password: null },
      ],
    });
    expect((await exportAuditRows()).length).toBe(before + 1);
  });

  it('User.passwordCredential is null for the Owner and { source, updatedAt, fingerprint } for a holder', async () => {
    const hash = await storedHash(withPasswordId);
    const ids = [withPasswordId, withoutPasswordId];

    const asOwner = await passwordCredentials(owner.accessToken, ids);
    expect(asOwner.get(withPasswordId)).toBeNull();
    expect(asOwner.get(withoutPasswordId)).toBeNull();

    const asHolder = await passwordCredentials(exporter.accessToken, ids);
    const credential = asHolder.get(withPasswordId);
    expect(credential).toMatchObject({ source: 'admin-set', fingerprint: sha256(hash) });
    expect(credential!.fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(credential!.updatedAt))).toBe(false);
    expect(JSON.stringify(credential)).not.toContain(hash);
    // A member without a project credential is null even for a holder.
    expect(asHolder.get(withoutPasswordId)).toBeNull();

    // The export of the same user returns the hash the fingerprint was computed from.
    const exported = await exportGql(exporter.accessToken, [withPasswordId]);
    expect(exported.body.data!.exportProjectUserCredentials!.users[0]!.password!.hash).toBe(hash);
  });

  it('the fingerprint changes after a set and equals sha256 of the exported hash', async () => {
    const first = await exportGql(exporter.accessToken, [withPasswordId]);
    const firstHash = first.body.data!.exportProjectUserCredentials!.users[0]!.password!.hash;
    const firstFingerprint = (
      await passwordCredentials(exporter.accessToken, [withPasswordId])
    ).get(withPasswordId)!.fingerprint;
    expect(firstFingerprint).toBe(sha256(firstHash));

    const set = await setPassword(owner.accessToken, withPasswordId, OTHER_PASSWORD);
    expect(set.body.errors, JSON.stringify(set.body.errors)).toBeUndefined();

    const second = await exportGql(exporter.accessToken, [withPasswordId]);
    const secondHash = second.body.data!.exportProjectUserCredentials!.users[0]!.password!.hash;

    expect(secondHash).not.toBe(firstHash);
    expect(sha256(secondHash)).not.toBe(sha256(firstHash));
    expect(secondHash).toBe(await storedHash(withPasswordId));
    const secondFingerprint = (
      await passwordCredentials(exporter.accessToken, [withPasswordId])
    ).get(withPasswordId)!.fingerprint;
    expect(secondFingerprint).toBe(sha256(secondHash));
    expect(secondFingerprint).not.toBe(firstFingerprint);
  });
});
