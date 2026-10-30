/**
 * E2E: the encrypted exportable copy of a project user's API-key secret, its 88-character form,
 * and the plaintext fingerprint.
 *
 * In a project that opted in, a project-user key is issued as 64 random bytes of padded standard
 * base64 (88 characters), exchanges for a token like any other key, and has one encrypted copy
 * in `api_key_exportable_secrets` (rotate replaces it in place; revoke, delete and opting out
 * remove it). Without the opt-in, and for an organization-project key, nothing changes: the
 * 43-character form and no copy. The fingerprint (SHA-256 of the secret string as issued) is
 * stored for every project-user key and read through `User.apiKeyCredentials` by a holder of
 * `ProjectUser:ExportCredentials` only (`null` for everyone else).
 *
 * The secret appears nowhere it should not: not in the event outbox, not in any audit row, not
 * in a list of keys, not in the fingerprint read, not in a GraphQL error, not in the API logs,
 * and not in the stored copy (which is ciphertext). Nothing decrypts a copy in this slice, so
 * the plaintext is asserted only against the secret `createApiKey` and `rotateApiKey` returned.
 */
import { createHash } from 'node:crypto';

import {
  CreateApiKeyDocument,
  CreateUserDocument,
  DeleteApiKeyDocument,
  RevokeApiKeyDocument,
  RotateApiKeyDocument,
  SetProjectExportableApiKeySecretsDocument,
  Tenant,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { apiClient } from '../helpers/api-client';
import { containerLogsAvailable, readContainerLogs } from '../helpers/container-logs';
import { closeDbHelper, getOrganizationRoleIdByName, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { TestUser } from '../helpers/test-user';

const ROLE_DEV = 'roles.names.organizationDev';

interface IdBody {
  data?: { id: string };
}

interface KeyResult {
  id: string;
  clientId: string;
  clientSecret: string;
}

interface ApiKeyCredential {
  apiKeyId: string;
  clientId: string;
  fingerprint: string | null;
  exportable: boolean;
  updatedAt: string;
}

const USERS_API_KEY_CREDENTIALS_QUERY = `
  query UsersApiKeyCredentials($scope: Scope!, $ids: [ID!]) {
    users(scope: $scope, ids: $ids) {
      users {
        id
        apiKeyCredentials {
          apiKeyId
          clientId
          fingerprint
          exportable
          updatedAt
        }
      }
    }
  }
`;

interface UsersApiKeyCredentialsData {
  users?: { users?: Array<{ id: string; apiKeyCredentials: ApiKeyCredential[] | null }> };
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const BASE64_88 = /^[A-Za-z0-9+/]{86}==$/;
const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;

afterAll(async () => {
  await closeDbHelper();
});

describe('Exportable API-key secret copy', () => {
  afterAll(async () => {
    if (devGroup?.granted) {
      const restore = await apiClient()
        .patch(`/api/groups/${devGroup.id}`)
        .query({ scopeId: org.id, tenant: Tenant.Organization })
        .set('Authorization', owner.authHeader)
        .send({ permissionIds: devGroup.originalPermissionIds });
      expect(restore.status, JSON.stringify(restore.body)).toBe(200);
    }
  });

  let owner: TestUser;
  let holder: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let otherProjectId: string;
  let memberId: string;
  let otherMemberId: string;
  let stamp: string;

  /**
   * The Dev group is one row shared by every organization, so the grant below is global to the
   * stack. It is undone in `afterAll`: `operator-set-password-export` asserts that an ungranted
   * Dev is denied, and the files run one after another.
   */
  let devGroup: { id: string; originalPermissionIds: string[]; granted: boolean } | null = null;

  /** Every secret the scenario issued, for the final leak sweep. */
  const issuedSecrets: string[] = [];

  const projectScope = (id = projectId) => ({
    tenant: Tenant.OrganizationProject,
    id: `${org.id}:${id}`,
  });
  const userScope = (user: string, id = projectId) => ({
    tenant: Tenant.OrganizationProjectUser,
    id: `${org.id}:${id}:${user}`,
  });

  const gql = <T>(
    token: string,
    document: Parameters<typeof print>[0],
    variables: Record<string, unknown>
  ) => graphqlRequest<T>({ query: print(document), accessToken: token, variables });

  const setOptIn = (enabled: boolean, id = projectId) =>
    gql<{ setProjectExportableApiKeySecrets?: { exportableApiKeySecrets: boolean } }>(
      owner.accessToken,
      SetProjectExportableApiKeySecretsDocument,
      { input: { scope: projectScope(id), enabled } }
    );

  async function createUser(token: string, name: string, id = projectId): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(token, CreateUserDocument, {
      input: { name, scope: projectScope(id) },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createUser!.id;
  }

  async function createKey(user: string, id = projectId): Promise<KeyResult> {
    const res = await gql<{ createApiKey?: KeyResult }>(owner.accessToken, CreateApiKeyDocument, {
      input: { name: `E2E copy key ${stamp}`, scope: userScope(user, id) },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const key = res.body.data!.createApiKey!;
    issuedSecrets.push(key.clientSecret);
    return key;
  }

  async function rotateKey(keyId: string, user: string): Promise<KeyResult> {
    const res = await gql<{ rotateApiKey?: KeyResult }>(owner.accessToken, RotateApiKeyDocument, {
      input: { id: keyId, scope: userScope(user) },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const key = res.body.data!.rotateApiKey!;
    issuedSecrets.push(key.clientSecret);
    return key;
  }

  const exchange = (key: { clientId: string }, secret: string, user: string) =>
    apiClient()
      .post('/api/auth/token')
      .send({
        clientId: key.clientId,
        clientSecret: secret,
        scope: { tenant: Tenant.ProjectUser, id: `${projectId}:${user}` },
      });

  async function credentials(token: string, user: string, id = projectId) {
    const res = await graphqlRequest<UsersApiKeyCredentialsData>({
      query: USERS_API_KEY_CREDENTIALS_QUERY,
      accessToken: token,
      variables: { scope: projectScope(id), ids: [user] },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const entry = res.body.data?.users?.users?.find((candidate) => candidate.id === user);
    expect(entry, `member ${user} must be listed`).toBeDefined();
    return entry!.apiKeyCredentials;
  }

  async function copyRows(keyId: string) {
    return query<{
      encrypted_secret: string;
      secret_iv: string;
      secret_tag: string;
      project_id: string;
      updated_at: Date;
    }>`
      SELECT encrypted_secret, secret_iv, secret_tag, project_id::text AS project_id, updated_at
      FROM api_key_exportable_secrets WHERE api_key_id = ${keyId}::uuid
    `;
  }

  async function copyCount(id = projectId): Promise<number> {
    const rows = await query<{ n: string }>`
      SELECT count(*)::text AS n FROM api_key_exportable_secrets WHERE project_id = ${id}::uuid
    `;
    return Number(rows[0]!.n);
  }

  async function storedFingerprint(keyId: string): Promise<string | null> {
    const rows = await query<{ client_secret_fingerprint: string | null }>`
      SELECT client_secret_fingerprint FROM api_keys WHERE id = ${keyId}::uuid
    `;
    expect(rows).toHaveLength(1);
    return rows[0]!.client_secret_fingerprint;
  }

  async function storedHash(keyId: string): Promise<string> {
    const rows = await query<{ client_secret_hash: string }>`
      SELECT client_secret_hash FROM api_keys WHERE id = ${keyId}::uuid
    `;
    return rows[0]!.client_secret_hash;
  }

  it('Setup: two projects, members, and a Dev role granted ExportCredentials', async () => {
    stamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Key Copy Org');
    const first = await owner.tryCreateProject(org.id, 'E2E Key Copy Project');
    expect(first.status).toBe(201);
    projectId = (first.body as IdBody).data!.id;
    const second = await owner.tryCreateProject(org.id, 'E2E Key Copy Other Project');
    expect(second.status).toBe(201);
    otherProjectId = (second.body as IdBody).data!.id;

    memberId = await createUser(owner.accessToken, 'E2E Key Copy Member');
    otherMemberId = await createUser(
      owner.accessToken,
      'E2E Key Copy Other Member',
      otherProjectId
    );

    // ExportCredentials has no default holder: grant it to the Dev group, as the credential
    // export scenario does, and join a fresh Dev afterwards.
    const permissionRows = await query<{ id: string }>`
      SELECT p.id FROM permissions p
      INNER JOIN resources r ON r.id = p.resource_id
      WHERE p.action = ${'ExportCredentials'} AND r.slug = ${'ProjectUser'} AND p.deleted_at IS NULL
      LIMIT 1
    `;
    const groupRows = await query<{ id: string }>`
      SELECT g.id FROM groups g
      INNER JOIN role_groups rg ON rg.group_id = g.id AND rg.deleted_at IS NULL
      INNER JOIN roles r ON r.id = rg.role_id AND r.deleted_at IS NULL
      INNER JOIN organization_roles orl ON orl.role_id = r.id AND orl.deleted_at IS NULL
      WHERE orl.organization_id = ${org.id}::uuid AND r.name = ${ROLE_DEV}
        AND g.name = ${'groups.names.userDev'} AND g.deleted_at IS NULL
      LIMIT 1
    `;
    const groupId = groupRows[0]?.id;
    expect(permissionRows[0]?.id && groupId).toBeTruthy();
    const current = await query<{ permission_id: string }>`
      SELECT permission_id FROM group_permissions
      WHERE group_id = ${groupId}::uuid AND deleted_at IS NULL
    `;
    const originalPermissionIds = current.map((row) => row.permission_id);
    const granted = !originalPermissionIds.includes(permissionRows[0]!.id);
    devGroup = { id: groupId!, originalPermissionIds, granted };
    const permissionIds = [...new Set([...originalPermissionIds, permissionRows[0]!.id])];
    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ permissionIds });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const holderEmail = `e2e-key-copy-holder-${stamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      holderEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    holder = await TestUser.create({ email: holderEmail, withOrgAccount: true });
    await holder.acceptInvitation(org.id);
  });

  it('without the opt-in: the 43-character form, no copy, and the fingerprint is stored and readable by a holder', async () => {
    const key = await createKey(memberId);

    expect(key.clientSecret).toMatch(BASE64URL_43);
    expect(await copyRows(key.id)).toHaveLength(0);
    expect(await storedFingerprint(key.id)).toBe(sha256(key.clientSecret));
    expect(await storedFingerprint(key.id)).not.toBe(sha256(await storedHash(key.id)));

    const entries = await credentials(holder.accessToken, memberId);
    expect(entries).toEqual([
      {
        apiKeyId: key.id,
        clientId: key.clientId,
        fingerprint: sha256(key.clientSecret),
        exportable: false,
        updatedAt: expect.any(String),
      },
    ]);
    expect(JSON.stringify(entries)).not.toContain(key.clientSecret);
    expect(JSON.stringify(entries)).not.toContain(await storedHash(key.id));

    expect((await exchange(key, key.clientSecret, memberId)).status).toBe(200);
  });

  it('User.apiKeyCredentials is null for the Owner (no ExportCredentials), never an error', async () => {
    expect(await credentials(owner.accessToken, memberId)).toBeNull();
  });

  it('a key created before the fingerprint existed has a null fingerprint, and gets one when rotated', async () => {
    const key = await createKey(memberId);
    await query`UPDATE api_keys SET client_secret_fingerprint = NULL WHERE id = ${key.id}::uuid`;

    const legacy = (await credentials(holder.accessToken, memberId))!.find(
      (entry) => entry.apiKeyId === key.id
    );
    expect(legacy).toMatchObject({ fingerprint: null, exportable: false });

    const rotated = await rotateKey(key.id, memberId);
    const after = (await credentials(holder.accessToken, memberId))!.find(
      (entry) => entry.apiKeyId === key.id
    );
    expect(after?.fingerprint).toBe(sha256(rotated.clientSecret));
  });

  it('Owner enables the opt-in on the project', async () => {
    const res = await setOptIn(true);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectExportableApiKeySecrets?.exportableApiKeySecrets).toBe(true);
  });

  let optedInKey: KeyResult;

  it('opted in: a project-user key is 88 characters of standard base64, exchanges for a token, and has one encrypted copy', async () => {
    optedInKey = await createKey(memberId);

    expect(optedInKey.clientSecret).toMatch(BASE64_88);
    expect(Buffer.from(optedInKey.clientSecret, 'base64')).toHaveLength(64);

    const rows = await copyRows(optedInKey.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.project_id).toBe(projectId);
    expect(rows[0]!.secret_iv.length).toBeGreaterThan(0);
    expect(rows[0]!.secret_tag.length).toBeGreaterThan(0);
    // The stored copy is ciphertext: none of the forms of the secret appears in it.
    const stored = JSON.stringify(rows[0]);
    expect(stored).not.toContain(optedInKey.clientSecret);
    expect(stored).not.toContain(
      Buffer.from(optedInKey.clientSecret, 'base64').toString('base64url')
    );

    const token = await exchange(optedInKey, optedInKey.clientSecret, memberId);
    expect(token.status, JSON.stringify(token.body)).toBe(200);
    expect((token.body as { data?: { accessToken?: string } }).data?.accessToken).toBeTruthy();
    // The wrong secret is refused.
    expect(
      (
        await exchange(
          optedInKey,
          `${optedInKey.clientSecret.slice(0, 40)}AAAA${optedInKey.clientSecret.slice(44)}`,
          memberId
        )
      ).status
    ).toBe(401);
  });

  it('User.apiKeyCredentials shows exportable true and a fingerprint of the issued string, not of the hash', async () => {
    const entries = (await credentials(holder.accessToken, memberId))!;
    const entry = entries.find((candidate) => candidate.apiKeyId === optedInKey.id);

    expect(entry).toMatchObject({
      clientId: optedInKey.clientId,
      fingerprint: sha256(optedInKey.clientSecret),
      exportable: true,
    });
    expect(entry!.fingerprint).not.toBe(sha256(await storedHash(optedInKey.id)));
    expect(await credentials(owner.accessToken, memberId)).toBeNull();
    // Keys that predate the opt-in are listed as not exportable.
    expect(entries.filter((candidate) => !candidate.exportable).length).toBeGreaterThanOrEqual(1);
  });

  it('an organization-project key in an opted-in project keeps the 43-character form, with no copy and no fingerprint', async () => {
    const roleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;
    const res = await gql<{ createApiKey?: KeyResult }>(owner.accessToken, CreateApiKeyDocument, {
      input: { name: `E2E org-project key ${stamp}`, scope: projectScope(), roleId },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const key = res.body.data!.createApiKey!;
    issuedSecrets.push(key.clientSecret);

    expect(key.clientSecret).toMatch(BASE64URL_43);
    expect(await copyRows(key.id)).toHaveLength(0);
    expect(await storedFingerprint(key.id)).toBeNull();
  });

  it('rotate issues a new 88-character secret, replaces the copy in place and changes the fingerprint', async () => {
    const before = (await copyRows(optedInKey.id))[0]!;
    const fingerprintBefore = await storedFingerprint(optedInKey.id);

    const rotated = await rotateKey(optedInKey.id, memberId);

    expect(rotated.id).toBe(optedInKey.id);
    expect(rotated.clientSecret).toMatch(BASE64_88);
    expect(rotated.clientSecret).not.toBe(optedInKey.clientSecret);
    const rows = await copyRows(optedInKey.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.encrypted_secret).not.toBe(before.encrypted_secret);
    expect(rows[0]!.updated_at.getTime()).toBeGreaterThanOrEqual(before.updated_at.getTime());

    const fingerprintAfter = await storedFingerprint(optedInKey.id);
    expect(fingerprintAfter).toBe(sha256(rotated.clientSecret));
    expect(fingerprintAfter).not.toBe(fingerprintBefore);
    expect(
      (await credentials(holder.accessToken, memberId))!.find((e) => e.apiKeyId === optedInKey.id)
    ).toMatchObject({
      fingerprint: sha256(rotated.clientSecret),
      exportable: true,
    });

    expect((await exchange(optedInKey, optedInKey.clientSecret, memberId)).status).toBe(401);
    expect((await exchange(optedInKey, rotated.clientSecret, memberId)).status).toBe(200);
    optedInKey = { ...optedInKey, clientSecret: rotated.clientSecret };
  });

  it('revoke removes the copy', async () => {
    const key = await createKey(memberId);
    expect(await copyRows(key.id)).toHaveLength(1);

    const res = await gql<{ revokeApiKey?: { isRevoked: boolean } }>(
      owner.accessToken,
      RevokeApiKeyDocument,
      {
        input: { id: key.id, scope: userScope(memberId) },
      }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    expect(await copyRows(key.id)).toHaveLength(0);
    const entries = (await credentials(holder.accessToken, memberId))!;
    expect(entries.some((entry) => entry.apiKeyId === key.id)).toBe(false);
  });

  it.each([
    ['soft', false],
    ['hard', true],
  ])('a %s delete removes the copy', async (_label, hardDelete) => {
    const key = await createKey(memberId);
    expect(await copyRows(key.id)).toHaveLength(1);

    const res = await gql<{ deleteApiKey?: { id: string } }>(
      owner.accessToken,
      DeleteApiKeyDocument,
      {
        input: { id: key.id, scope: userScope(memberId), hardDelete },
      }
    );
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    expect(await copyRows(key.id)).toHaveLength(0);
  });

  it('a project that did not opt in is unaffected by another project having', async () => {
    const key = await createKey(otherMemberId, otherProjectId);

    expect(key.clientSecret).toMatch(BASE64URL_43);
    expect(await copyRows(key.id)).toHaveLength(0);
    expect(await copyCount(otherProjectId)).toBe(0);
  });

  it('the secret appears in no event, audit row, key list, fingerprint read, error or log', async () => {
    const live = issuedSecrets.filter((secret) => BASE64_88.test(secret));
    expect(live.length).toBeGreaterThanOrEqual(3);
    // Every form the same bytes can take, plus the fingerprint (derived, so allowed in the stored
    // column and the gated read, and nowhere else).
    const needles = live.flatMap((secret) => [
      secret,
      Buffer.from(secret, 'base64').toString('base64url'),
      Buffer.from(secret, 'base64').toString('hex'),
    ]);

    const rotatedBad = await gql(owner.accessToken, RotateApiKeyDocument, {
      input: { id: '00000000-0000-4000-8000-000000000000', scope: userScope(memberId) },
    });
    expect(rotatedBad.body.errors).toBeDefined();

    const keysRest = await apiClient()
      .get('/api/api-keys')
      .query({ scopeId: `${org.id}:${projectId}`, tenant: Tenant.OrganizationProject })
      .set('Authorization', owner.authHeader);
    expect(keysRest.status).toBe(200);
    const keysGraphql = await graphqlRequest({
      query: `query ($scope: Scope!) { apiKeys(scope: $scope) { apiKeys { id clientId name } } }`,
      accessToken: owner.accessToken,
      variables: { scope: projectScope() },
    });
    const fingerprintRead = await graphqlRequest({
      query: USERS_API_KEY_CREDENTIALS_QUERY,
      accessToken: holder.accessToken,
      variables: { scope: projectScope(), ids: [memberId] },
    });
    const fingerprintErrorCase = await graphqlRequest({
      query: USERS_API_KEY_CREDENTIALS_QUERY,
      accessToken: holder.accessToken,
      variables: { scope: { tenant: Tenant.Organization, id: org.id }, ids: [memberId] },
    });

    const surfaces: Record<string, unknown> = {
      'event outbox':
        await query`SELECT type, payload FROM event_log WHERE scope_id LIKE ${`%${projectId}%`}`,
      'api key audit rows': await query`SELECT * FROM api_key_audit_logs`,
      'project audit rows':
        await query`SELECT * FROM project_audit_logs WHERE project_id = ${projectId}::uuid`,
      'credential audit rows': await query`SELECT * FROM project_user_credential_audit_logs`,
      'REST key list': keysRest.body,
      'GraphQL key list': keysGraphql.body,
      'GraphQL error': rotatedBad.body,
      'fingerprint read in a non-project scope': fingerprintErrorCase.body,
    };
    for (const [surface, value] of Object.entries(surfaces)) {
      const text = JSON.stringify(value);
      for (const needle of needles) {
        expect(text, `${surface} must not contain a secret`).not.toContain(needle);
      }
    }

    // The fingerprint is the one derived value: present in the gated read, absent elsewhere.
    expect(JSON.stringify(fingerprintRead.body)).toContain(sha256(optedInKey.clientSecret));
    const fingerprints = live.map(sha256);
    for (const [surface, value] of Object.entries(surfaces)) {
      const text = JSON.stringify(value);
      for (const fingerprint of fingerprints) {
        expect(text, `${surface} must not contain a fingerprint`).not.toContain(fingerprint);
      }
    }
    for (const needle of needles) {
      expect(JSON.stringify(fingerprintRead.body)).not.toContain(needle);
    }

    if (containerLogsAvailable()) {
      const logs = readContainerLogs();
      for (const needle of needles) {
        expect(logs, 'the API logs must not contain a secret').not.toContain(needle);
      }
    }
  });

  it('opting out deletes every copy of the project and the audit row says how many', async () => {
    const extra = await createKey(memberId);
    expect(await copyRows(extra.id)).toHaveLength(1);
    const before = await copyCount();
    expect(before).toBeGreaterThanOrEqual(2);

    const res = await setOptIn(false);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    expect(res.body.data?.setProjectExportableApiKeySecrets?.exportableApiKeySecrets).toBe(false);

    expect(await copyCount()).toBe(0);
    const audit = await query<{ metadata: string; new_values: string }>`
      SELECT metadata, new_values FROM project_audit_logs
      WHERE project_id = ${projectId}::uuid AND action = ${'SET_EXPORTABLE_API_KEY_SECRETS'}
      ORDER BY created_at DESC LIMIT 1
    `;
    expect(JSON.parse(audit[0]!.new_values)).toEqual({ exportableApiKeySecrets: false });
    expect(JSON.parse(audit[0]!.metadata)).toMatchObject({ copiesDeleted: before });

    // The keys themselves stay valid; only the copies are gone.
    expect((await exchange(extra, extra.clientSecret, memberId)).status).toBe(200);
    expect(
      (await credentials(holder.accessToken, memberId))!.every((entry) => !entry.exportable)
    ).toBe(true);

    // Turned off, the next key is Grant's own form again.
    const after = await createKey(memberId);
    expect(after.clientSecret).toMatch(BASE64URL_43);
    expect(await copyRows(after.id)).toHaveLength(0);
  });
});
