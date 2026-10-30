/**
 * E2E: exporting a project user's API-key secret through the credential export (ADR 0013).
 *
 * In a project that opted in to exportable API-key secrets, `kinds: [API_KEY_SECRET]` returns, per
 * member, the live project-user keys with the plaintext secret of each key that has an
 * encrypted copy and `secret: null` for a key without one. The exported secret is the string
 * `createApiKey` / `rotateApiKey` returned and exchanges for a token at `POST /api/auth/token`
 * (Grant's half of the signing proof). The gate is `ProjectUser:ExportCredentials`, the same as
 * for password hashes: an Owner, and a Dev whose group does not hold it, are refused with no
 * audit row. Every successful call writes one summary row and one `api_key_audit_logs` row per
 * exported secret (the key id, never a secret). Only the member's keys **in the project** are
 * listed.
 *
 * The sentinel: every secret the scenario issued appears in the export response bodies and
 * nowhere else. Not in the event outbox, a webhook envelope, an audit row, a key list, the
 * fingerprint read, a CDM snapshot, a GraphQL error or the API logs.
 *
 * The Dev group is one row shared by every organization, so the grant below is global to the
 * stack: it is undone in `afterAll`, because `operator-set-password-export` asserts that an
 * ungranted Dev is denied and the files run one after another.
 */
import { createHash } from 'node:crypto';

import {
  CreateApiKeyDocument,
  CreateUserDocument,
  DeleteApiKeyDocument,
  ExportProjectUserCredentialsDocument,
  RevokeApiKeyDocument,
  RotateApiKeyDocument,
  SetProjectExportableApiKeySecretsDocument,
  Tenant,
  TokenType,
} from '@grantjs/schema';
import { print } from 'graphql';
import { afterAll, describe, expect, it } from 'vitest';

import { buildCloudEventEnvelope } from '../../../src/lib/webhooks/webhook-envelope.lib';
import { exportInput } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { containerLogsAvailable, readContainerLogs } from '../helpers/container-logs';
import {
  addProjectUserForE2e,
  closeDbHelper,
  getOrganizationRoleIdByName,
  query,
} from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import {
  downloadSnapshot,
  postExport,
  resolveJob,
  scopeForOrganizationProject,
} from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const ROLE_DEV = 'roles.names.organizationDev';
// The seeded system user (SYSTEM_USER_ID default); API-key actors are attributed to it.
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID ?? '00000000-0000-0000-0000-000000000000';

interface IdBody {
  data?: { id: string };
}

interface KeyResult {
  id: string;
  clientId: string;
  clientSecret: string;
}

interface ExportedKey {
  apiKeyId: string;
  clientId: string;
  fingerprint: string | null;
  secret: string | null;
}

interface ExportedUser {
  userId: string;
  password: { algorithm: string; hash: string } | null;
  apiKeySecrets: ExportedKey[] | null;
}

interface ExportResult {
  exportProjectUserCredentials?: { users: ExportedUser[] };
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
  };
  occurred_at: Date;
}

interface AuditRow extends Record<string, unknown> {
  action: string;
  old_values: string | null;
  new_values: string | null;
  metadata: string | null;
  performed_by: string | null;
  scope_id: string | null;
}

interface KeyAuditRow extends AuditRow {
  api_key_id: string;
}

const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const BASE64_88 = /^[A-Za-z0-9+/]{86}==$/;
const BASE64URL_43 = /^[A-Za-z0-9_-]{43}$/;

function isForbidden(res: {
  body: { errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
}): boolean {
  return Boolean(
    res.body.errors?.some((e) => e.message === 'Forbidden' || e.extensions?.code === 'FORBIDDEN')
  );
}

function envelopeOf(row: EventRow) {
  return buildCloudEventEnvelope(
    {
      id: row.id,
      sequence: Number(row.sequence),
      type: row.type as 'api_key.created',
      category: row.category as 'iam',
      deliveryClass: row.delivery_class,
      scope: { tenant: row.scope_tenant as typeof Tenant.Organization, id: row.scope_id },
      actorUserId: row.actor_user_id,
      subjectUserId: row.subject_user_id,
      aggregate: row.payload.aggregate,
      data: row.payload.data ?? {},
      occurredAt: row.occurred_at,
    },
    'https://grant.e2e.invalid'
  );
}

afterAll(async () => {
  await closeDbHelper();
});

describe('Exporting an API-key secret through the credential export', () => {
  let owner: TestUser;
  let devUngranted: TestUser;
  let exporter: TestUser;
  let org: { id: string; name: string; slug: string };
  let projectId: string;
  let otherProjectId: string;
  let memberId: string;
  let emptyMemberId: string;
  let outsiderId: string;
  let subscriptionId: string;
  let stamp: string;

  let devGroup: { id: string; originalPermissionIds: string[]; granted: boolean } | null = null;

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

  /** Every secret the scenario issued, for the final leak sweep. */
  const issuedSecrets: string[] = [];
  /** Every export response body, the one place a secret may appear. */
  const exportBodies: string[] = [];

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

  const exportGql = async (
    token: string,
    userIds: string[],
    kinds: string[] = ['API_KEY_SECRET'],
    id = projectId
  ) => {
    const res = await gql<ExportResult>(token, ExportProjectUserCredentialsDocument, {
      input: { scope: projectScope(id), userIds, kinds },
    });
    exportBodies.push(JSON.stringify(res.body));
    return res;
  };

  const exportRest = async (
    authHeader: string,
    userIds: string[],
    extra: Record<string, unknown> = {},
    id = projectId
  ) => {
    const res = await apiClient()
      .post('/api/users/credentials/export')
      .set('Authorization', authHeader)
      .send({ scope: projectScope(id), userIds, ...extra });
    exportBodies.push(JSON.stringify(res.body));
    return res;
  };

  const keysOf = (res: Awaited<ReturnType<typeof exportGql>>, userId: string) => {
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const entry = res.body.data!.exportProjectUserCredentials!.users.find(
      (candidate) => candidate.userId === userId
    );
    expect(entry, `member ${userId} must be listed`).toBeDefined();
    return entry!.apiKeySecrets!;
  };

  const setOptIn = (enabled: boolean, id = projectId) =>
    gql<{ setProjectExportableApiKeySecrets?: { exportableApiKeySecrets: boolean } }>(
      owner.accessToken,
      SetProjectExportableApiKeySecretsDocument,
      { input: { scope: projectScope(id), enabled } }
    );

  async function createUser(name: string, id = projectId): Promise<string> {
    const res = await gql<{ createUser?: { id: string } }>(owner.accessToken, CreateUserDocument, {
      input: { name, scope: projectScope(id) },
    });
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    return res.body.data!.createUser!.id;
  }

  async function createKey(user: string, id = projectId): Promise<KeyResult> {
    const res = await gql<{ createApiKey?: KeyResult }>(owner.accessToken, CreateApiKeyDocument, {
      input: { name: `E2E export key ${stamp}`, scope: userScope(user, id) },
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

  const exchange = (clientId: string, secret: string, user: string, id = projectId) =>
    apiClient()
      .post('/api/auth/token')
      .send({
        clientId,
        clientSecret: secret,
        scope: { tenant: Tenant.ProjectUser, id: `${id}:${user}` },
      });

  async function summaryRows(): Promise<AuditRow[]> {
    return query<AuditRow>`
      SELECT action, old_values, new_values, metadata, performed_by::text AS performed_by, scope_id
      FROM project_user_credential_audit_logs
      WHERE action = 'export' AND scope_id = ${`${org.id}:${projectId}`}
      ORDER BY created_at ASC
    `;
  }

  async function keyExportRows(): Promise<KeyAuditRow[]> {
    return query<KeyAuditRow>`
      SELECT api_key_id::text AS api_key_id, action, old_values, new_values, metadata,
             performed_by::text AS performed_by, scope_id
      FROM api_key_audit_logs
      WHERE action = 'export' AND scope_id = ${`${org.id}:${projectId}`}
      ORDER BY created_at ASC
    `;
  }

  async function storedHash(keyId: string): Promise<string> {
    const rows = await query<{ client_secret_hash: string }>`
      SELECT client_secret_hash FROM api_keys WHERE id = ${keyId}::uuid
    `;
    return rows[0]!.client_secret_hash;
  }

  async function copyRow(keyId: string) {
    return query<{ encrypted_secret: string; secret_iv: string; secret_tag: string }>`
      SELECT encrypted_secret, secret_iv, secret_tag
      FROM api_key_exportable_secrets WHERE api_key_id = ${keyId}::uuid
    `;
  }

  // Keys by name, in creation order, for the assertions below.
  let legacyKey: KeyResult;
  let keyOne: KeyResult;
  let keyTwo: KeyResult;

  it('Setup: org, two projects, members, a Dev before and after the ExportCredentials grant', async () => {
    stamp = `${Date.now()}`;
    owner = await TestUser.create({ withOrgAccount: true });
    org = await owner.createOrganization('E2E Key Export Org');
    const first = await owner.tryCreateProject(org.id, 'E2E Key Export Project');
    expect(first.status).toBe(201);
    projectId = (first.body as IdBody).data!.id;
    const second = await owner.tryCreateProject(org.id, 'E2E Key Export Other Project');
    expect(second.status).toBe(201);
    otherProjectId = (second.body as IdBody).data!.id;

    memberId = await createUser('E2E Key Export Member');
    emptyMemberId = await createUser('E2E Key Export Member Without Keys');
    const outsider = await TestUser.create({ withOrgAccount: true });
    const profile = await outsider.getProfile();
    outsiderId = (profile.body as { data?: { accounts?: Array<{ owner?: { id: string } }> } }).data!
      .accounts![0]!.owner!.id;

    // A subscription to the two events that name a key, before any key exists.
    const sub = await apiClient()
      .post('/api/webhook-subscriptions')
      .set('Authorization', owner.authHeader)
      .send({
        scope: projectScope(),
        url: 'https://example.com/grant-e2e-key-export',
        eventTypes: ['api_key.created', 'api_key.rotated'],
        description: 'E2E key export sentinel',
        active: true,
      });
    expect(sub.status).toBe(201);
    subscriptionId = (sub.body as IdBody).data!.id;

    // A Dev joins first: it holds no ExportCredentials yet.
    const devRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;
    const ungrantedEmail = `e2e-key-export-dev-${stamp}@test.grant.dev`;
    await owner.inviteMember(org.id, ungrantedEmail, devRoleId);
    devUngranted = await TestUser.create({ email: ungrantedEmail, withOrgAccount: true });
    await devUngranted.acceptInvitation(org.id);
  });

  it('Owner and an ungranted Dev are refused (403) for the API_KEY_SECRET kind, and nothing is audited', async () => {
    const summaries = (await summaryRows()).length;
    const keyRows = (await keyExportRows()).length;

    for (const user of [owner, devUngranted]) {
      expect(isForbidden(await exportGql(user.accessToken, [memberId]))).toBe(true);
      expect(
        (await exportRest(user.authHeader, [memberId], { kinds: ['API_KEY_SECRET'] })).status
      ).toBe(403);
    }

    expect((await summaryRows()).length).toBe(summaries);
    expect((await keyExportRows()).length).toBe(keyRows);
  });

  it('Setup: grant ExportCredentials to the Dev group, join a fresh Dev, create a key before the opt-in', async () => {
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
    devGroup = {
      id: groupId!,
      originalPermissionIds,
      granted: !originalPermissionIds.includes(permissionRows[0]!.id),
    };
    const patch = await apiClient()
      .patch(`/api/groups/${groupId}`)
      .query({ scopeId: org.id, tenant: Tenant.Organization })
      .set('Authorization', owner.authHeader)
      .send({ permissionIds: [...new Set([...originalPermissionIds, permissionRows[0]!.id])] });
    expect(patch.status, JSON.stringify(patch.body)).toBe(200);

    const exporterEmail = `e2e-key-export-holder-${stamp}@test.grant.dev`;
    await owner.inviteMember(
      org.id,
      exporterEmail,
      (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!
    );
    exporter = await TestUser.create({ email: exporterEmail, withOrgAccount: true });
    await exporter.acceptInvitation(org.id);

    // Created before the opt-in: Grant's own form and no copy.
    legacyKey = await createKey(memberId);
    expect(legacyKey.clientSecret).toMatch(BASE64URL_43);
    expect(await copyRow(legacyKey.id)).toHaveLength(0);
  });

  it('Owner stays refused after the grant (no default holder)', async () => {
    expect(isForbidden(await exportGql(owner.accessToken, [memberId]))).toBe(true);
  });

  it('opted in, a project-user key is created with a copy', async () => {
    const res = await setOptIn(true);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    keyOne = await createKey(memberId);
    keyTwo = await createKey(memberId);
    for (const key of [keyOne, keyTwo]) {
      expect(key.clientSecret).toMatch(BASE64_88);
      expect(await copyRow(key.id)).toHaveLength(1);
    }
  });

  it('exports the secret the key was created with, the fingerprint and the client id, oldest key first; a key without a copy has secret null', async () => {
    const before = {
      summaries: (await summaryRows()).length,
      keyRows: (await keyExportRows()).length,
    };

    const res = await exportGql(exporter.accessToken, [memberId, emptyMemberId]);

    const keys = keysOf(res, memberId);
    expect(keys).toEqual([
      {
        apiKeyId: legacyKey.id,
        clientId: legacyKey.clientId,
        fingerprint: sha256(legacyKey.clientSecret),
        secret: null,
      },
      {
        apiKeyId: keyOne.id,
        clientId: keyOne.clientId,
        fingerprint: sha256(keyOne.clientSecret),
        secret: keyOne.clientSecret,
      },
      {
        apiKeyId: keyTwo.id,
        clientId: keyTwo.clientId,
        fingerprint: sha256(keyTwo.clientSecret),
        secret: keyTwo.clientSecret,
      },
    ]);
    // A member with no key is listed with an empty list, and the password kind was not asked for.
    expect(keysOf(res, emptyMemberId)).toEqual([]);
    for (const user of res.body.data!.exportProjectUserCredentials!.users) {
      expect(user.password).toBeNull();
    }
    // The receiver can verify the pair it was handed.
    for (const key of keys.filter((entry) => entry.secret !== null)) {
      expect(sha256(key.secret!)).toBe(key.fingerprint);
    }

    // One summary row; one key row for each exported secret and none for the key without a copy.
    expect((await summaryRows()).length).toBe(before.summaries + 1);
    expect((await keyExportRows()).length).toBe(before.keyRows + 2);
  });

  it('the exported secret exchanges for a token (Grant half of the signing proof), the wrong one does not', async () => {
    const res = await exportGql(exporter.accessToken, [memberId]);
    const exported = keysOf(res, memberId).find((entry) => entry.apiKeyId === keyOne.id)!;

    expect(exported.secret).toBe(keyOne.clientSecret);
    expect(exported.secret).toMatch(BASE64_88);
    const token = await exchange(exported.clientId, exported.secret!, memberId);
    expect(token.status, JSON.stringify(token.body)).toBe(200);
    expect((token.body as { data?: { accessToken?: string } }).data?.accessToken).toBeTruthy();
    expect(
      (
        await exchange(
          exported.clientId,
          `${exported.secret!.slice(0, 40)}AAAA${exported.secret!.slice(44)}`,
          memberId
        )
      ).status
    ).toBe(401);
  });

  it('writes one summary row and one key row per exported secret: ids, never a secret, a hash, a ciphertext or a fingerprint', async () => {
    const summariesBefore = (await summaryRows()).length;
    const keyRowsBefore = (await keyExportRows()).length;

    const res = await exportGql(exporter.accessToken, [memberId, emptyMemberId]);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();

    const summaries = await summaryRows();
    expect(summaries).toHaveLength(summariesBefore + 1);
    const summary = summaries[summaries.length - 1]!;
    expect(summary.performed_by).toBe(exporter.userId);
    expect(JSON.parse(summary.metadata!)).toMatchObject({
      projectId,
      userCount: 2,
      credentialCount: 2,
      kinds: ['API_KEY_SECRET'],
    });

    const keyRows = (await keyExportRows()).slice(keyRowsBefore);
    expect(keyRows.map((row) => row.api_key_id).sort()).toEqual([keyOne.id, keyTwo.id].sort());
    for (const row of keyRows) {
      expect(row.performed_by).toBe(exporter.userId);
      expect(row.old_values).toBeNull();
      expect(row.new_values).toBeNull();
      expect(JSON.parse(row.metadata!)).toEqual({
        projectId,
        userId: memberId,
        kind: 'API_KEY_SECRET',
      });
    }

    const everything = JSON.stringify([summary, keyRows]);
    for (const key of [keyOne, keyTwo]) {
      const copy = (await copyRow(key.id))[0]!;
      for (const forbidden of [
        key.clientSecret,
        sha256(key.clientSecret),
        await storedHash(key.id),
        copy.encrypted_secret,
        copy.secret_iv,
        copy.secret_tag,
      ]) {
        expect(everything).not.toContain(forbidden);
      }
    }
  });

  it('REST returns the same shape for both kinds, is no-store, and is audited once', async () => {
    const before = {
      summaries: (await summaryRows()).length,
      keyRows: (await keyExportRows()).length,
    };

    const res = await exportRest(exporter.authHeader, [memberId, emptyMemberId], {
      kinds: ['PASSWORD', 'API_KEY_SECRET'],
    });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.headers['cache-control']).toContain('no-store');
    const users = (res.body as { data: { users: ExportedUser[] } }).data.users;
    expect(users[0]).toEqual({
      userId: memberId,
      password: null,
      apiKeySecrets: [
        expect.objectContaining({ apiKeyId: legacyKey.id, secret: null }),
        expect.objectContaining({ apiKeyId: keyOne.id, secret: keyOne.clientSecret }),
        expect.objectContaining({ apiKeyId: keyTwo.id, secret: keyTwo.clientSecret }),
      ],
    });
    expect(users[1]).toEqual({ userId: emptyMemberId, password: null, apiKeySecrets: [] });

    const summaries = await summaryRows();
    expect(summaries).toHaveLength(before.summaries + 1);
    expect(JSON.parse(summaries[summaries.length - 1]!.metadata!)).toMatchObject({
      kinds: ['PASSWORD', 'API_KEY_SECRET'],
      credentialCount: 2,
    });
    expect((await keyExportRows()).length).toBe(before.keyRows + 2);
  });

  it('an OrganizationProject API key holding ExportCredentials exports, and its rows are the system user with the key id in metadata', async () => {
    const devRoleId = (await getOrganizationRoleIdByName(org.id, ROLE_DEV))!;
    const created = await gql<{ createApiKey?: KeyResult }>(
      owner.accessToken,
      CreateApiKeyDocument,
      {
        input: { name: `E2E exporter key ${stamp}`, scope: projectScope(), roleId: devRoleId },
      }
    );
    expect(created.body.errors, JSON.stringify(created.body.errors)).toBeUndefined();
    const caller = created.body.data!.createApiKey!;
    const exchanged = await apiClient().post('/api/auth/token').send({
      clientId: caller.clientId,
      clientSecret: caller.clientSecret,
      scope: projectScope(),
    });
    expect(exchanged.status, JSON.stringify(exchanged.body)).toBe(200);
    const callerToken = (exchanged.body as { data?: { accessToken?: string } }).data?.accessToken;
    expect(callerToken).toBeTruthy();

    const keyRowsBefore = (await keyExportRows()).length;
    const summariesBefore = (await summaryRows()).length;
    const res = await exportRest(`Bearer ${callerToken}`, [memberId], {
      kinds: ['API_KEY_SECRET'],
    });
    expect(res.status, JSON.stringify(res.body)).toBe(200);

    const summary = (await summaryRows()).slice(summariesBefore);
    const keyRows = (await keyExportRows()).slice(keyRowsBefore);
    expect(summary).toHaveLength(1);
    expect(keyRows).toHaveLength(2);
    for (const row of [...summary, ...keyRows]) {
      expect(row.performed_by).toBe(SYSTEM_USER_ID);
      expect(JSON.parse(row.metadata!)).toMatchObject({
        actorTokenId: caller.id,
        actorTokenType: TokenType.ApiKey,
      });
      expect(JSON.stringify(row)).not.toContain(caller.clientSecret);
    }
  });

  it('a non-member in userIds fails the whole call (404), exports nothing and writes no row', async () => {
    const before = {
      summaries: (await summaryRows()).length,
      keyRows: (await keyExportRows()).length,
    };

    const res = await exportGql(exporter.accessToken, [memberId, outsiderId]);
    expect(res.body.data?.exportProjectUserCredentials ?? null).toBeNull();
    expect(
      res.body.errors?.some(
        (e) => e.extensions?.code === 'NOT_FOUND' || e.message.toLowerCase().includes('not found')
      )
    ).toBe(true);
    const rest = await exportRest(exporter.authHeader, [memberId, outsiderId], {
      kinds: ['API_KEY_SECRET'],
    });
    expect(rest.status).toBe(404);
    for (const body of [JSON.stringify(res.body), JSON.stringify(rest.body)]) {
      expect(body).not.toContain(keyOne.clientSecret);
    }

    expect((await summaryRows()).length).toBe(before.summaries);
    expect((await keyExportRows()).length).toBe(before.keyRows);
  });

  it('lists only the keys of the project exported from: a key of the same member in another project is neither listed nor opened', async () => {
    await addProjectUserForE2e(otherProjectId, memberId);
    const optIn = await setOptIn(true, otherProjectId);
    expect(optIn.body.errors, JSON.stringify(optIn.body.errors)).toBeUndefined();
    const elsewhere = await createKey(memberId, otherProjectId);
    expect(elsewhere.clientSecret).toMatch(BASE64_88);
    expect(await copyRow(elsewhere.id)).toHaveLength(1);

    const fromFirst = keysOf(await exportGql(exporter.accessToken, [memberId]), memberId);
    expect(fromFirst.map((entry) => entry.apiKeyId)).toEqual([legacyKey.id, keyOne.id, keyTwo.id]);
    expect(JSON.stringify(fromFirst)).not.toContain(elsewhere.clientSecret);
    expect(JSON.stringify(fromFirst)).not.toContain(elsewhere.clientId);

    // The exporter's role belongs to the organization, so it holds the permission in the other
    // project too: that project lists only its own key.
    const fromOther = keysOf(
      await exportGql(exporter.accessToken, [memberId], ['API_KEY_SECRET'], otherProjectId),
      memberId
    );
    expect(fromOther).toEqual([
      {
        apiKeyId: elsewhere.id,
        clientId: elsewhere.clientId,
        fingerprint: sha256(elsewhere.clientSecret),
        secret: elsewhere.clientSecret,
      },
    ]);
    expect(JSON.stringify(fromOther)).not.toContain(keyOne.clientSecret);
  });

  it('after a rotate the export returns the new secret and fingerprint, and not the old secret', async () => {
    const oldSecret = keyOne.clientSecret;
    const rotated = await rotateKey(keyOne.id, memberId);
    expect(rotated.clientSecret).toMatch(BASE64_88);

    const res = await exportGql(exporter.accessToken, [memberId]);
    const exported = keysOf(res, memberId).find((entry) => entry.apiKeyId === keyOne.id)!;
    expect(exported.secret).toBe(rotated.clientSecret);
    expect(exported.fingerprint).toBe(sha256(rotated.clientSecret));
    expect(JSON.stringify(res.body)).not.toContain(oldSecret);
    expect((await exchange(exported.clientId, exported.secret!, memberId)).status).toBe(200);
    expect((await exchange(exported.clientId, oldSecret, memberId)).status).toBe(401);
    keyOne = { ...keyOne, clientSecret: rotated.clientSecret };
  });

  it('a revoked and a deleted key are no longer exported', async () => {
    const revoked = await createKey(memberId);
    const deleted = await createKey(memberId);
    expect(
      keysOf(await exportGql(exporter.accessToken, [memberId]), memberId).map((e) => e.apiKeyId)
    ).toEqual(expect.arrayContaining([revoked.id, deleted.id]));

    const revoke = await gql(owner.accessToken, RevokeApiKeyDocument, {
      input: { id: revoked.id, scope: userScope(memberId) },
    });
    expect(revoke.body.errors, JSON.stringify(revoke.body.errors)).toBeUndefined();
    const del = await gql(owner.accessToken, DeleteApiKeyDocument, {
      input: { id: deleted.id, scope: userScope(memberId), hardDelete: false },
    });
    expect(del.body.errors, JSON.stringify(del.body.errors)).toBeUndefined();

    const after = keysOf(await exportGql(exporter.accessToken, [memberId]), memberId).map(
      (entry) => entry.apiKeyId
    );
    expect(after).not.toContain(revoked.id);
    expect(after).not.toContain(deleted.id);
  });

  it('the secret appears in the export responses and nowhere else', async () => {
    const live = issuedSecrets.filter((secret) => BASE64_88.test(secret));
    expect(live.length).toBeGreaterThanOrEqual(5);
    const needles = live.flatMap((secret) => [
      secret,
      Buffer.from(secret, 'base64').toString('base64url'),
      Buffer.from(secret, 'base64').toString('hex'),
    ]);

    // Positive control: the export bodies do carry the secrets (otherwise the sweep proves nothing).
    const exported = exportBodies.join('\n');
    expect(exported).toContain(keyOne.clientSecret);
    expect(exported).toContain(keyTwo.clientSecret);

    // The events that name a key: wait for the webhook deliveries of the creates and the rotate.
    const deadline = Date.now() + 25_000;
    let deliveries: EventRow[] = [];
    while (Date.now() < deadline) {
      deliveries = await query<EventRow>`
        SELECT e.id, e.sequence, e.type, e.category, e.delivery_class, e.scope_tenant, e.scope_id,
               e.actor_user_id, e.subject_user_id, e.payload, e.occurred_at
        FROM webhook_delivery_attempts d
        INNER JOIN event_log e ON e.id = d.event_id
        WHERE d.subscription_id = ${subscriptionId}::uuid
        ORDER BY e.sequence
      `;
      if (
        deliveries.some(
          (row) => row.type === 'api_key.created' && row.payload.aggregate?.id === keyOne.id
        ) &&
        deliveries.some(
          (row) => row.type === 'api_key.rotated' && row.payload.aggregate?.id === keyOne.id
        )
      ) {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    expect(deliveries.some((row) => row.type === 'api_key.created')).toBe(true);
    expect(deliveries.some((row) => row.type === 'api_key.rotated')).toBe(true);

    // A forced GraphQL error that names the kind: a non-project scope.
    const forced = await graphqlRequest({
      query: print(ExportProjectUserCredentialsDocument),
      accessToken: exporter.accessToken,
      variables: {
        input: {
          scope: { tenant: Tenant.Organization, id: org.id },
          userIds: [memberId],
          kinds: ['API_KEY_SECRET'],
        },
      },
    });
    expect(forced.body.errors).toBeDefined();

    // The key lists of the project and of the member (where the member's keys are listed).
    const listScopes = [projectScope(), userScope(memberId)];
    const keysRest = await Promise.all(
      listScopes.map((scope) =>
        apiClient()
          .get('/api/api-keys')
          .query({ scopeId: scope.id, tenant: scope.tenant })
          .set('Authorization', owner.authHeader)
      )
    );
    for (const res of keysRest) {
      expect(res.status).toBe(200);
    }
    const keysGraphql = await Promise.all(
      listScopes.map((scope) =>
        graphqlRequest({
          query: `query ($scope: Scope!) { apiKeys(scope: $scope) { apiKeys { id clientId name } } }`,
          accessToken: owner.accessToken,
          variables: { scope },
        })
      )
    );
    const fingerprintRead = await graphqlRequest({
      query: `query ($scope: Scope!, $ids: [ID!]) {
        users(scope: $scope, ids: $ids) { users { id apiKeyCredentials { apiKeyId clientId fingerprint exportable updatedAt } } }
      }`,
      accessToken: exporter.accessToken,
      variables: { scope: projectScope(), ids: [memberId] },
    });

    // The CDM export of the project, with its user keys.
    const cdmScope = scopeForOrganizationProject(org.id, projectId);
    const cdmJob = await postExport(
      owner.authHeader,
      projectId,
      cdmScope,
      exportInput({ includeUserApiKeys: true })
    );
    expect(cdmJob.status).toBe(202);
    await resolveJob(owner.authHeader, projectId, cdmScope, cdmJob.job);
    const snapshot = await downloadSnapshot(owner.authHeader, projectId, cdmJob.job!.id, cdmScope);
    expect(snapshot.status).toBe(200);

    const surfaces: Record<string, unknown> = {
      'event outbox':
        await query`SELECT type, payload FROM event_log WHERE scope_id LIKE ${`%${projectId}%`}`,
      'webhook envelopes': deliveries.map(envelopeOf),
      'webhook delivery rows':
        await query`SELECT to_jsonb(d) AS delivery FROM webhook_delivery_attempts d WHERE d.subscription_id = ${subscriptionId}::uuid`,
      'api key audit rows': await query`SELECT * FROM api_key_audit_logs`,
      'credential audit rows': await query`SELECT * FROM project_user_credential_audit_logs`,
      'project audit rows':
        await query`SELECT * FROM project_audit_logs WHERE project_id = ${projectId}::uuid`,
      'REST key lists': keysRest.map((res) => res.body),
      'GraphQL key lists': keysGraphql.map((res) => res.body),
      'GraphQL error': forced.body,
      'CDM snapshot': snapshot.snapshot,
    };
    // Positive controls: the sweep reads real rows (an empty surface would pass vacuously).
    expect(JSON.stringify(surfaces['event outbox'])).toContain('api_key.rotated');
    expect(JSON.stringify(surfaces['webhook envelopes'])).toContain(keyOne.id);
    expect(JSON.stringify(surfaces['api key audit rows'])).toContain(keyTwo.id);
    expect(JSON.stringify(surfaces['credential audit rows'])).toContain('API_KEY_SECRET');
    expect(JSON.stringify(surfaces['REST key lists'])).toContain(keyTwo.id);
    expect(JSON.stringify(surfaces['GraphQL key lists'])).toContain(keyTwo.clientId);
    expect(JSON.stringify(surfaces['CDM snapshot']).length).toBeGreaterThan(100);

    for (const [surface, value] of Object.entries(surfaces)) {
      const text = JSON.stringify(value);
      for (const needle of needles) {
        expect(text, `${surface} must not contain a secret`).not.toContain(needle);
      }
    }

    // The fingerprint read: the derived value is there, a secret never is.
    const fingerprintText = JSON.stringify(fingerprintRead.body);
    expect(fingerprintText).toContain(sha256(keyTwo.clientSecret));
    for (const needle of needles) {
      expect(fingerprintText).not.toContain(needle);
    }

    if (containerLogsAvailable()) {
      const logs = readContainerLogs();
      for (const needle of needles) {
        expect(logs, 'the API logs must not contain a secret').not.toContain(needle);
      }
    }
  });

  it('opting out deletes the copies: the export then lists the keys with secret null and writes no key row', async () => {
    const res = await setOptIn(false);
    expect(res.body.errors, JSON.stringify(res.body.errors)).toBeUndefined();
    const keyRowsBefore = (await keyExportRows()).length;

    const after = keysOf(await exportGql(exporter.accessToken, [memberId]), memberId);

    expect(after.length).toBeGreaterThanOrEqual(3);
    expect(after.every((entry) => entry.secret === null)).toBe(true);
    expect(after.every((entry) => typeof entry.fingerprint === 'string')).toBe(true);
    expect((await keyExportRows()).length).toBe(keyRowsBefore);
  });
});
