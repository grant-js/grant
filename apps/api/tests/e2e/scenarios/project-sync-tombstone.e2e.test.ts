/**
 * E2E: a person who deletes an imported identity stays deleted (deletion tombstones).
 *
 * The identities here are real users who sign in (an import-created identity has no
 * credential and cannot call the self-deletion route), marked by an import: by
 * `key.grantUserId` for the key path, by `findBy: email` for the address path. They delete
 * themselves through `DELETE /api/me/accounts` (`MeHandler.deleteMyAccounts` ->
 * `UserService.deleteOwnUser`), then the same document is imported again.
 *
 * All addresses are on example.com. The tombstone table holds a fingerprint of the key, never
 * the key; the job's result and its error messages never carry a key either.
 *
 * Prerequisites: E2E stack with JOBS_ENABLED=true, JOB_PROVIDER=node-cron and
 * CDM_API_KEY_FINGERPRINT_HMAC_SECRET set (docker-compose.e2e.yml does).
 */
import { CdmFindBy, ProjectSyncJobStatus } from '@grantjs/schema';
import { afterAll, describe, expect, it } from 'vitest';

import type { CdmDocumentInput } from '@/lib/cdm/cdm-document.schemas';

import { cdmWithRoleTemplate } from '../../helpers/cdm-sync-fixtures';
import { apiClient } from '../helpers/api-client';
import { addProjectUserForE2e, closeDbHelper, query } from '../helpers/db-tokens';
import { graphqlRequest } from '../helpers/graphql';
import { postImport, resolveJob, scopeForAccountProject } from '../helpers/sync-job';
import { TestUser } from '../helpers/test-user';

const BCRYPT_HASH = '$2a$10$NnYC771KbJNAJLrrFr5PD.A0KJg1eS9vxvLCiZyJ2WYfW6tAS6tzG';
const API_KEY_SECRET = `e2e-tombstone-key-secret-${'x'.repeat(16)}`;

interface CountRow extends Record<string, unknown> {
  count: string;
}
interface FingerprintRow extends Record<string, unknown> {
  external_key_fingerprint: string;
  kind: string;
}

async function createAccountProject(owner: TestUser, name: string): Promise<string> {
  const res = await apiClient()
    .post('/api/projects')
    .set('Authorization', owner.authHeader)
    .send({ name, scope: { id: owner.accountId, tenant: 'account' } });
  expect(res.status).toBe(201);
  const projectId = (res.body as { data?: { id: string } }).data?.id;
  expect(projectId).toBeDefined();
  return projectId!;
}

function userEntry(
  roleKey: string,
  key: { value: string; findBy: CdmFindBy; grantUserId?: string },
  extra: Record<string, unknown> = {}
) {
  return {
    key: { value: key.value, findBy: key.findBy, grantUserId: key.grantUserId },
    name: 'Tombstone Person',
    roles: [roleKey],
    groups: [],
    permissions: [],
    tags: [],
    primaryTag: null,
    apiKeys: [],
    metadata: null,
    ...extra,
  };
}

function keyedDocument(
  roleKey: string,
  key: string,
  options: { grantUserId?: string; withApiKey?: boolean } = {}
): CdmDocumentInput {
  return cdmWithRoleTemplate(roleKey, {
    users: [
      userEntry(
        roleKey,
        { value: key, findBy: CdmFindBy.Key, grantUserId: options.grantUserId },
        {
          apiKeys: options.withApiKey
            ? [
                {
                  key: `bot-${key}`,
                  clientSecret: API_KEY_SECRET,
                  clientId: null,
                  name: 'Bot',
                  description: null,
                  expiresAt: null,
                  metadata: null,
                },
              ]
            : [],
        }
      ),
    ],
  } as Partial<CdmDocumentInput>);
}

function emailDocument(roleKey: string, address: string, withPassword = false): CdmDocumentInput {
  return cdmWithRoleTemplate(roleKey, {
    users: [
      userEntry(
        roleKey,
        { value: address, findBy: CdmFindBy.Email },
        withPassword ? { password: { algorithm: 'bcrypt', hash: BCRYPT_HASH } } : {}
      ),
    ],
  } as Partial<CdmDocumentInput>);
}

async function runImport(owner: TestUser, projectId: string, cdm: CdmDocumentInput) {
  const scope = scopeForAccountProject(owner.accountId, projectId);
  const res = await postImport(owner.authHeader, projectId, scope, cdm);
  expect(res.status).toBe(202);
  return resolveJob(owner.authHeader, projectId, scope, res.job, ProjectSyncJobStatus.Completed);
}

async function count(sql: Promise<CountRow[]>): Promise<number> {
  return Number((await sql)[0]?.count ?? '0');
}

const tombstoneRows = (projectId: string) =>
  query<FingerprintRow>`
    SELECT external_key_fingerprint, kind
    FROM cdm_import_tombstones
    WHERE project_id = ${projectId}::uuid
  `;

/** Live members of the project carrying this key whose user is live. */
const liveKeyedMembers = (projectId: string, key: string) =>
  count(query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM project_users pu
    JOIN users u ON u.id = pu.user_id AND u.deleted_at IS NULL
    WHERE pu.project_id = ${projectId}::uuid
      AND pu.deleted_at IS NULL
      AND pu.metadata->'cdmImport'->>'externalKey' = ${key}
  `);

const usersCreatedByImportsOf = (projectId: string) =>
  count(query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM users
    WHERE metadata->'cdmImport'->>'projectId' = ${projectId}
  `);

const liveApiKeysOfLiveUsers = (projectId: string) =>
  count(query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM project_user_api_keys p
    JOIN api_keys k ON k.id = p.api_key_id AND k.deleted_at IS NULL
    JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
    WHERE p.project_id = ${projectId}::uuid AND p.deleted_at IS NULL
  `);

const projectCredentials = (projectId: string) =>
  count(query<CountRow>`
    SELECT COUNT(*)::text AS count
    FROM project_user_credentials
    WHERE project_id = ${projectId}::uuid
  `);

afterAll(async () => {
  await closeDbHelper();
});

describe('Project sync jobs - deletion tombstones', () => {
  it('(a) keeps a self-deleted keyed identity out: no user, membership, role or API key comes back', async () => {
    const owner = await TestUser.create();
    const person = await TestUser.create();
    const suffix = Date.now();
    const roleKey = `tomb-role-${suffix}`;
    const key = `legacy-tomb-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E tombstone key');

    // Import 1 marks the real user with the key, gives them a role and an API key.
    const first = await runImport(
      owner,
      projectId,
      keyedDocument(roleKey, key, { grantUserId: person.userId!, withApiKey: true })
    );
    expect(first.result?.usersCreated).toBe(0);
    expect(first.result?.projectUserApiKeysCreated).toBe(1);
    expect(first.result?.usersSkippedTombstoned).toBe(0);
    expect(await liveKeyedMembers(projectId, key)).toBe(1);
    expect(await liveApiKeysOfLiveUsers(projectId)).toBe(1);
    expect(await tombstoneRows(projectId)).toHaveLength(0);

    // The person deletes themselves through the real self-deletion route.
    const deletion = await person.deleteAccount();
    expect(deletion.status).toBe(200);

    // The tombstone is a fingerprint: no key, no user id.
    const rows = await tombstoneRows(projectId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.kind).toBe('user');
    expect(rows[0]!.external_key_fingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(key);
    expect(JSON.stringify(rows)).not.toContain(person.userId!);

    // The same document, imported again (without the hint: the receiver's own export).
    const second = await runImport(
      owner,
      projectId,
      keyedDocument(roleKey, key, { withApiKey: true })
    );
    expect(second.result).toMatchObject({
      usersCreated: 0,
      usersSkippedTombstoned: 1,
      projectUsersEnsured: 0,
      userRolesAssigned: 0,
      projectUserApiKeysCreated: 0,
    });
    expect(await usersCreatedByImportsOf(projectId)).toBe(0);
    expect(await liveKeyedMembers(projectId, key)).toBe(0);
    expect(await liveApiKeysOfLiveUsers(projectId)).toBe(0);
    expect(JSON.stringify(second)).not.toContain(key);
  });

  it('(b) does the same for an e-mail keyed identity, and drops its password without failing', async () => {
    const owner = await TestUser.create();
    const suffix = Date.now();
    const address = `tombstone-${suffix}@example.com`;
    const person = await TestUser.create({ email: address });
    const roleKey = `tomb-email-role-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E tombstone email');

    const first = await runImport(owner, projectId, emailDocument(roleKey, address, true));
    expect(first.result).toMatchObject({ usersCreated: 0, passwordsImported: 1 });
    expect(await liveKeyedMembers(projectId, address)).toBe(1);

    expect((await person.deleteAccount()).status).toBe(200);

    // The row holds the fingerprint of the address, not the address.
    const rows = await tombstoneRows(projectId);
    expect(rows).toHaveLength(1);
    expect(JSON.stringify(rows)).not.toContain('example.com');
    expect(JSON.stringify(rows)).not.toContain(`tombstone-${suffix}`);
    const credentialsAfterDeletion = await projectCredentials(projectId);

    // The deleted user's e-mail method is still live in the table; the import must not
    // treat it as a live identity, nor create a second one for the address.
    const second = await runImport(owner, projectId, emailDocument(roleKey, address, true));
    expect(second.result).toMatchObject({
      usersCreated: 0,
      usersSkippedTombstoned: 1,
      projectUsersEnsured: 0,
      passwordsImported: 0,
      passwordsUpdated: 0,
      passwordsUnchanged: 0,
    });
    expect(await liveKeyedMembers(projectId, address)).toBe(0);
    expect(await projectCredentials(projectId)).toBe(credentialsAfterDeletion);
    expect(JSON.stringify(second)).not.toContain(address);
  });

  it('(c) writes no tombstone for a Grant-native user who deletes themselves', async () => {
    const owner = await TestUser.create();
    const native = await TestUser.create();
    const projectId = await createAccountProject(owner, 'E2E tombstone native');
    await addProjectUserForE2e(projectId, native.userId!);

    expect((await native.deleteAccount()).status).toBe(200);

    expect(await tombstoneRows(projectId)).toHaveLength(0);
  });

  it('(d) writes no tombstone when an operator removes an imported user from the project: the next import re-adds them', async () => {
    const owner = await TestUser.create();
    const person = await TestUser.create();
    const suffix = Date.now();
    const roleKey = `tomb-operator-role-${suffix}`;
    const key = `legacy-operator-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E tombstone operator');
    const document = keyedDocument(roleKey, key, { grantUserId: person.userId! });

    await runImport(owner, projectId, document);
    expect(await liveKeyedMembers(projectId, key)).toBe(1);

    // The operator path: `deleteUser` in a project scope removes the membership only.
    const removal = await graphqlRequest({
      query: 'mutation($id: ID!, $scope: Scope!) { deleteUser(id: $id, scope: $scope) { id } }',
      variables: {
        id: person.userId,
        scope: { tenant: 'accountProject', id: `${owner.accountId}:${projectId}` },
      },
      accessToken: owner.accessToken,
    });
    expect(removal.status).toBe(200);
    expect(removal.body.errors).toBeUndefined();
    expect(await liveKeyedMembers(projectId, key)).toBe(0);
    expect(await tombstoneRows(projectId)).toHaveLength(0);

    const again = await runImport(owner, projectId, document);
    expect(again.result?.usersSkippedTombstoned).toBe(0);
    expect(await liveKeyedMembers(projectId, key)).toBe(1);
  });

  it('(e) leaves the same external key in a second project alone', async () => {
    const owner = await TestUser.create();
    const person = await TestUser.create();
    const suffix = Date.now();
    const roleKey = `tomb-two-role-${suffix}`;
    const key = `legacy-two-${suffix}`;
    const projectA = await createAccountProject(owner, 'E2E tombstone project A');
    const projectB = await createAccountProject(owner, 'E2E tombstone project B');

    await runImport(owner, projectA, keyedDocument(roleKey, key, { grantUserId: person.userId! }));
    expect((await person.deleteAccount()).status).toBe(200);
    expect(await tombstoneRows(projectA)).toHaveLength(1);
    expect(await tombstoneRows(projectB)).toHaveLength(0);

    const inB = await runImport(owner, projectB, keyedDocument(roleKey, key));
    expect(inB.result).toMatchObject({ usersCreated: 1, usersSkippedTombstoned: 0 });
    expect(await liveKeyedMembers(projectB, key)).toBe(1);
  });

  it('(f) imports a live user matched by grantUserId even when a tombstone covers the key', async () => {
    const owner = await TestUser.create();
    const gone = await TestUser.create();
    const returning = await TestUser.create();
    const suffix = Date.now();
    const roleKey = `tomb-return-role-${suffix}`;
    const key = `legacy-return-${suffix}`;
    const projectId = await createAccountProject(owner, 'E2E tombstone return');

    await runImport(owner, projectId, keyedDocument(roleKey, key, { grantUserId: gone.userId! }));
    expect((await gone.deleteAccount()).status).toBe(200);
    expect(await tombstoneRows(projectId)).toHaveLength(1);

    // Without a hint the key is blocked ...
    const blocked = await runImport(owner, projectId, keyedDocument(roleKey, key));
    expect(blocked.result?.usersSkippedTombstoned).toBe(1);

    // ... a hint naming a live user is not.
    const matched = await runImport(
      owner,
      projectId,
      keyedDocument(roleKey, key, { grantUserId: returning.userId! })
    );
    expect(matched.result).toMatchObject({ usersSkippedTombstoned: 0, usersCreated: 0 });
    expect(await liveKeyedMembers(projectId, key)).toBe(1);
  });
});
